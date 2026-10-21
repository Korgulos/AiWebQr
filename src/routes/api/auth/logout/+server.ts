import { users } from '$lib/server/db';
import { sessionCookie } from '$lib/server/session';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	cookies.delete(sessionCookie, { path: '/' });
	if (locals.user) {
		try {
			await users.updateLogoutTime(locals.user.user_id);
		} catch (error) {
			console.error('Logout timestamp update failed', error);
		}
	}
	return json({ success: true });
};
