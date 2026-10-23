import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';
import { db, type User } from './db';
import { requireSessionSecret } from './session';
import { resolveSocialAccount, SocialAccountError, type SocialIdentity } from './social-accounts';

const cookie = 'qr_pending_social_link';
interface PendingLink {
	id: string;
	identity: SocialIdentity;
	userId: number;
	version: number;
	returnTo: string;
}

export function pendingSocialLink(cookies: Cookies): PendingLink | null {
	const token = cookies.get(cookie);
	if (!token) return null;
	try {
		const value = jwt.verify(token, requireSessionSecret(), {
			algorithms: ['HS256'],
			audience: 'pending-social-link'
		});
		if (
			typeof value === 'string' ||
			typeof value.id !== 'string' ||
			!Number.isSafeInteger(value.userId) ||
			value.userId <= 0 ||
			!Number.isSafeInteger(value.version) ||
			typeof value.returnTo !== 'string' ||
			!value.identity ||
			!['google', 'microsoft'].includes(value.identity.provider) ||
			typeof value.identity.subject !== 'string' ||
			typeof value.identity.email !== 'string'
		)
			return null;
		return value as unknown as PendingLink;
	} catch {
		return null;
	}
}

export function clearPendingSocialLink(cookies: Cookies) {
	cookies.delete(cookie, { path: '/' });
}

export async function prepareSocialLink(
	identity: SocialIdentity,
	cookies: Cookies,
	returnTo: string
) {
	if (!identity.email) throw new SocialAccountError('email_required');
	const rows = await db.query<User>('SELECT * FROM users WHERE lower(trim(email))=$1', [
		identity.email.trim().toLowerCase()
	]);
	const user = rows[0];
	if (!user) throw new SocialAccountError('failed');
	const pending: PendingLink = {
		id: randomUUID(),
		identity,
		userId: user.user_id,
		version: user.session_version || 0,
		returnTo
	};
	cookies.set(
		cookie,
		jwt.sign(pending, requireSessionSecret(), {
			algorithm: 'HS256',
			audience: 'pending-social-link',
			expiresIn: '10m'
		}),
		{ path: '/', httpOnly: true, secure: !dev, sameSite: 'lax', maxAge: 600 }
	);
	return pending;
}

export async function completeSocialLink(cookies: Cookies, user: User, expectedId?: string) {
	const pending = pendingSocialLink(cookies);
	if (!pending || (expectedId && pending.id !== expectedId))
		throw new SocialAccountError('expired');
	if (
		pending.userId !== user.user_id ||
		pending.version !== (user.session_version || 0) ||
		pending.identity.email?.trim().toLowerCase() !== user.email.trim().toLowerCase()
	) {
		throw new SocialAccountError('link_mismatch');
	}
	await resolveSocialAccount(pending.identity, user.user_id, pending.version);
	clearPendingSocialLink(cookies);
	return pending.returnTo;
}

export async function existingSocialLinkUser(
	identity: SocialIdentity,
	cookies: Cookies,
	expectedId: string
): Promise<User> {
	const pending = pendingSocialLink(cookies);
	if (!pending || pending.id !== expectedId) throw new SocialAccountError('expired');
	const rows = await db.query<User>(
		`SELECT u.* FROM social_accounts a JOIN users u ON u.user_id=a.user_id
		WHERE a.provider=$1 AND a.subject=$2 AND u.user_id=$3`,
		[identity.provider, identity.subject, pending.userId]
	);
	if (!rows[0]) throw new SocialAccountError('link_mismatch');
	return rows[0];
}
