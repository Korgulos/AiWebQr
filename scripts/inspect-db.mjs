import { loadEnv } from 'vite';
import pg from 'pg';

// Read-only inventory; never print credentials, connection URLs or user records.
const env = loadEnv('development', process.cwd(), '');
if (!env.DATABASE_URL) throw new Error('Local DATABASE_URL is missing');
const client = new pg.Client({
	connectionString: env.DATABASE_URL,
	connectionTimeoutMillis: 10000
});
try {
	await client.connect();
	await client.query('BEGIN READ ONLY');
	await client.query("SET LOCAL statement_timeout = '10s'");
	const columns = await client.query(`SELECT table_name, column_name, data_type, is_nullable
	 FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`);
	const constraints = await client.query(`SELECT tab.relname AS table_name, con.conname AS name,
	 pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con
	 JOIN pg_class tab ON tab.oid = con.conrelid JOIN pg_namespace ns ON ns.oid = tab.relnamespace
	 WHERE ns.nspname = 'public' ORDER BY tab.relname, con.conname`);
	const indexes = await client.query(
		"SELECT tablename, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname"
	);
	console.log(
		JSON.stringify(
			{ columns: columns.rows, constraints: constraints.rows, indexes: indexes.rows },
			null,
			2
		)
	);
	await client.query('ROLLBACK');
} catch (error) {
	console.error('Database inspection failed:', error.code || error.name);
	process.exitCode = 1;
} finally {
	await client.end();
}
