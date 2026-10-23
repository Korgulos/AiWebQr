import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { beginSocialAuth, isProvider } from '$lib/server/social-auth';
import { pendingSocialLink } from '$lib/server/social-link';

export const GET: RequestHandler = ({ params, url, cookies, locals }) => {
	if (!isProvider(params.provider)) error(404, 'Unknown sign-in provider');
	const linking = url.searchParams.get('link') === '1';
	const pending =
		url.searchParams.get('connectPending') === '1' ? pendingSocialLink(cookies) : null;
	if (url.searchParams.get('connectPending') === '1' && !pending)
		redirect(303, '/login?authError=expired');
	if (linking && !locals.user) redirect(303, '/login?returnTo=%2Fsettings');
	const location = beginSocialAuth(
		params.provider,
		url.origin,
		cookies,
		linking ? '/settings' : url.searchParams.get('returnTo'),
		linking ? locals.user! : undefined,
		pending?.id
	);
	if (!location) redirect(303, '/login?authError=unavailable');
	redirect(303, location);
};
