import assert from 'node:assert/strict';
import { createServer, loadEnv } from 'vite';
import { randomUUID } from 'node:crypto';
import { del } from '@vercel/blob';
import pg from 'pg';
const env = loadEnv('development', process.cwd(), '');
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 10000 });
const server = await createServer({
	server: { middlewareMode: true, hmr: false, ws: false },
	cacheDir: '/tmp/qr-upload-test-cache'
});
let userId;
const uploaded = [];
try {
	const { db } = await server.ssrLoadModule('/src/lib/server/db.ts');
	db.query = async (sql, params) => (await pool.query(sql, params)).rows;
	db.getClient = () => pool.connect();
	const media = await server.ssrLoadModule('/src/routes/api/campaigns/media/+server.ts');
	const campaign = await server.ssrLoadModule('/src/routes/api/campaigns/+server.ts');
	userId = (
		await pool.query('INSERT INTO users(name,email,password) VALUES($1,$2,$3) RETURNING user_id', [
			'Upload test',
			`upload-${randomUUID()}@example.invalid`,
			'disabled-login'
		])
	).rows[0].user_id;
	const png = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG2kAAAAASUVORK5CYII=',
		'base64'
	);
	const form = () => {
		const data = new FormData();
		data.set('purpose', 'gallery');
		data.set('file', new File([png], 'test.png', { type: 'image/png' }));
		return data;
	};
	const event = (method, body, owner = userId) => ({
		locals: { user: owner ? { user_id: owner } : null },
		request: new Request('http://localhost/api/campaigns/media', { method, body })
	});
	assert.equal((await media.POST(event('POST', form(), null))).status, 401);
	const bad = new FormData();
	bad.set('purpose', 'gallery');
	bad.set('file', new File(['not an image'], 'bad.png', { type: 'image/png' }));
	assert.equal((await media.POST(event('POST', bad))).status, 400);
	const response = await media.POST(event('POST', form()));
	assert.equal(response.status, 201, await response.clone().text());
	const { asset } = await response.json();
	uploaded.push(asset.url);
	const download = await fetch(asset.url);
	assert.equal(download.status, 200);
	assert.deepEqual(Buffer.from(await download.arrayBuffer()), png);
	const remove = (owner) => media.DELETE(event('DELETE', JSON.stringify({ id: asset.id }), owner));
	assert.equal((await remove(userId + 1)).status, 404);
	const body = {
		title: 'Upload fixture',
		description: 'Temporary gallery',
		purpose: 'gallery',
		values: { media_urls: asset.url },
		asset_ids: [asset.id]
	};
	const created = await campaign.POST({
		...event('POST', JSON.stringify(body)),
		url: new URL('http://localhost/api/campaigns')
	});
	assert.equal(created.status, 200, await created.clone().text());
	assert.ok(
		(await pool.query('SELECT campaign_id FROM campaign_assets WHERE asset_id=$1', [asset.id]))
			.rows[0].campaign_id
	);
	assert.equal((await remove(userId)).status, 404);

	const savedCampaign = (await created.clone().json()).campaign;
	const designs = await server.ssrLoadModule('/src/routes/api/campaigns/designs/+server.ts');
	const encoded = `http://localhost/api/campaigns/redirect?token=${savedCampaign.public_token}`;
	const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
	for (const [mode, bytes, mime] of [
		['standard', png, 'image/png'],
		['artistic', gif, 'image/gif']
	]) {
		const form = new FormData();
		form.set('campaign', savedCampaign.campaign_id);
		form.set('mode', mode);
		form.set('content', encoded);
		form.set('file', new File([bytes], 'qr', { type: mime }));
		const response = await designs.POST({
			...event('POST', form),
			url: new URL('http://localhost/api/campaigns/designs')
		});
		assert.equal(response.status, 201, await response.clone().text());
	}
	const listEvent = {
		locals: { user: { user_id: userId } },
		url: new URL(`http://localhost/api/campaigns/designs?campaign=${savedCampaign.campaign_id}`)
	};
	const listed = await (await designs.GET(listEvent)).json();
	assert.equal(listed.designs.length, 2);
	for (const design of listed.designs) {
		uploaded.push(design.image_url);
		assert.equal((await fetch(design.image_url)).status, 200);
	}
	assert.equal(
		(await designs.GET({ ...listEvent, locals: { user: { user_id: userId + 1 } } })).status,
		404
	);
	console.log(
		'PASS campaign QR gallery: PNG + GIF saved to Blob, owner-only listing and public preview'
	);
	console.log(
		'PASS Blob upload → public download bytes → owner-only campaign attachment; unauthenticated/invalid uploads and foreign deletion rejected'
	);
} finally {
	for (const url of uploaded) await del(url, { token: env.BLOB_READ_WRITE_TOKEN });
	if (userId) await pool.query('DELETE FROM users WHERE user_id=$1', [userId]);
	await pool.end();
	await server.close();
	console.log('Temporary blobs and database fixtures removed');
}
