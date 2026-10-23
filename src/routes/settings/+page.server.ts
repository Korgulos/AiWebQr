import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import type { SocialProvider } from '$lib/social-auth';
export const load: PageServerLoad = async ({ parent, locals }) => {
	const { user, socialProviders } = await parent();
	if (!user) redirect(303, '/login?returnTo=%2Fsettings');
	const accounts = socialProviders.length
		? await db.query<{ provider: SocialProvider }>(
				'SELECT provider FROM social_accounts WHERE user_id=$1',
				[locals.user!.user_id]
			)
		: [];
	return { user, linkedProviders: accounts.map((account) => account.provider) };
};
