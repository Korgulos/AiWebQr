import { safeTimeZone } from '$lib/server/time-zone';
import { json } from '@sveltejs/kit';
import { validPublicId } from '$lib/server/public-ids';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const timeZone = safeTimeZone(url.searchParams.get('timeZone'));
	const token = url.searchParams.get('id');
	if (!validPublicId(token)) return json({ error: 'Invalid campaign ID' }, { status: 400 });
	const owned = await db.query(
		'SELECT campaign_id FROM campaigns WHERE public_id=$1 AND user_id=$2',
		[token, locals.user.user_id]
	);
	if (!owned.length) return json({ error: 'Campaign not found' }, { status: 404 });
	const id = (owned[0] as { campaign_id: number }).campaign_id;
	const summary = await db.query(
		`SELECT count(*)::int AS total,
	 count(*) FILTER(WHERE NOT is_bot)::int AS human,
	 count(*) FILTER(WHERE is_bot)::int AS bots,
	 count(*) FILTER(WHERE NOT is_bot AND is_rapid_repeat)::int AS rapid_repeats,
	 count(DISTINCT visitor_hash) FILTER(WHERE NOT is_bot)::int AS daily_visitor_sum
	 FROM scan_events WHERE campaign_id=$1 AND occurred_at >= now()-interval '30 days'`,
		[id]
	);
	const daily = await db.query(
		`SELECT (occurred_at AT TIME ZONE $2)::date::text AS day, count(*)::int AS total,
	 count(DISTINCT visitor_hash) FILTER(WHERE NOT is_bot)::int AS visitors FROM scan_events
	 WHERE campaign_id=$1 AND occurred_at >= now()-interval '30 days' GROUP BY 1 ORDER BY 1`,
		[id, timeZone]
	);
	const devices = await db.query(
		`SELECT device_type, count(*)::int AS total FROM scan_events
	 WHERE campaign_id=$1 AND occurred_at >= now()-interval '30 days' AND NOT is_bot GROUP BY device_type ORDER BY total DESC`,
		[id]
	);
	return json(
		{ summary: summary[0], daily, devices, timeZone },
		{ headers: { 'Cache-Control': 'private, no-store' } }
	);
};
