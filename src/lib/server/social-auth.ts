import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';
import { requireSessionSecret } from './session';
import type { SocialIdentity } from './social-accounts';

export const providers = ['google', 'microsoft'] as const;
export type Provider = (typeof providers)[number];
const microsoftKeys = createRemoteJWKSet(
	new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys')
);

export function isProvider(value: string): value is Provider {
	return providers.includes(value as Provider);
}
export function socialProviders() {
	return providers.filter((provider) => Boolean(config(provider)));
}
function config(provider: Provider) {
	const prefix = provider.toUpperCase();
	const id = env[`${prefix}_CLIENT_ID`];
	const secret = env[`${prefix}_CLIENT_SECRET`];
	return id && secret ? { id, secret } : null;
}
export function safeReturnTo(value: string | null): string {
	if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20\x7f]/.test(value))
		return '/';
	return value;
}
function callbackURL(provider: Provider, origin: string) {
	return `${origin}/api/auth/${provider}/callback`;
}
const cookieName = (provider: Provider) => `qr_oauth_${provider}`;
export interface OAuthFlow {
	state: string;
	nonce: string;
	verifier: string;
	returnTo: string;
	origin: string;
	linkUserId?: number;
	linkVersion?: number;
	pendingLinkId?: string;
}

export function beginSocialAuth(
	provider: Provider,
	origin: string,
	cookies: Cookies,
	returnTo: string | null,
	link?: { user_id: number; session_version?: number },
	pendingLinkId?: string
) {
	const credentials = config(provider);
	if (!credentials) return null;
	const flow: OAuthFlow = {
		state: randomBytes(32).toString('base64url'),
		nonce: randomBytes(32).toString('base64url'),
		verifier: randomBytes(48).toString('base64url'),
		returnTo: safeReturnTo(returnTo),
		origin,
		...(pendingLinkId ? { pendingLinkId } : {}),
		...(link ? { linkUserId: link.user_id, linkVersion: link.session_version || 0 } : {})
	};
	const challenge = createHash('sha256').update(flow.verifier).digest('base64url');
	let authorization: URL;
	if (provider === 'google') {
		const client = new OAuth2Client(
			credentials.id,
			credentials.secret,
			callbackURL(provider, origin)
		);
		authorization = new URL(
			client.generateAuthUrl({
				scope: ['openid', 'profile', 'email'],
				state: flow.state,
				code_challenge: challenge,
				code_challenge_method: CodeChallengeMethod.S256,
				prompt: 'select_account',
				nonce: flow.nonce
			})
		);
	} else {
		authorization = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
		authorization.search = new URLSearchParams({
			client_id: credentials.id,
			redirect_uri: callbackURL(provider, origin),
			response_type: 'code',
			response_mode: 'query',
			scope: 'openid profile email',
			state: flow.state,
			nonce: flow.nonce,
			code_challenge: challenge,
			code_challenge_method: 'S256',
			prompt: 'select_account'
		}).toString();
	}
	cookies.set(
		cookieName(provider),
		jwt.sign(flow, requireSessionSecret(), {
			algorithm: 'HS256',
			audience: `oauth:${provider}`,
			expiresIn: '10m'
		}),
		{ path: `/api/auth/${provider}`, httpOnly: true, secure: !dev, sameSite: 'lax', maxAge: 600 }
	);
	return authorization.toString();
}

export function consumeSocialFlow(
	provider: Provider,
	cookies: Cookies,
	state: string | null,
	origin: string
): OAuthFlow | null {
	const token = cookies.get(cookieName(provider));
	cookies.delete(cookieName(provider), { path: `/api/auth/${provider}` });
	if (!token || !state) return null;
	try {
		const flow = jwt.verify(token, requireSessionSecret(), {
			algorithms: ['HS256'],
			audience: `oauth:${provider}`
		});
		if (
			typeof flow === 'string' ||
			flow.state !== state ||
			flow.origin !== origin ||
			typeof flow.nonce !== 'string' ||
			typeof flow.verifier !== 'string' ||
			typeof flow.returnTo !== 'string'
		)
			return null;
		return flow as unknown as OAuthFlow;
	} catch {
		return null;
	}
}

export async function fetchSocialIdentity(
	provider: Provider,
	code: string,
	flow: OAuthFlow
): Promise<SocialIdentity> {
	const credentials = config(provider);
	if (!credentials) throw new Error('Provider unavailable');
	let claims: Record<string, unknown>;
	if (provider === 'google') {
		const client = new OAuth2Client(
			credentials.id,
			credentials.secret,
			callbackURL(provider, flow.origin)
		);
		const { tokens } = await client.getToken({ code, codeVerifier: flow.verifier });
		if (!tokens.id_token) throw new Error('Missing ID token');
		const ticket = await client.verifyIdToken({
			idToken: tokens.id_token,
			audience: credentials.id
		});
		claims = { ...ticket.getPayload() };
		if (claims.email_verified !== true) throw new Error('Unverified Google email');
	} else {
		const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: credentials.id,
				client_secret: credentials.secret,
				code,
				code_verifier: flow.verifier,
				grant_type: 'authorization_code',
				redirect_uri: callbackURL(provider, flow.origin)
			}),
			signal: AbortSignal.timeout(15000)
		});
		if (!response.ok) throw new Error('Microsoft token exchange failed');
		const tokens = await response.json();
		if (typeof tokens.id_token !== 'string') throw new Error('Missing ID token');
		const { payload } = await jwtVerify(tokens.id_token, microsoftKeys, {
			audience: credentials.id,
			algorithms: ['RS256'],
			requiredClaims: ['exp', 'iat', 'sub', 'iss', 'nonce', 'tid']
		});
		if (
			typeof payload.tid !== 'string' ||
			!/^[0-9a-f-]{36}$/i.test(payload.tid) ||
			payload.iss !== `https://login.microsoftonline.com/${payload.tid}/v2.0`
		)
			throw new Error('Invalid Microsoft issuer');
		claims = payload;
	}
	if (claims.nonce !== flow.nonce || typeof claims.sub !== 'string' || !claims.sub)
		throw new Error('Invalid identity');
	const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : null;
	return {
		provider,
		subject: provider === 'microsoft' ? `${claims.tid}:${claims.sub}` : claims.sub,
		name: typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim() : 'QR creator',
		email: email && email.length <= 60 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
		emailVerified: provider === 'google'
	};
}
