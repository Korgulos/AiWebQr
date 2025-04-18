// src/routes/api/data/+server.ts
import { users } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
    try {
        const userList = await users.list();
        return json(userList);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        return json({ error: errorMessage }, { status: 500 });
    }
};