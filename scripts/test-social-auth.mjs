import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

const testEnv = {
	JWT_SECRET: 'isolated-social-auth-secret-never-used-in-production',
	GOOGLE_CLIENT_ID: 'test-google-client',
	GOOGLE_CLIENT_SECRET: 'test-google-secret',
	MICROSOFT_CLIENT_ID: 'test-microsoft-client',
	MICROSOFT_CLIENT_SECRET: 'test-microsoft-secret'
};
const server = await createServer({
	cacheDir: '/tmp/qr-social-auth-test',
	server: { middlewareMode: true, hmr: false, ws: false },
	plugins: [
		{
			name: 'isolated-social-env',
			enforce: 'pre',
			resolveId(id) {
				if (id === '$env/dynamic/private') return '\0social-test-env';
			},
			load(id) {
				if (id === '\0social-test-env') return `export const env = ${JSON.stringify(testEnv)}`;
			}
		}
	]
});
const originalFetch = globalThis.fetch;
let checks = 0;
const check = async (name, fn) => {
	await fn();
	checks++;
	console.log(`PASS ${name}`);
};
const origin = 'https://qr.test';
function cookieJar() {
	const values = new Map();
	return {
		values,
		options: null,
		set(name, value, options) {
			values.set(name, value);
			this.options = options;
		},
		get(name) {
			return values.get(name);
		},
		delete(name) {
			values.delete(name);
		}
	};
}
const redirected = async (operation, expected) => {
	await assert.rejects(operation, (err) => err.status === 303 && err.location === expected);
};
try {
	const auth = await server.ssrLoadModule('/src/lib/server/social-auth.ts');
	const { db } = await server.ssrLoadModule('/src/lib/server/db.ts');
	const accounts = await server.ssrLoadModule('/src/lib/server/social-accounts.ts');
	const callback = await server.ssrLoadModule(
		'/src/routes/api/auth/[provider]/callback/+server.ts'
	);
	let databaseCalls = 0;
	db.getClient = async () => {
		databaseCalls++;
		throw new Error('Unexpected database access');
	};
	await check('configured providers and safe local return paths', () => {
		assert.deepEqual(auth.socialProviders(), ['google', 'microsoft']);
		for (const path of [
			'https://evil.test',
			'//evil.test',
			'/\\evil.test',
			'/\t/evil.test',
			'/\n/evil.test'
		])
			assert.equal(auth.safeReturnTo(path), '/');
		assert.equal(auth.safeReturnTo('/campaign?tab=recent'), '/campaign?tab=recent');
	});
	await check('both providers use PKCE, nonce and bounded HttpOnly cookies', () => {
		for (const provider of ['google', 'microsoft']) {
			const jar = cookieJar();
			const url = new URL(auth.beginSocialAuth(provider, origin, jar, '/settings'));
			assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
			assert.ok(url.searchParams.get('nonce'));
			assert.equal(url.searchParams.get('redirect_uri'), `${origin}/api/auth/${provider}/callback`);
			assert.equal(jar.options.httpOnly, true);
			assert.equal(jar.options.sameSite, 'lax');
			assert.equal(jar.options.maxAge, 600);
			assert.equal(jar.options.path, `/api/auth/${provider}`);
			assert.equal(auth.consumeSocialFlow(provider, jar, 'incorrect', origin), null);
			assert.equal(jar.values.size, 0);
		}
	});
	await check(
		'invalid state, wrong origin and forged cookies fail before account access',
		async () => {
			const jar = cookieJar();
			const url = new URL(auth.beginSocialAuth('google', origin, jar, '/'));
			assert.equal(
				auth.consumeSocialFlow('google', jar, url.searchParams.get('state'), 'https://other.test'),
				null
			);
			jar.values.set('qr_oauth_google', 'forged');
			await redirected(
				() =>
					callback.GET({
						params: { provider: 'google' },
						url: new URL(`${origin}/api/auth/google/callback?state=wrong&code=test`),
						cookies: jar,
						locals: { user: null }
					}),
				'/login?authError=expired'
			);
			assert.equal(databaseCalls, 0);
		}
	);
	await check('provider cancellation consumes the transaction', async () => {
		const jar = cookieJar();
		const url = new URL(auth.beginSocialAuth('google', origin, jar, '/'));
		await redirected(
			() =>
				callback.GET({
					params: { provider: 'google' },
					url: new URL(
						`${origin}/api/auth/google/callback?state=${url.searchParams.get('state')}&error=access_denied`
					),
					cookies: jar,
					locals: { user: null }
				}),
			'/login?authError=cancelled'
		);
		assert.equal(jar.values.size, 0);
		assert.equal(databaseCalls, 0);
	});
	await check('linking requires the same authenticated session and version', async () => {
		for (const user of [null, { user_id: 8 }, { user_id: 7, session_version: 3 }]) {
			const jar = cookieJar();
			const url = new URL(
				auth.beginSocialAuth('google', origin, jar, '/', { user_id: 7, session_version: 2 })
			);
			await redirected(
				() =>
					callback.GET({
						params: { provider: 'google' },
						url: new URL(
							`${origin}/api/auth/google/callback?state=${url.searchParams.get('state')}&code=test`
						),
						cookies: jar,
						locals: { user }
					}),
				'/login?authError=expired&returnTo=%2Fsettings'
			);
		}
		assert.equal(databaseCalls, 0);
	});
	const { privateKey, publicKey } = await generateKeyPair('RS256');
	const jwk = { ...(await exportJWK(publicKey)), kid: 'isolated-key', alg: 'RS256', use: 'sig' };
	const tenant = '9188040d-6c67-4c5b-b112-36a304b66dad';
	const flow = { origin, verifier: 'test-verifier', nonce: 'test-nonce' };
	let idToken;
	globalThis.fetch = async (input, options) => {
		const url = String(input);
		if (url.endsWith('/keys')) return Response.json({ keys: [jwk] });
		assert.ok(url.endsWith('/token'), 'Only Microsoft token and JWKS endpoints are allowed');
		assert.equal(options.body.get('code_verifier'), flow.verifier);
		return Response.json({ id_token: idToken });
	};
	async function sign(overrides = {}, key = privateKey) {
		return new SignJWT({
			tid: tenant,
			nonce: flow.nonce,
			name: 'Test User',
			email: 'test@example.com',
			...overrides
		})
			.setProtectedHeader({ alg: 'RS256', kid: 'isolated-key' })
			.setSubject('test-subject')
			.setAudience(overrides.aud || 'test-microsoft-client')
			.setIssuer(overrides.iss || `https://login.microsoftonline.com/${tenant}/v2.0`)
			.setIssuedAt()
			.setExpirationTime(overrides.exp || '5m')
			.sign(key);
	}
	await check(
		'Microsoft signed tokens validate identity without treating email as verified',
		async () => {
			idToken = await sign();
			const identity = await auth.fetchSocialIdentity('microsoft', 'test-code', flow);
			assert.equal(identity.subject, `${tenant}:test-subject`);
			assert.equal(identity.emailVerified, false);
		}
	);
	await check('Microsoft rejects wrong nonce and forged signatures', async () => {
		idToken = await sign({ nonce: 'wrong' });
		await assert.rejects(() => auth.fetchSocialIdentity('microsoft', 'test-code', flow));
		const attacker = await generateKeyPair('RS256');
		idToken = await sign({}, attacker.privateKey);
		await assert.rejects(() => auth.fetchSocialIdentity('microsoft', 'test-code', flow));
	});
	await check('Microsoft rejects wrong audience, issuer and expired tokens', async () => {
		for (const claims of [
			{ aud: 'another-app' },
			{ iss: 'https://evil.test' },
			{ exp: Math.floor(Date.now() / 1000) - 60 }
		]) {
			idToken = await sign(claims);
			await assert.rejects(() => auth.fetchSocialIdentity('microsoft', 'test-code', flow));
		}
	});
	const identity = {
		provider: 'google',
		subject: 'subject-1',
		name: 'Test',
		email: 'existing@example.com',
		emailVerified: true
	};
	let linked = [],
		existingEmail = true,
		mutations = [],
		statements = [];
	db.getClient = async () => ({
		release() {},
		async query(sql, params) {
			statements.push(sql);
			if (sql.startsWith('SELECT u.*')) return { rows: linked };
			if (sql.startsWith('SELECT 1 FROM users'))
				return { rows: existingEmail ? [{}] : [], rowCount: existingEmail ? 1 : 0 };
			if (sql.startsWith('SELECT * FROM users')) return { rows: [{ user_id: 7 }] };
			if (sql.startsWith('SELECT 1 FROM social_accounts')) return { rows: [], rowCount: 0 };
			if (sql.startsWith('INSERT INTO users')) {
				mutations.push({ sql, params });
				return { rows: [{ user_id: 9 }] };
			}
			if (sql.startsWith('INSERT') || sql.startsWith('UPDATE')) mutations.push({ sql, params });
			return { rows: [] };
		}
	});
	await check('matching email does not link or create a user', async () => {
		await assert.rejects(() => accounts.resolveSocialAccount(identity), /account_exists/);
		assert.equal(mutations.length, 0);
		assert.equal(statements.at(-1), 'ROLLBACK');
	});
	await check('explicit linking attaches only the authenticated user', async () => {
		assert.equal((await accounts.resolveSocialAccount(identity, 7)).user_id, 7);
		assert.deepEqual(mutations.find((item) => item.sql.startsWith('INSERT')).params, [
			'google',
			'subject-1',
			7
		]);
		assert.equal(statements.at(-1), 'COMMIT');
	});
	await check('an already-linked identity cannot move to another user', async () => {
		linked = [{ user_id: 9 }];
		mutations = [];
		await assert.rejects(() => accounts.resolveSocialAccount(identity, 7), /already_linked/);
		assert.equal(mutations.length, 0);
		assert.equal((await accounts.resolveSocialAccount(identity)).user_id, 9);
	});
	await check('new identities create one user with an unusable random password hash', async () => {
		linked = [];
		existingEmail = false;
		mutations = [];
		assert.equal((await accounts.resolveSocialAccount(identity)).user_id, 9);
		const created = mutations.find((item) => item.sql.startsWith('INSERT INTO users'));
		assert.match(created.params[2], /^\$2[ab]\$/);
		assert.deepEqual(
			mutations.find((item) => item.sql.startsWith('INSERT INTO social_accounts')).params,
			['google', 'subject-1', 9]
		);
	});
	console.log(`${checks} social authentication checks passed (isolated DB and provider fixtures).`);
} finally {
	globalThis.fetch = originalFetch;
	await server.close();
}
