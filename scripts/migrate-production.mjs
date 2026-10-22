// Explicit production runner: credentials come only from the linked Vercel production export.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import pg from 'pg';
const env = parseEnv(readFileSync('.vercel/.env.production.local', 'utf8'));
const development = parseEnv(readFileSync('.env', 'utf8'));
if (!env.DATABASE_URL) throw new Error('Production DATABASE_URL missing');
if (new URL(env.DATABASE_URL).hostname === new URL(development.DATABASE_URL).hostname)
	throw new Error(
		'Production and development database hosts match; inspect target before migration'
	);
const versions = [
	'001_backend_v2',
	'002_account_settings',
	'003_campaign_purposes',
	'004_public_ids',
	'005_campaign_qr_gallery'
];
const client = new pg.Client({
	connectionString: env.DATABASE_URL,
	connectionTimeoutMillis: 15000
});
try {
	await client.connect();
	await client.query('BEGIN');
	await client.query("SET LOCAL lock_timeout = '5s'");
	await client.query('SELECT pg_advisory_xact_lock(281047)');
	const collisions = await client.query(
		'SELECT 1 FROM users GROUP BY lower(trim(email)) HAVING count(*) > 1 LIMIT 1'
	);
	if (collisions.rowCount) throw new Error('Normalized email collisions need resolution');
	await client.query(
		'CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())'
	);
	for (const version of versions) {
		const sql = readFileSync(`migrations/${version}.sql`, 'utf8');
		const checksum = createHash('sha256').update(sql).digest('hex');
		const existing = await client.query('SELECT checksum FROM app_migrations WHERE name=$1', [
			version
		]);
		if (existing.rowCount) {
			if (existing.rows[0].checksum !== checksum) throw new Error('Migration checksum mismatch');
			console.log(`${version}: already applied`);
		} else {
			// The production baseline already has backlink_clicks.campaign_id.
			// Preserve the applied migration source/checksum; tolerate this known baseline difference.
			const executable = sql
				.replace(/^BEGIN;$/m, '')
				.replace(/^COMMIT;$/m, '')
				.replace(
					'ALTER TABLE backlink_clicks ADD COLUMN campaign_id',
					'ALTER TABLE backlink_clicks ADD COLUMN IF NOT EXISTS campaign_id'
				);
			await client.query(executable);
			await client.query('INSERT INTO app_migrations(name,checksum) VALUES($1,$2)', [
				version,
				checksum
			]);
			console.log(`${version}: applied`);
		}
	}
	await client.query('COMMIT');
	console.log('Production migrations committed');
} catch (error) {
	await client.query('ROLLBACK').catch(() => {});
	console.error('Production migration rolled back:', error.code || error.message);
	process.exitCode = 1;
} finally {
	await client.end();
}
