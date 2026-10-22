import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer, loadEnv } from 'vite';
import bcrypt from 'bcrypt';
import pg from 'pg';
const env = loadEnv('development', process.cwd(), '');
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 10000 });
const server = await createServer({
	server: { middlewareMode: true, hmr: false, ws: false },
	cacheDir: '/tmp/qr-account-test-cache'
});
const ids = [];
try {
	const { db, users } = await server.ssrLoadModule('/src/lib/server/db.ts');
	db.query = async (sql, params) => (await pool.query(sql, params)).rows;
	db.getClient = () => pool.connect();
	users.findById = async (id) =>
		(await pool.query('SELECT * FROM users WHERE user_id=$1', [id])).rows[0] || null;
	const account = await server.ssrLoadModule('/src/routes/api/account/+server.ts');
	const password = await server.ssrLoadModule('/src/routes/api/account/password/+server.ts');
	const { createSession, readSession, sessionCookie } = await server.ssrLoadModule(
		'/src/lib/server/session.ts'
	);
	const { handle } = await server.ssrLoadModule('/src/lib/server/auth.ts');
	const current = 'TestAccountPass123!',
		next = 'NewAccountPass456!';
	const hash = await bcrypt.hash(current, 10);
	for (let i = 0; i < 2; i++) {
		const r = await pool.query(
			'INSERT INTO users(name,email,password) VALUES($1,$2,$3) RETURNING user_id',
			['Test account', `account-${randomUUID()}@example.invalid`, hash]
		);
		ids.push(r.rows[0].user_id);
	}
	let token;
	const deleted = [];
	const cookies = {
		set: (name, value) => {
			if (name === sessionCookie) token = value;
		},
		delete: (name) => deleted.push(name),
		get: () => token
	};
	createSession(ids[0], cookies);
	const oldToken = token;
	const event = (body, user = ids[0], method = 'PATCH') => ({
		locals: { user: user ? { user_id: user } : null },
		cookies,
		request: new Request('http://localhost/api/account', {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	});
	const profile = {
		first_name: 'Test',
		last_name: 'Person',
		username: `test_${ids[0]}`,
		avatar_data: null
	};
	assert.equal((await account.PATCH(event(profile, null))).status, 401);
	assert.equal((await account.PATCH(event({ ...profile, username: 'bad name' }))).status, 400);
	assert.equal(
		(await account.PATCH(event({ ...profile, avatar_data: 'data:image/svg+xml,<svg/>' }))).status,
		400
	);
	assert.equal((await account.PATCH(event(profile))).status, 200);
	assert.equal((await account.PATCH(event(profile, ids[1]))).status, 409);
	const saved = await users.findById(ids[0]);
	assert.equal(saved.first_name, 'Test');
	assert.equal(saved.last_name, 'Person');
	assert.equal(saved.username, profile.username);
 const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG2kAAAAASUVORK5CYII=';
 assert.equal((await account.PATCH(event({...profile,avatar_data:png}))).status,200);
 assert.equal((await users.findById(ids[0])).avatar_data,png);

	assert.equal(
		(await password.POST(event({ current_password: 'Wrong', new_password: next }, ids[0], 'POST')))
			.status,
		403
	);
	assert.equal(
		(await password.POST(event({ current_password: current, new_password: next }, ids[0], 'POST')))
			.status,
		200
	);
	const updated = await users.findById(ids[0]);
	assert.equal(updated.session_version, 1);
	assert.ok(await bcrypt.compare(next, updated.password));
	assert.ok(!(await bcrypt.compare(current, updated.password)));
	token = oldToken;
	const authEvent = {
		request: new Request('http://localhost/'),
		url: new URL('http://localhost/'),
		cookies,
		locals: { user: null }
	};
	await handle({
		event: authEvent,
		resolve: async (e) => {
			assert.equal(e.locals.user, null);
			return new Response('ok');
		}
	});
	createSession(ids[0], cookies, updated.session_version);
	assert.equal(readSession(token).session_version, 1);
	assert.equal(
		(await account.DELETE(event({ password: next, confirmation: 'no' }, ids[0], 'DELETE'))).status,
		400
	);
	assert.equal(
		(await account.DELETE(event({ password: 'Wrong', confirmation: 'DELETE' }, ids[0], 'DELETE')))
			.status,
		403
	);
	const link = await pool.query(
		'INSERT INTO backlinks(user_id,destination_url,slug) VALUES($1,$2,$3) RETURNING backlink_id',
		[ids[0], 'https://example.com', randomUUID()]
	);
	await pool.query('INSERT INTO campaigns(user_id,title,backlink_id) VALUES($1,$2,$3)', [
		ids[0],
		'Delete test',
		link.rows[0].backlink_id
	]);
	assert.equal(
		(await account.DELETE(event({ password: next, confirmation: 'DELETE' }, ids[0], 'DELETE')))
			.status,
		200
	);
	assert.equal(await users.findById(ids[0]), null);
	assert.ok(await users.findById(ids[1]));
	assert.equal(
		(await pool.query('SELECT 1 FROM backlinks WHERE user_id=$1', [ids[0]])).rowCount,
		0
	);
	assert.equal(
		(await pool.query('SELECT 1 FROM campaigns WHERE user_id=$1', [ids[0]])).rowCount,
		0
	);
	console.log(
		'PASS real development DB: profile validation/uniqueness, password hashing and verification, old-session revocation, deletion confirmation/password, cascade and account isolation'
	);
} finally {
	for (const id of ids) await pool.query('DELETE FROM users WHERE user_id=$1', [id]);
	await pool.end();
	await server.close();
	console.log('Temporary account fixtures removed');
}
