import { safeTimeZone } from '$lib/server/time-zone';
import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, setHeaders, locals, cookies }) => {
	const { user } = await parent();
	const timeZone = safeTimeZone(cookies.get('qr_timezone'));
	if (!user) return { dashboard: null };
	setHeaders({ 'Cache-Control': 'private, no-store' });
	try {
		const summary = await db.query<{
			campaigns: number;
			active: number;
			total: number;
			visitors: number;
			bots: number;
		}>(
			`SELECT
		 (SELECT count(*)::int FROM campaigns WHERE user_id=$1) AS campaigns,
		 (SELECT count(*)::int FROM campaigns WHERE user_id=$1 AND status='active') AS active,
		 count(s.id)::int AS total, count(DISTINCT s.visitor_hash) FILTER(WHERE NOT s.is_bot)::int AS visitors,
		 count(s.id) FILTER(WHERE s.is_bot)::int AS bots
		 FROM scan_events s JOIN campaigns c ON c.campaign_id=s.campaign_id
		 WHERE c.user_id=$1 AND s.occurred_at >= now()-interval '30 days'`,
			[locals.user!.user_id]
		);
		const campaigns = await db.query<{
			campaign_id: string;
			title: string;
			description: string | null;
			status: string;
			created_at: string;
			total: number;
			visitors: number;
		}>(
			`SELECT c.public_id AS campaign_id,c.title,c.description,c.status,c.created_at,
		 count(s.id)::int AS total, count(DISTINCT s.visitor_hash) FILTER(WHERE NOT s.is_bot)::int AS visitors
		 FROM campaigns c LEFT JOIN scan_events s ON s.campaign_id=c.campaign_id AND s.occurred_at >= now()-interval '30 days'
		 WHERE c.user_id=$1 GROUP BY c.campaign_id ORDER BY c.created_at DESC LIMIT 20`,
			[locals.user!.user_id]
		);
		const daily = await db.query<{ day: string; total: number }>(
			`SELECT d.day::date::text AS day, count(s.id)::int AS total
		 FROM generate_series((now() AT TIME ZONE $2)::date-13,(now() AT TIME ZONE $2)::date,interval '1 day') d(day)
		 LEFT JOIN (scan_events s JOIN campaigns c ON c.campaign_id=s.campaign_id AND c.user_id=$1)
		 ON (s.occurred_at AT TIME ZONE $2)::date=d.day::date GROUP BY d.day ORDER BY d.day`,
			[locals.user!.user_id, timeZone]
		);
		return {
			dashboard: { summary: summary[0], campaigns, daily, timeZone },
			dashboardError: false
		};
	} catch {
		console.error('Dashboard analytics unavailable');
		return { dashboard: null, dashboardError: true };
	}
};
