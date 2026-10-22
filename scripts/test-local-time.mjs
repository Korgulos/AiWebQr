import assert from 'node:assert/strict';
import { createServer } from 'vite';
process.env.TZ = 'Europe/Belgrade';
const server = await createServer({
	configFile: false,
	appType: 'custom',
	optimizeDeps: { noDiscovery: true, entries: [] },
	server: { middlewareMode: true, hmr: false, ws: false }
});
try {
	const { localDateTimeInput } = await server.ssrLoadModule('/src/lib/local-time.ts');
	const { safeTimeZone } = await server.ssrLoadModule('/src/lib/server/time-zone.ts');
	assert.equal(localDateTimeInput('2026-10-22T12:00:00Z'), '2026-10-22T14:00');
	assert.equal(localDateTimeInput('2026-12-22T12:00:00Z'), '2026-12-22T13:00');
	assert.equal(localDateTimeInput('2026-03-29T01:30:00Z'), '2026-03-29T03:30');
	assert.equal(
		new Date(localDateTimeInput('2026-10-22T12:00:00Z')).toISOString(),
		'2026-10-22T12:00:00.000Z'
	);
	assert.equal(safeTimeZone('Europe/Belgrade'), 'Europe/Belgrade');
	assert.equal(safeTimeZone('bad-zone'), 'UTC');
	console.log(
		'PASS local time: summer/winter offset, DST boundary, round-trip expiry and timezone validation'
	);
} finally {
	await server.close();
}
