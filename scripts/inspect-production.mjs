import { readFileSync, chmodSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';
const path = '.vercel/.env.production.local';
chmodSync(path, 0o600);
const env = parseEnv(readFileSync(path, 'utf8'));
console.log(
	'Production configuration:',
	[
		'DATABASE_URL',
		'JWT_SECRET',
		'ANALYTICS_SECRET',
		'PUBLIC_GIPHY_API_KEY',
		'BLOB_READ_WRITE_TOKEN'
	]
		.map((key) => `${key}: ${env[key] ? 'set' : 'MISSING'}`)
		.join(', ')
);
const dev = parseEnv(readFileSync('.env', 'utf8'));
if (!env.DATABASE_URL.startsWith('postgres')) {
	console.error(
		'DATABASE_URL is still a placeholder. Save the production connection string in .vercel/.env.production.local.'
	);
	process.exit(1);
}
console.log(
	'Database distinct from development:',
	new URL(env.DATABASE_URL).hostname !== new URL(dev.DATABASE_URL).hostname
);
const client = new pg.Client({
	connectionString: env.DATABASE_URL,
	connectionTimeoutMillis: 15000
});
try {
	await client.connect();
	const rows = await client.query(
		"SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position"
	);
	console.log(JSON.stringify(rows.rows));
} catch (error) {
	console.error('Inspection failed:', error.code || error.message);
	process.exitCode = 1;
} finally {
	await client.end();
}
