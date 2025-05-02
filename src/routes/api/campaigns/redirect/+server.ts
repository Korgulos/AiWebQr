import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, request }) => {
    const campaignId = url.searchParams.get('id');
    const referrer = request.headers.get('referer') || null;
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'Unknown';

    if (!campaignId) {
        return json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    try {
        // Get campaign and associated backlink
        const campaigns = await db.query<{ campaign_id: number, backlink_id: number, destination_url: string }>(
            `SELECT c.campaign_id, c.backlink_id, b.destination_url 
             FROM campaigns c
             JOIN backlinks b ON c.backlink_id = b.backlink_id
             WHERE c.campaign_id = $1`,
            [campaignId]
        );

        if (campaigns.length === 0) {
            return json({ error: 'Campaign not found' }, { status: 404 });
        }

        const campaign = campaigns[0];

        // Record the click with campaign context
        await db.query(
            `INSERT INTO backlink_clicks (
                backlink_id, 
                campaign_id,
                referrer_url, 
                ip_address, 
                country_code
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
                campaign.backlink_id,
                campaign.campaign_id,
                referrer,
                ip,
                'XX' // You can implement country detection using a geolocation service
            ]
        );

        // Redirect to the destination URL
        return new Response(null, {
            status: 302,
            headers: {
                Location: campaign.destination_url
            }
        });
    } catch (error) {
        console.error('Campaign redirect error:', error);
        return json({ error: 'Internal server error' }, { status: 500 });
    }
};