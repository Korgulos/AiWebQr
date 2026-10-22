import assert from 'node:assert/strict';
import { createServer } from 'vite';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Exercise the real route handlers with an isolated database and session secret.
const testSecret = 'test-only-secret-with-at-least-32-characters';
const server = await createServer({
	cacheDir: '/tmp/qr-security-vite-cache',
	server: { middlewareMode: true, hmr: false, ws: false },
	plugins: [
		{
			name: 'isolated-test-environment',
			enforce: 'pre',
			resolveId(id) {
				if (id === '$env/dynamic/private') return '\0test-env';
			},
			load(id) {
				if (id === '\0test-env')
					return `export const env = { JWT_SECRET: ${JSON.stringify(testSecret)} };`;
			}
		}
	]
});
let checks = 0;
async function check(name, fn) {
	await fn();
	checks++;
	console.log(`PASS ${name}`);
}
const load = (path) => server.ssrLoadModule(`/src/${path}`);
const event = (path, { method = 'GET', body, user = null, headers = {} } = {}) => ({
	url: new URL(`https://qr.test${path}`),
	locals: { user },
	request: new Request(`https://qr.test${path}`, {
		method,
		headers: { 'Content-Type': 'application/json', ...headers },
		...(body === undefined ? {} : { body: JSON.stringify(body) })
	})
});
try {
	const { db, users } = await load('lib/server/db.ts');
	const fail = async () => {
		throw new Error('Unexpected database access in test');
	};
	db.query = fail;
	db.getClient = fail;
	users.findByEmail = fail;
	users.findById = fail;
	users.create = fail;
	const { createSession, readSession, sessionCookie } = await load('lib/server/session.ts');
	const { handle } = await load('lib/server/auth.ts');
	const data = await load('routes/api/data/+server.ts');
	const campaigns = await load('routes/api/campaigns/+server.ts');
	const comments = await load('routes/api/campaigns/comments/+server.ts');
	const redirects = await load('routes/api/campaigns/redirect/+server.ts');
	const logout = await load('routes/api/auth/logout/+server.ts');
	const login = await load('routes/api/auth/login/+server.ts');
	const register = await load('routes/api/auth/register/+server.ts');
	let cookie;
	await check(
		'campaign deletion requires confirmation, enforces ownership and deletes atomically',
		async () => {
			const id = '651928d8-0c0a-4255-9119-49723eb8d4f6';
			assert.equal(
				(
					await campaigns.DELETE(
						event('/api/campaigns', { method: 'DELETE', body: { id, confirmation: 'DELETE' } })
					)
				).status,
				401
			);
			assert.equal(
				(
					await campaigns.DELETE(
						event('/api/campaigns', { method: 'DELETE', user: { user_id: 7 }, body: { id } })
					)
				).status,
				400
			);
			let found = false;
			const calls = [];
			db.getClient = async () => ({
				async query(sql, params) {
					calls.push(sql);
					if (sql.startsWith('SELECT campaign_id')) {
						assert.deepEqual(params, [id, 7]);
						return { rows: found ? [{ campaign_id: 19, backlink_id: 23 }] : [] };
					}
					if (sql.startsWith('DELETE FROM campaigns')) assert.deepEqual(params, [19, 7]);
					if (sql.startsWith('DELETE FROM backlinks')) assert.deepEqual(params, [23, 7]);
					return { rows: [] };
				},
				release() {}
			});
			const request = () =>
				event('/api/campaigns', {
					method: 'DELETE',
					user: { user_id: 7 },
					body: { id, confirmation: 'DELETE' }
				});
			assert.equal((await campaigns.DELETE(request())).status, 404);
			assert.ok(calls.includes('ROLLBACK'));
			assert.ok(!calls.some((sql) => sql.startsWith('DELETE')));
			found = true;
			calls.length = 0;
			assert.equal((await campaigns.DELETE(request())).status, 200);
			assert.ok(calls.some((sql) => sql.startsWith('DELETE FROM campaigns')));
			assert.ok(calls.some((sql) => sql.startsWith('DELETE FROM backlinks')));
			assert.equal(calls.at(-1), 'COMMIT');
			db.getClient = fail;
		}
	);

	await check('session cookie is HttpOnly, SameSite and bounded', () => {
		createSession(7, {
			set(name, token, options) {
				cookie = { name, token, options };
			}
		});
		assert.equal(cookie.name, sessionCookie);
		assert.equal(cookie.options.httpOnly, true);
		assert.equal(cookie.options.sameSite, 'lax');
		assert.equal(cookie.options.path, '/');
		assert.equal(cookie.options.maxAge, 604800);
		assert.deepEqual(readSession(cookie.token), { user_id: 7 });
		assert.equal(jwt.verify(cookie.token, testSecret).user_id, 7);
		assert.equal(readSession(jwt.sign({ user_id: 7 }, testSecret, { expiresIn: -1 })), null);
		assert.equal(readSession(jwt.sign({ user_id: -1 }, testSecret)), null);
		assert.equal(readSession(cookie.token + 'x'), null);
		assert.equal(readSession(''), null);
	});
	await check('retired user-list endpoint never touches the database', async () => {
		const response = await data.GET(event('/api/data'));
		assert.equal(response.status, 404);
		assert.deepEqual(await response.json(), { error: 'Not found' });
	});
	await check('cross-origin writes are rejected before handlers run', async () => {
		const response = await handle({
			event: event('/api/auth/logout', {
				method: 'POST',
				headers: { Origin: 'https://evil.test' }
			}),
			resolve: fail
		});
		assert.equal(response.status, 403);
	});
	await check('legacy bearer tokens do not authenticate', async () => {
		const request = event('/api/campaigns', {
			headers: { Authorization: `Bearer ${cookie.token}` }
		});
		request.cookies = { get: () => undefined };
		const response = await handle({
			event: request,
			resolve: async (e) => {
				assert.equal(e.locals.user, null);
				return new Response('ok');
			}
		});
		assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
	});
	await check('anonymous campaigns are denied and retired comments return 404', async () => {
		for (const [handler, path, method] of [
			[campaigns.GET, '/api/campaigns', 'GET'],
			[campaigns.POST, '/api/campaigns', 'POST'],
			[comments.GET, '/api/campaigns/comments', 'GET'],
			[comments.POST, '/api/campaigns/comments', 'POST']
		]) {
			assert.equal(
				(await handler(event(path, { method }))).status,
				path.includes('/comments') ? 404 : 401
			);
		}
	});
	await check('campaign reads include the authenticated owner', async () => {
		let calls = [];
		db.query = async (sql, params) => {
			calls.push({ sql, params });
			return [];
		};
		await campaigns.GET(event('/api/campaigns', { user: { user_id: 7 } }));
		await campaigns.GET(
			event('/api/campaigns?id=11111111-1111-4111-8111-111111111111', { user: { user_id: 7 } })
		);
		assert.match(calls[0].sql, /WHERE c.user_id = \$1/);
		assert.deepEqual(calls[0].params, [7]);
		assert.match(calls[1].sql, /c.user_id = \$2/);
		assert.deepEqual(calls[1].params, ['11111111-1111-4111-8111-111111111111', 7]);
	});
	await check('retired comments endpoint rejects reads and writes', async () => {
		db.query = async (sql, params) => {
			assert.match(sql, /user_id = \$2/);
			assert.deepEqual(params, [22, 7]);
			return [];
		};
		assert.equal(
			(
				await comments.GET(
					event('/api/campaigns/comments?campaign_id=22', { user: { user_id: 7 } })
				)
			).status,
			404
		);
		assert.equal(
			(
				await comments.POST(
					event('/api/campaigns/comments', {
						method: 'POST',
						user: { user_id: 7 },
						body: { campaign_id: 22, content: 'hello' }
					})
				)
			).status,
			404
		);
	});
	await check('invalid IDs, unsafe destinations and redirect loops are rejected', async () => {
		db.query = fail;
		assert.equal(
			(await campaigns.GET(event('/api/campaigns?id=NaN', { user: { user_id: 7 } }))).status,
			400
		);
		for (const destination_url of [
			'javascript:alert(1)',
			'https://qr.test/api/campaigns/redirect?id=22',
			'https://user:pass@example.com'
		]) {
			const response = await campaigns.POST(
				event('/api/campaigns', {
					method: 'POST',
					user: { user_id: 7 },
					body: { title: 'Test', description: 'Test', destination_url }
				})
			);
			assert.equal(response.status, 400);
		}
		db.query = async () => [
			{ campaign_id: 22, backlink_id: 1, destination_url: 'javascript:alert(1)' }
		];
		assert.equal(
			(await redirects.GET(event('/api/campaigns/redirect?token=test-token-123456'))).status,
			410
		);
	});
	await check('logout acts on the session owner, never an arbitrary body ID', async () => {
		let changedUser;
		let deleted;
		users.updateLogoutTime = async (id) => {
			changedUser = id;
		};
		const request = event('/api/auth/logout', {
			method: 'POST',
			user: { user_id: 7 },
			body: { userId: 99 }
		});
		request.cookies = {
			delete: (name) => {
				deleted = name;
			}
		};
		assert.equal((await logout.POST(request)).status, 200);
		assert.equal(changedUser, 7);
		assert.equal(deleted, sessionCookie);
	});
	await check('invalid authentication payloads never reach the database', async () => {
		for (const [handler, path, body] of [
			[login.POST, 'login', { email: 123, password: 'test' }],
			[register.POST, 'register', { name: {}, email: 'a@b.com', password: 'Test1234' }]
		]) {
			assert.equal(
				(await handler(event(`/api/auth/${path}`, { method: 'POST', body }))).status,
				400
			);
		}
	});
	await check(
		'login and registration create cookies without exposing passwords or tokens',
		async () => {
			const password = 'TestPassword123';
			const profile = {
				user_id: 7,
				name: 'Test User',
				email: 'test@example.com',
				password: await bcrypt.hash(password, 4),
				subscription: false
			};
			users.findByEmail = async () => profile;
			users.updateLoginTime = async () => {};
			let issued;
			const cookies = {
				set(name, token, options) {
					issued = { name, token, options };
				}
			};
			const loginEvent = event('/api/auth/login', {
				method: 'POST',
				body: { email: profile.email, password }
			});
			loginEvent.cookies = cookies;
			const loginResponse = await login.POST(loginEvent);
			assert.equal(loginResponse.status, 200);
			const loginData = await loginResponse.json();
			assert.equal(loginData.user_id, undefined);
			assert.equal(loginData.password, undefined);
			assert.equal(loginData.token, undefined);
			assert.deepEqual(readSession(issued.token), { user_id: 7 });
			users.findByEmail = async () => null;
			users.create = async (input) => {
				assert.notEqual(input.password, password);
				return { ...profile, ...input };
			};
			const registerEvent = event('/api/auth/register', {
				method: 'POST',
				body: { name: profile.name, email: profile.email, password }
			});
			registerEvent.cookies = cookies;
			const registerResponse = await register.POST(registerEvent);
			assert.equal(registerResponse.status, 201);
			const registerData = await registerResponse.json();
			assert.equal(registerData.password, undefined);
			assert.equal(registerData.token, undefined);
			assert.deepEqual(readSession(issued.token), { user_id: 7 });
		}
	);
	await check(
		'valid campaign redirects preserve the destination when analytics is unconfigured',
		async () => {
			let calls = 0;
			db.query = async (sql) => {
				calls++;
				if (calls === 1)
					return [{ campaign_id: 22, backlink_id: 1, destination_url: 'https://example.com/menu' }];
				assert.match(sql, /INSERT INTO backlink_clicks/);
				return [];
			};
			const response = await redirects.GET(
				event('/api/campaigns/redirect?token=test-token-123456')
			);
			assert.equal(response.status, 302);
			assert.equal(response.headers.get('location'), 'https://example.com/menu');
			assert.equal(calls, 1);
		}
	);
	const account = await load('routes/api/account/+server.ts');
	await check(
		'profile edits require authentication and update only the session owner',
		async () => {
			db.query = fail;
			assert.equal(
				(await account.PATCH(event('/api/account', { method: 'PATCH', body: { name: 'Example' } })))
					.status,
				401
			);
			assert.equal(
				(
					await account.PATCH(
						event('/api/account', { method: 'PATCH', user: { user_id: 7 }, body: { name: 'x' } })
					)
				).status,
				400
			);
			db.query = async (sql, params) => {
				assert.match(sql, /WHERE user_id=\$2/);
				assert.deepEqual(params, ['Example', 7]);
				return [{ user_id: 7 }];
			};
			assert.equal(
				(
					await account.PATCH(
						event('/api/account', {
							method: 'PATCH',
							user: { user_id: 7 },
							body: { name: ' Example ', user_id: 99 }
						})
					)
				).status,
				200
			);
		}
	);

	await check('public redirects reject numeric IDs before any database access', async () => {
		db.query = fail;
		assert.equal((await redirects.GET(event('/api/campaigns/redirect?id=30'))).status, 404);
		assert.equal((await redirects.GET(event('/api/campaigns/redirect?token=30'))).status, 404);
	});

	const fields = await load('routes/api/campaigns/field/+server.ts');
	await check('individual campaign field edits validate fields and enforce ownership', async () => {
		db.query = fail;
		assert.equal(
			(
				await fields.PATCH(
					event('/api/campaigns/field', {
						method: 'PATCH',
						body: { id: '11111111-1111-4111-8111-111111111111', field: 'title', value: 'Updated' }
					})
				)
			).status,
			401
		);
		assert.equal(
			(
				await fields.PATCH(
					event('/api/campaigns/field', {
						method: 'PATCH',
						user: { user_id: 7 },
						body: { id: '11111111-1111-4111-8111-111111111111', field: 'user_id', value: 8 }
					})
				)
			).status,
			400
		);
		db.query = async (sql, params) => {
			assert.match(sql, /user_id=\$3/);
			assert.deepEqual(params, ['Updated', '11111111-1111-4111-8111-111111111111', 7]);
			return [{ campaign_id: 22 }];
		};
		assert.equal(
			(
				await fields.PATCH(
					event('/api/campaigns/field', {
						method: 'PATCH',
						user: { user_id: 7 },
						body: { id: '11111111-1111-4111-8111-111111111111', field: 'title', value: 'Updated' }
					})
				)
			).status,
			200
		);
	});
	const { parseGifLink, fetchGifBlob } = await load('lib/gif-sources.ts');
	await check('GIF links require HTTPS and distinguish GIPHY pages from collections', () => {
		assert.throws(() => parseGifLink('http://example.com/a.gif'));
		assert.throws(() => parseGifLink('https://user:pass@example.com/a.gif'));
		assert.throws(() => parseGifLink('https://giphy.com/explore/free'), /collection/);
		assert.equal(parseGifLink('https://giphy.com/gifs/cat-abc123').giphyId, 'abc123');
		assert.equal(
			parseGifLink('https://media.giphy.com/media/abc123/giphy.gif?x=1').url.search,
			'?x=1'
		);
	});
	await check('GIF importer preserves bytes and never sends cookies', async () => {
		const bytes = new TextEncoder().encode('GIF89a' + 'test');
		const blob = await fetchGifBlob(
			'https://example.com/a.gif',
			new AbortController().signal,
			async (url, options) => {
				assert.equal(options.credentials, 'omit');
				assert.equal(options.cache, 'no-store');
				return new Response(bytes);
			}
		);
		assert.equal(blob.type, 'image/gif');
		assert.equal(await blob.text(), 'GIF89atest');
	});
	await check('GIF importer rejects webpage responses and oversized downloads', async () => {
		const signal = new AbortController().signal;
		await assert.rejects(
			fetchGifBlob(
				'https://example.com/',
				signal,
				async () => new Response('<html>Not a GIF</html>')
			),
			/webpage/
		);
		await assert.rejects(
			fetchGifBlob(
				'https://example.com/big.gif',
				signal,
				async () => new Response('GIF89a', { headers: { 'content-length': '6000000' } })
			),
			/5 MB/
		);
		let cancelled = false;
		await assert.rejects(
			fetchGifBlob(
				'https://example.com/stream.gif',
				signal,
				async () =>
					new Response(
						new ReadableStream({
							pull(controller) {
								controller.enqueue(new Uint8Array(1024 * 1024));
							},
							cancel() {
								cancelled = true;
							}
						})
					)
			),
			/5 MB/
		);
		assert.equal(cancelled, true);
	});

	const qrPage = await load('routes/qr-gen/+page.server.ts');
	await check('QR generator redirects anonymous visitors home and accepts signed-in users', () => {
		assert.throws(
			() => qrPage.load({ locals: { user: null } }),
			(error) => error.status === 303 && error.location === '/'
		);
		assert.deepEqual(qrPage.load({ locals: { user: { user_id: 7 } } }), {});
	});

	console.log(`${checks} security regression checks passed (no external database accessed).`);
} finally {
	await server.close();
}
