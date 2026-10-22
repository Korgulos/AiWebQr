import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer, loadEnv } from 'vite';
import pg from 'pg';
const env = loadEnv('development', process.cwd(), '');
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 10000 });
const server = await createServer({
	server: { middlewareMode: true, hmr: false, ws: false },
	cacheDir: '/tmp/qr-development-analytics-cache'
});
let userId;
try {
	const { db } = await server.ssrLoadModule('/src/lib/server/db.ts');
	db.query = async (sql, params) => (await pool.query(sql, params)).rows;
	db.getClient = () => pool.connect();
	const redirect = await server.ssrLoadModule('/src/routes/api/campaigns/redirect/+server.ts');
	const analytics = await server.ssrLoadModule('/src/routes/api/campaigns/analytics/+server.ts');
	const user = await pool.query(
		'INSERT INTO users(name,email,password) VALUES($1,$2,$3) RETURNING user_id',
		['Analytics test', `test-${randomUUID()}@example.invalid`, 'disabled-test-account']
	);
	userId = user.rows[0].user_id;
	const link = await pool.query(
		'INSERT INTO backlinks(user_id,destination_url,slug) VALUES($1,$2,$3) RETURNING backlink_id, slug',
		[userId, 'https://example.com/', randomUUID()]
	);
	const campaign = await pool.query(
		'INSERT INTO campaigns(user_id,title,backlink_id) VALUES($1,$2,$3) RETURNING campaign_id, public_id',
		[userId, 'Temporary integration test', link.rows[0].backlink_id]
	);
	const id = campaign.rows[0].campaign_id;
	const publicId = campaign.rows[0].public_id;
	const home = await server.ssrLoadModule('/src/routes/+page.server.ts');
	assert.deepEqual(
		await home.load({
			parent: async () => ({ user: null }),
			setHeaders: () => {},
			cookies: { get: () => 'Europe/Belgrade' }
		}),
		{ dashboard: null }
	);
	const homeEvent = (owner) => ({
		parent: async () => ({ user: {} }),
		locals: { user: { user_id: owner } },
		setHeaders: () => {},
		cookies: { get: () => 'Europe/Belgrade' }
	});
	const empty = await home.load(homeEvent(userId + 1));
	assert.equal(empty.dashboard.summary.campaigns, 0);
	assert.equal(empty.dashboard.campaigns.length, 0);

	const event = (method = 'GET', owner = userId) => ({
		url: new URL(
			`http://localhost/api/campaigns/redirect?id=${publicId}&token=${link.rows[0].slug}`
		),
		request: new Request(
			`http://localhost/api/campaigns/redirect?id=${publicId}&token=${link.rows[0].slug}`,
			{
				method,
				headers: { 'user-agent': 'Mozilla/5.0 iPhone Safari/605' }
			}
		),
		getClientAddress: () => '192.0.2.1',
		locals: { user: owner === null ? null : { user_id: owner } }
	});
	for (let i = 0; i < 2; i++) {
		const res = await redirect.GET(event());
		assert.equal(res.status, 302);
		assert.equal(res.headers.get('location'), 'https://example.com/');
		assert.equal(res.headers.get('cache-control'), 'no-store');
	}
	await redirect.GET(event('HEAD'));
	const rows = await pool.query('SELECT * FROM scan_events WHERE campaign_id=$1 ORDER BY id', [id]);
	assert.equal(rows.rowCount, 2);
	assert.equal(rows.rows[0].is_rapid_repeat, false);
	assert.equal(rows.rows[1].is_rapid_repeat, true);
	assert.equal(rows.rows[0].visitor_hash, rows.rows[1].visitor_hash);
	assert.equal((await analytics.GET(event('GET', null))).status, 401);
	assert.equal((await analytics.GET(event('GET', userId + 1))).status, 404);
	const result = await (await analytics.GET(event())).json();
	assert.equal(result.summary.total, 2);
	assert.equal(result.summary.daily_visitor_sum, 1);
	assert.equal(result.summary.rapid_repeats, 1);
	const dashboard = await home.load(homeEvent(userId));
	assert.equal(dashboard.dashboard.summary.campaigns, 1);
	assert.equal(dashboard.dashboard.summary.total, 2);
	assert.equal(dashboard.dashboard.campaigns[0].campaign_id, publicId);
	assert.equal(dashboard.dashboard.daily.length, 14);
	assert.equal(
		dashboard.dashboard.daily.reduce((sum, row) => sum + row.total, 0),
		2
	);
	console.log('PASS dashboard: anonymous, empty state, owner isolation, totals and 14-day series');
	const creation = await server.ssrLoadModule('/src/routes/api/campaigns/+server.ts');
	const view = await server.ssrLoadModule('/src/routes/view/[id]/+page.server.ts');
	const valuesByType = {
		url: { url: 'https://example.com' },
		text: { text: 'Hello' },
		email: { email: 'test@example.com' },
		phone: { phone: '+381601234567' },
		sms: { phone: '+381601234567', message: 'Hello' },
		wifi: { ssid: 'Test', password: 'example', encryption: 'WPA', hidden: 'false' },
		vcard: { firstName: 'Test' },
		location: { latitude: '44', longitude: '20' },
		pdf: { media_urls: 'https://example.com/menu.pdf' },
		mp3: { media_urls: 'https://example.com/audio.mp3' },
		gallery: { media_urls: 'https://example.com/a.jpg\nhttps://example.com/b.jpg' }
	};
	for (const [purpose, values] of Object.entries(valuesByType)) {
		const response = await creation.POST({
			locals: { user: { user_id: userId } },
			url: new URL('http://localhost/api/campaigns'),
			request: new Request('http://localhost/api/campaigns', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: 'Purpose test',
					...(purpose === 'text' ? {} : { description: 'Fixture' }),
					purpose,
					values
				})
			})
		});
		assert.equal(response.status, 200, `${purpose}: ${response.status}`);
		const body = await response.json();
		assert.equal(body.campaign.purpose, purpose);
		if (['pdf', 'mp3', 'gallery'].includes(purpose)) {
			const result = await view.load({
				params: { id: body.campaign.public_token },
				setHeaders: () => {},
				cookies: { get: () => 'Europe/Belgrade' }
			});
			assert.equal(result.campaign.purpose, purpose);
		} else if (purpose !== 'url') assert.ok(body.campaign.qr_payload);
	}
	console.log('PASS all 11 campaign purposes persisted; media landing pages load');
	const updateEvent = (owner, payload) => ({
		locals: { user: owner ? { user_id: owner } : null },
		url: new URL(`http://localhost/api/campaigns?id=${publicId}`),
		request: new Request(`http://localhost/api/campaigns?id=${publicId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		})
	});
	const patch = {
		title: 'Edited title',
		description: '',
		purpose: 'url',
		values: { url: 'https://example.com/updated' },
		status: 'active',
		is_active: true,
		expiration_date: null
	};
	assert.equal((await creation.PATCH(updateEvent(null, patch))).status, 401);
	assert.equal((await creation.PATCH(updateEvent(userId + 1, patch))).status, 404);
	const changed = await creation.PATCH(updateEvent(userId, patch));
	assert.equal(changed.status, 200, await changed.clone().text());
	const updated = await changed.json();
	assert.equal(updated.campaign.title, patch.title);
	assert.equal(updated.campaign.public_token, link.rows[0].slug);
	assert.equal(
		(await redirect.GET(event())).headers.get('location'),
		'https://example.com/updated'
	);
	const paused = await creation.PATCH(updateEvent(userId, { ...patch, status: 'paused' }));
	assert.equal(paused.status, 200);
	assert.equal((await redirect.GET(event())).status, 404);
	await creation.PATCH(updateEvent(userId, patch));
	console.log(
		'PASS owner-scoped edits, all content fields, stable public token, changed destination and paused status'
	);

	const original = db.getClient;
	db.getClient = async () => {
		throw new Error('simulated analytics outage');
	};
	assert.equal((await redirect.GET(event())).status, 302);
	db.getClient = original;
	await pool.query('UPDATE backlinks SET is_active=false WHERE backlink_id=$1', [
		link.rows[0].backlink_id
	]);
	assert.equal((await redirect.GET(event())).status, 404);
	console.log(
		'PASS real development DB: redirects, two persisted scans, rapid repeats, HEAD exclusion, owner isolation, outage fallback, inactive link'
	);
} finally {
	if (userId) await pool.query('DELETE FROM users WHERE user_id=$1', [userId]);
	await pool.end();
	await server.close();
	console.log('Temporary integration fixtures removed');
}
