import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { beginSocialAuth, isProvider } from '$lib/server/social-auth';

export const GET: RequestHandler = ({ params, url, cookies, locals }) => {
	if (!isProvider(params.provider)) error(404, 'Unknown sign-in provider');
	const linking = url.searchParams.get('link') === '1';
	if (linking && !locals.user) redirect(303, '/login?returnTo=%2Fsettings');
	const location = beginSocialAuth(
		params.provider,
		url.origin,
		cookies,
		linking ? '/settings' : url.searchParams.get('returnTo'),
		linking ? locals.user! : undefined
	);
	if (!location) redirect(303, '/login?authError=unavailable');
	redirect(303, location);
};
