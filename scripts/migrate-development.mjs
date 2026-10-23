import { loadEnv } from 'vite';
import { readFileSync, appendFileSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import pg from 'pg';
const env = loadEnv('development', process.cwd(), '');
const version = process.argv[2] || '001_backend_v2';
if (
	![
		'001_backend_v2',
		'002_account_settings',
		'003_campaign_purposes',
		'004_public_ids',
		'005_campaign_qr_gallery',
		'006_social_accounts'
	].includes(version)
)
	throw new Error('Unknown migration');
const sql = readFileSync(`migrations/${version}.sql`, 'utf8');
const checksum = createHash('sha256').update(sql).digest('hex');
const client = new pg.Client({
	connectionString: env.DATABASE_URL,
	connectionTimeoutMillis: 10000
});
try {
	await client.connect();
	await client.query('BEGIN');
	await client.query("SET LOCAL lock_timeout = '5s'");
	await client.query('SELECT pg_advisory_xact_lock(281047)');
	await client.query(
		'CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())'
	);
	const existing = await client.query('SELECT checksum FROM app_migrations WHERE name=$1', [
		version
	]);
	if (existing.rowCount) {
		if (existing.rows[0].checksum !== checksum) throw new Error('Migration checksum mismatch');
		console.log('Migration already applied');
	} else {
		const collisions = await client.query(
			'SELECT 1 FROM users GROUP BY lower(trim(email)) HAVING count(*) > 1 LIMIT 1'
		);
		if (collisions.rowCount) throw new Error('Normalized email collisions need resolution');
		await client.query(sql.replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, ''));
		await client.query('INSERT INTO app_migrations(name,checksum) VALUES($1,$2)', [
			version,
			checksum
		]);
		console.log(`Applied development migration ${version}`);
	}
	await client.query('COMMIT');
	if (!env.ANALYTICS_SECRET) {
		appendFileSync('.env', `\nANALYTICS_SECRET=${randomBytes(32).toString('hex')}\n`);
		console.log('Created local analytics secret (value hidden)');
	}
} catch (error) {
	await client.query('ROLLBACK').catch(() => {});
	console.error('Migration failed:', error.code || error.message);
	process.exitCode = 1;
} finally {
	await client.end();
}
