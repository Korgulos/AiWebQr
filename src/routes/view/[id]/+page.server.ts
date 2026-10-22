import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const token = params.id;
	if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) error(404, 'Not found');
	const rows = await db.query<{
		title: string;
		description: string;
		purpose: string;
		content_data: { media_urls: string[] };
	}>(
		`SELECT c.title,c.description,c.purpose,c.content_data FROM campaigns c JOIN backlinks b ON b.backlink_id=c.backlink_id AND b.user_id=c.user_id WHERE b.slug=$1 AND c.status='active' AND b.is_active=true AND (b.expiration_date IS NULL OR b.expiration_date>now()) AND c.purpose IN ('pdf','mp3','gallery')`,
		[token]
	);
	if (!rows.length) error(404, 'Campaign unavailable');
	const campaign = rows[0];
	const links = campaign.content_data.media_urls;
	if (
		!Array.isArray(links) ||
		links.some((link) => {
			try {
				return new URL(link).protocol !== 'https:';
			} catch {
				return true;
			}
		})
	)
		error(404, 'Media unavailable');
	setHeaders({ 'Cache-Control': 'no-store' });
	return { campaign };
};
