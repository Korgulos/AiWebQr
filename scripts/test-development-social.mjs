import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createServer, loadEnv } from 'vite';
import pg from 'pg';

const env = loadEnv('development', process.cwd(), '');
const production = parseEnv(readFileSync('.vercel/.env.production.local', 'utf8'));
if (
	!env.DATABASE_URL ||
	!production.DATABASE_URL ||
	new URL(env.DATABASE_URL).hostname === new URL(production.DATABASE_URL).hostname
) {
	throw new Error('A distinct, verified development database is required');
}
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 10000 });
const server = await createServer({
	cacheDir: '/tmp/qr-social-db-test',
	server: { middlewareMode: true, hmr: false, ws: false }
});
const marker = randomUUID();
const googleEmail = `social-g-${marker.slice(0, 20)}@example.test`;
const microsoftEmail = `social-m-${marker.slice(0, 20)}@example.test`;
const emails = [googleEmail, microsoftEmail];
try {
	const { db } = await server.ssrLoadModule('/src/lib/server/db.ts');
	db.getClient = () => pool.connect();
	const { resolveSocialAccount } = await server.ssrLoadModule('/src/lib/server/social-accounts.ts');
	const identity = {
		provider: 'google',
		subject: marker,
		name: 'Temporary OAuth fixture',
		email: googleEmail,
		emailVerified: true
	};
	const created = await resolveSocialAccount(identity);
	assert.equal((await resolveSocialAccount(identity)).user_id, created.user_id);
	const verified = await pool.query('SELECT email_verified_at FROM users WHERE user_id=$1', [
		created.user_id
	]);
	assert.ok(verified.rows[0].email_verified_at);
	console.log('PASS real development Google identity creates one user and signs back into it');
	await assert.rejects(
		() => resolveSocialAccount({ ...identity, subject: `${marker}-collision` }),
		/account_exists/
	);
	console.log('PASS real email uniqueness blocks implicit linking');
	await resolveSocialAccount(
		{
			provider: 'microsoft',
			subject: `${marker}-linked`,
			name: 'Linked fixture',
			email: null,
			emailVerified: false
		},
		created.user_id
	);
	assert.equal(
		(
			await resolveSocialAccount({
				provider: 'microsoft',
				subject: `${marker}-linked`,
				name: 'Linked fixture',
				email: null,
				emailVerified: false
			})
		).user_id,
		created.user_id
	);
	console.log(
		'PASS explicit Microsoft linking preserves the existing owner ID without requiring an email'
	);
	const second = await resolveSocialAccount({
		provider: 'microsoft',
		subject: `${marker}-new`,
		name: 'Temporary OAuth fixture',
		email: microsoftEmail,
		emailVerified: false
	});
	await assert.rejects(() => resolveSocialAccount(identity, second.user_id), /already_linked/);
	const unverified = await pool.query('SELECT email_verified_at FROM users WHERE user_id=$1', [
		second.user_id
	]);
	assert.equal(unverified.rows[0].email_verified_at, null);
	console.log(
		'PASS Microsoft profile email remains unverified and linked identities cannot change owners'
	);
} catch (error) {
	console.error('Development social test failed:', error.code || error.name);
	process.exitCode = 1;
} finally {
	// Delete only this run's randomly named fixture users; FK cascades remove their identities.
	await pool.query('DELETE FROM users WHERE email=ANY($1::text[]) AND name=$2', [
		emails,
		'Temporary OAuth fixture'
	]);
	await pool.end();
	await server.close();
}
