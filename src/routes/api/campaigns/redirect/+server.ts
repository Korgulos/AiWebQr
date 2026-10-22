import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { collectScan } from '$lib/server/scan-analytics';
import { recordScan } from '$lib/server/scan-storage';

export const GET: RequestHandler = async ({ url, request, getClientAddress }) => {
	const token = url.searchParams.get('token');
	if (!token || !/^[A-Za-z0-9_-]{10,64}$/.test(token))
		return json({ error: 'Campaign not found' }, { status: 404 });

	try {
		// Get campaign and associated backlink
		const campaigns = await db.query<{
			campaign_id: number;
			backlink_id: number;
			destination_url: string;
			purpose: string;
			slug: string;
		}>(
			`SELECT c.campaign_id, c.backlink_id, c.purpose, b.slug, b.destination_url
             FROM campaigns c
             JOIN backlinks b ON c.backlink_id = b.backlink_id
             WHERE b.slug = $1 AND b.user_id = c.user_id
             AND c.status = 'active' AND c.purpose IN ('url','pdf','mp3','gallery') AND b.is_active = true
             AND (b.expiration_date IS NULL OR b.expiration_date > now())`,
			[token]
		);

		if (campaigns.length === 0) {
			return json({ error: 'Campaign not found' }, { status: 404 });
		}

		const campaign = campaigns[0];

		let destination: URL;
		try {
			destination = ['pdf', 'mp3', 'gallery'].includes(campaign.purpose)
				? new URL(`/view/${campaign.slug}`, url.origin)
				: new URL(campaign.destination_url);
			if (
				!['https:', 'http:'].includes(destination.protocol) ||
				destination.username ||
				destination.password
			)
				throw new Error();
			if (destination.origin === url.origin && destination.pathname === '/api/campaigns/redirect')
				throw new Error();
		} catch {
			return json({ error: 'This campaign needs a valid destination URL' }, { status: 410 });
		}

		// A metrics failure must never prevent a valid destination from opening.
		if (request.method === 'GET' && env.ANALYTICS_SECRET) {
			try {
				await recordScan(
					collectScan(request, getClientAddress(), env.ANALYTICS_SECRET, campaign.campaign_id),
					campaign.backlink_id
				);
			} catch {
				console.error('Campaign analytics write failed');
			}
		}

		// Redirect to the destination URL
		return new Response(null, {
			status: 302,
			headers: {
				Location: destination.href,
				'Cache-Control': 'no-store'
			}
		});
	} catch (error) {
		console.error('Campaign redirect error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

// SvelteKit delegates HEAD to GET; method guard above prevents scan counting.
