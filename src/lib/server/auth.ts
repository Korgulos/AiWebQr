import { json, type Handle } from '@sveltejs/kit';
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
	const response = await resolve(event);
	if (event.url.pathname.startsWith('/api/') || event.locals.user) {
		response.headers.set('Cache-Control', 'private, no-store');
	}
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Frame-Options', 'DENY');
	return response;
};
