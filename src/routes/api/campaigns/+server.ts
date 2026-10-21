import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { Campaign } from '$lib/server/db';
import { nanoid } from 'nanoid';

interface CampaignWithMeta extends Campaign {
	author_name: string;
	comment_count: number;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const campaignId = url.searchParams.get('id');
	let query: string;
	let params: (string | number)[] = [];

	if (campaignId) {
		query = `
            SELECT c.*, u.name as author_name, 
            (SELECT COUNT(*) FROM campaign_comments cc WHERE cc.campaign_id = c.campaign_id) as comment_count
            FROM campaigns c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.campaign_id = $1 AND c.user_id = $2
        `;
		if (!Number.isSafeInteger(Number(campaignId)) || Number(campaignId) < 1) {
			return json({ error: 'Invalid campaign ID' }, { status: 400 });
		}
		params = [Number(campaignId), user.user_id];
	} else {
		query = `
            SELECT c.*, u.name as author_name, 
            (SELECT COUNT(*) FROM campaign_comments cc WHERE cc.campaign_id = c.campaign_id) as comment_count
            FROM campaigns c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.user_id = $1
            ORDER BY c.created_at DESC
            LIMIT 100
        `;
	}

	if (!campaignId) params = [user.user_id];
	const campaigns = await db.query<CampaignWithMeta>(query, params);
	return json({ campaigns });
};

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const payload = await request.json().catch(() => null);
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return json({ error: 'A valid JSON object is required' }, { status: 400 });
	}
	const { title, description, destination_url } = payload;

	if (
		typeof title !== 'string' ||
		typeof description !== 'string' ||
		!title.trim() ||
		!description.trim() ||
		title.length > 200 ||
		description.length > 5000
	) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	let destination: URL;
	try {
		destination = new URL(destination_url);
		if (
			!['https:', 'http:'].includes(destination.protocol) ||
			destination.username ||
			destination.password
		)
			throw new Error();
		if (destination.origin === url.origin && destination.pathname === '/api/campaigns/redirect')
			throw new Error();
	} catch {
		return json(
			{ error: 'Enter a valid destination URL beginning with https:// or http://' },
			{ status: 400 }
		);
	}

	try {
		// Create a unique slug for the backlink
		const slug = nanoid(10);

		// Start a transaction
		const client = await db.getClient();
		try {
			await client.query('BEGIN');

			// Create backlink first
			const backlink = await client.query(
				`INSERT INTO backlinks (user_id, destination_url, slug)
                 VALUES ($1, $2, $3)
                 RETURNING backlink_id`,
				[user.user_id, destination.href, slug]
			);

			// Create campaign with backlink reference
			const result = await client.query(
				`INSERT INTO campaigns (user_id, title, description, backlink_id)
                 VALUES ($1, $2, $3, $4)
                 RETURNING campaign_id, title, description, backlink_id, created_at, updated_at`,
				[user.user_id, title, description, backlink.rows[0].backlink_id]
			);

			// Get author name for response
			const authorResult = await client.query(`SELECT name FROM users WHERE user_id = $1`, [
				user.user_id
			]);

			await client.query('COMMIT');

			// Return campaign with metadata
			return json({
				campaign: {
					...result.rows[0],
					author_name: authorResult.rows[0].name,
					comment_count: 0
				}
			});
		} catch (err) {
			await client.query('ROLLBACK');
			throw err;
		} finally {
			client.release();
		}
	} catch (error) {
		console.error('Campaign creation error:', error);
		return json({ error: 'Failed to create campaign' }, { status: 500 });
	}
};
