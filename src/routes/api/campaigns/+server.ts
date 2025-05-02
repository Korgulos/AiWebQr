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
            WHERE c.campaign_id = $1
        `;
        params = [Number(campaignId)];
    } else {
        query = `
            SELECT c.*, u.name as author_name, 
            (SELECT COUNT(*) FROM campaign_comments cc WHERE cc.campaign_id = c.campaign_id) as comment_count
            FROM campaigns c
            JOIN users u ON c.user_id = u.user_id
            ORDER BY c.created_at DESC
        `;
    }

    const campaigns = await db.query<CampaignWithMeta>(query, params);
    return json({ campaigns });
};

export const POST: RequestHandler = async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await request.json();

    if (!title || !description) {
        return json({ error: 'Missing required fields' }, { status: 400 });
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
                [user.user_id, `${request.url}/redirect`, slug]
            );

            // Create campaign with backlink reference
            const result = await client.query(
                `INSERT INTO campaigns (user_id, title, description, backlink_id)
                 VALUES ($1, $2, $3, $4)
                 RETURNING campaign_id, title, description, backlink_id, created_at, updated_at`,
                [user.user_id, title, description, backlink.rows[0].backlink_id]
            );

            // Get author name for response
            const authorResult = await client.query(
                `SELECT name FROM users WHERE user_id = $1`,
                [user.user_id]
            );

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