import { users } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { userId } = await request.json();
        
        if (!userId) {
            return json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        await users.updateLogoutTime(userId);

        return json({ success: true });
    } catch (err) {
        console.error('Logout error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        return json({ error: errorMessage }, { status: 500 });
    }
};