import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pendingSocialLink } from '$lib/server/social-link';
import type { SocialProvider } from '$lib/social-auth';

export const load: PageServerLoad = async ({ cookies, url, setHeaders }) => {
	setHeaders({ 'Cache-Control': 'private, no-store' });
	if (url.searchParams.get('linkAccount') !== '1') return { pendingLink: null };
	const pending = pendingSocialLink(cookies);
	if (!pending) return { pendingLink: null };
	const rows = await db.query<{ provider: SocialProvider }>(
		'SELECT provider FROM social_accounts WHERE user_id=$1',
		[pending.userId]
	);
	return {
		pendingLink: {
			email: pending.identity.email!,
			provider: pending.identity.provider,
			providers: rows
				.map((row) => row.provider)
				.filter((provider) => provider !== pending.identity.provider),
			returnTo: pending.returnTo
		}
	};
};
