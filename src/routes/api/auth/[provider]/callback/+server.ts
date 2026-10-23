import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	consumeSocialFlow,
	fetchSocialIdentity,
	isProvider,
	safeReturnTo
} from '$lib/server/social-auth';
import { resolveSocialAccount, SocialAccountError } from '$lib/server/social-accounts';
import { createSession } from '$lib/server/session';

export const GET: RequestHandler = async ({ params, url, cookies, locals }) => {
	if (!isProvider(params.provider)) error(404, 'Unknown sign-in provider');
	const provider = params.provider;
	const flow = consumeSocialFlow(provider, cookies, url.searchParams.get('state'), url.origin);
	if (!flow) redirect(303, '/login?authError=expired');
	const failurePath = flow.linkUserId ? '/settings' : '/login';
	if (url.searchParams.has('error')) redirect(303, `${failurePath}?authError=cancelled`);
	const code = url.searchParams.get('code');
	if (!code) redirect(303, `${failurePath}?authError=failed`);
	if (
		flow.linkUserId &&
		(locals.user?.user_id !== flow.linkUserId ||
			(locals.user?.session_version || 0) !== flow.linkVersion)
	) {
		redirect(303, '/login?authError=expired&returnTo=%2Fsettings');
	}
	let destination: string;
	try {
		const identity = await fetchSocialIdentity(provider, code, flow);
		const user = await resolveSocialAccount(identity, flow.linkUserId);
		createSession(user.user_id, cookies, user.session_version || 0);
		destination = flow.linkUserId ? '/settings?connected=1' : safeReturnTo(flow.returnTo);
	} catch (err) {
		// Provider errors can contain codes/tokens; never log the response or credentials.
		const reason = err instanceof SocialAccountError ? err.message : 'failed';
		destination = `${failurePath}?authError=${encodeURIComponent(reason)}`;
	}
	redirect(303, destination);
};
