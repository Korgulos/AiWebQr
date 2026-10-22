import { json, type Handle } from '@sveltejs/kit';
import { users } from './db';
import { readSession, sessionCookie } from './session';

export const handle: Handle = async ({ event, resolve }) => {
	const origin = event.request.headers.get('origin');
	if (
		!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method) &&
		origin &&
		origin !== event.url.origin
	) {
		return json({ error: 'Cross-origin requests are not allowed' }, { status: 403 });
	}
	const token = event.cookies.get(sessionCookie);
	event.locals.user = token ? readSession(token) : null;
	if (event.locals.user) {
		const profile = await users.findById(event.locals.user.user_id);
		const session = readSession(token!);
		if (!profile || (profile.session_version || 0) !== (session?.session_version || 0)) {
			event.locals.user = null;
			event.cookies.delete(sessionCookie, { path: '/' });
		}
	}
	const response = await resolve(event);
	if (event.url.pathname.startsWith('/api/') || event.locals.user) {
		response.headers.set('Cache-Control', 'private, no-store');
	}
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	return response;
};
