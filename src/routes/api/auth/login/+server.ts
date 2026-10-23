import * as bcrypt from 'bcrypt';
import { createSession, requireSessionSecret } from '$lib/server/session';
import { users } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { completeSocialLink } from '$lib/server/social-link';
import { SocialAccountError } from '$lib/server/social-accounts';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const payload = await request.json().catch(() => null);
		if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
			return json({ error: 'A valid JSON object is required' }, { status: 400 });
		}
		const { email, password } = payload;

		// Validate input
		if (
			typeof email !== 'string' ||
			typeof password !== 'string' ||
			!email ||
			!password ||
			email.length > 60 ||
			new TextEncoder().encode(password).length > 72
		) {
			return json({ error: 'Email and password are required' }, { status: 400 });
		}

		requireSessionSecret();

		// Find user by email
		const user = await users.findByEmail(email.trim());
		if (!user) {
			return json({ error: 'Invalid email or password' }, { status: 401 });
		}

		// Verify password
		const isValidPassword = await bcrypt.compare(password, user.password);
		if (!isValidPassword) {
			return json({ error: 'Invalid email or password' }, { status: 401 });
		}
		if (payload.linkSocial === true) await completeSocialLink(cookies, user);

		// Update login time
		await users.updateLoginTime(user.user_id);

		createSession(user.user_id, cookies, user.session_version || 0);

		// Return the profile; the session remains in the HttpOnly cookie.
		const { password: _, user_id: __, session_version: ___, ...userResponse } = user;
		return json({
			...userResponse
		});
	} catch (err) {
		if (err instanceof SocialAccountError)
			return json(
				{
					error:
						err.message === 'link_mismatch'
							? 'Sign in to the existing account with the same email to connect this provider.'
							: 'The connection attempt expired or could not be completed. Please try again.'
				},
				{ status: 409 }
			);
		console.error('Login error:', err);
		return json({ error: 'Unable to sign in. Please try again.' }, { status: 500 });
	}
};
