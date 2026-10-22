import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import {
	appendScan,
	collectScan,
	summarizeScans,
	type ScanEvent
} from '$lib/server/scan-analytics';
import type { RequestHandler } from './$types';

// Isolated local demo: no database, no production endpoint, no cross-user event listing.
const secret = randomBytes(32).toString('hex');
const buckets = new Map<string, { events: ScanEvent[]; expires: number }>();
export const POST: RequestHandler = async ({ request, cookies, getClientAddress, url }) => {
	if (!dev || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
		return json({ error: 'Not found' }, { status: 404 });
	if (request.headers.get('origin') !== url.origin)
		return json({ error: 'Invalid origin' }, { status: 403 });
	for (const [key, bucket] of buckets) if (bucket.expires < Date.now()) buckets.delete(key);
	let id = cookies.get('analytics_draft');
	if (!id || !buckets.has(id)) {
		if (buckets.size >= 100) return json({ error: 'Demo capacity reached' }, { status: 429 });
		id = randomBytes(24).toString('hex');
		buckets.set(id, { events: [], expires: Date.now() + 3600000 });
		cookies.set('analytics_draft', id, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: false,
			maxAge: 3600
		});
	}
	const bucket = buckets.get(id)!;
	if (bucket.events.length >= 100)
		return json({ error: 'Demo limit: restart server to reset' }, { status: 429 });
	appendScan(bucket.events, collectScan(request, getClientAddress(), secret));
	return json(
		{ summary: summarizeScans(bucket.events), events: [...bucket.events].reverse() },
		{ headers: { 'Cache-Control': 'no-store' } }
	);
};
