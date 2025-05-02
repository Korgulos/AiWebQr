import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { CampaignComment } from '$lib/server/db';

interface CommentWithMeta extends CampaignComment {
    author_name: string;
}

export const GET: RequestHandler = async ({ url, locals }) => {
    const user = locals.user as { user_id: number } | null;
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaignId = url.searchParams.get('campaign_id');
    if (!campaignId) {
        return json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    const comments = await db.query<CommentWithMeta>(
        `SELECT cc.*, u.name as author_name 
         FROM campaign_comments cc
         JOIN users u ON cc.user_id = u.user_id
         WHERE cc.campaign_id = $1
         ORDER BY cc.created_at ASC`,
        [Number(campaignId)]
    );

    return json({ comments });
};

export const POST: RequestHandler = async ({ request, locals }) => {
    const user = locals.user as { user_id: number } | null;
    if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaign_id, content } = await request.json();

    if (!campaign_id || !content) {
        return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await db.query<CommentWithMeta>(
        `INSERT INTO campaign_comments (campaign_id, user_id, content)
         VALUES ($1, $2, $3)
         RETURNING *,
         (SELECT name FROM users WHERE user_id = $2) as author_name`,
        [campaign_id, user.user_id, content]
    );

    return json({ comment: result[0] });
};