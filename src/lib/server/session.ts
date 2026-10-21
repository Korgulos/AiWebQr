import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const sessionCookie = 'qr_session';
export function requireSessionSecret() {
	if (!env.JWT_SECRET) throw new Error('JWT_SECRET is required');
	return env.JWT_SECRET;
}
export function createSession(userId: number, cookies: Cookies) {
	const token = jwt.sign({ user_id: userId }, requireSessionSecret(), {
		algorithm: 'HS256',
		expiresIn: '7d'
	});
	cookies.set(sessionCookie, token, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7
	});
}
export function readSession(token: string) {
	if (!env.JWT_SECRET) return null;
	try {
		const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
		if (
			typeof decoded === 'object' &&
			Number.isSafeInteger(decoded.user_id) &&
			decoded.user_id > 0
		) {
			return { user_id: decoded.user_id as number };
		}
	} catch {
		/* An invalid or expired session is anonymous. */
	}
	return null;
}
