import { users } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) return { user: null };
	const user = await users.findById(locals.user.user_id);
	if (!user) return { user: null };
	const { password: _, user_id: __, session_version: ___, ...profile } = user;
	return { user: profile };
};
