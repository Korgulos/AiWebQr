import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({
	configFile: false,
	appType: 'custom',
	optimizeDeps: { noDiscovery: true, entries: [] },
	server: { middlewareMode: true, hmr: false, ws: false }
});
try {
	const { collectScan, appendScan, summarizeScans } = await server.ssrLoadModule(
		'/src/lib/server/scan-analytics.ts'
	);
	const secret = 'test-secret-longer-than-thirty-two-characters';
	const request = new Request('https://qr.test/r/demo?token=secret', {
		method: 'POST',
		body: 'password=secret',
		headers: {
			'user-agent': 'Mozilla/5.0 (iPhone) Safari/605',
			cookie: 'session=secret',
			authorization: 'Bearer secret',
			referer: 'https://example.com/private?token=secret',
			'accept-language': 'sr',
			'sec-ch-ua-mobile': '?1'
		}
	});
	const first = collectScan(request, '192.0.2.1', secret, 1, new Date('2026-10-22T10:00:00Z'));
	const serialized = JSON.stringify(first);
	for (const value of ['192.0.2.1', 'password=', 'Bearer', 'session=', 'token=', '/private'])
		assert.ok(!serialized.includes(value));
	assert.equal(first.referrer_host, 'example.com');
	assert.equal(first.device_type, 'mobile');
	const events = [];
	assert.equal(appendScan(events, first), true);
	assert.equal(appendScan(events, first), false);
	appendScan(
		events,
		collectScan(request, '192.0.2.1', secret, 1, new Date('2026-10-22T10:00:05Z'))
	);
	assert.equal(events[1].is_rapid_repeat, true);
	appendScan(
		events,
		collectScan(request, '192.0.2.1', secret, 1, new Date('2026-10-22T10:01:00Z'))
	);
	assert.equal(events[2].is_rapid_repeat, false);
	assert.notEqual(first.visitor_hash, collectScan(request, '192.0.2.1', secret, 2).visitor_hash);
	assert.notEqual(
		first.visitor_hash,
		collectScan(request, '192.0.2.1', secret, 1, new Date('2026-10-23')).visitor_hash
	);
	appendScan(
		events,
		collectScan(
			new Request('https://qr.test/', { headers: { 'user-agent': 'PreviewBot' } }),
			'192.0.2.2',
			secret
		)
	);
	assert.deepEqual(summarizeScans(events), {
		total: 4,
		human: 3,
		bots: 1,
		daily_visitors: 1,
		rapid_repeats: 1
	});
	assert.throws(() => collectScan(request, 'ip', 'short'));
	console.log(
		'PASS metadata allowlist, HMAC scope/date, duplicate insert, repeats, bot separation, summary'
	);
} finally {
	await server.close();
}
