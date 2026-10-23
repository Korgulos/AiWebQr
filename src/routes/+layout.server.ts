import { users } from '$lib/server/db';
import type { LayoutServerLoad } from './$types';
import { socialProviders } from '$lib/server/social-auth';

export const load: LayoutServerLoad = async ({ locals }) => {
	const providers = socialProviders();
	if (!locals.user) return { user: null, socialProviders: providers };
	const user = await users.findById(locals.user.user_id);
	if (!user) return { user: null, socialProviders: providers };
	const { password: _, user_id: __, session_version: ___, ...profile } = user;
	return { user: profile, socialProviders: providers };
};
