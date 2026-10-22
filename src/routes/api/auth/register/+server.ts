import * as bcrypt from 'bcrypt';
import { createSession, requireSessionSecret } from '$lib/server/session';
import { users } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

function isValidPassword(password: string): boolean {
	// At least 8 characters, 1 uppercase, 1 lowercase, 1 number
	const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
	return passwordRegex.test(password);
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const payload = await request.json().catch(() => null);
		if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
			return json({ error: 'A valid JSON object is required' }, { status: 400 });
		}
		const { name, email, password } = payload;

		// Validate input
		if (
			typeof name !== 'string' ||
			typeof email !== 'string' ||
			typeof password !== 'string' ||
			!name.trim() ||
			!email ||
			!password ||
			new TextEncoder().encode(password).length > 72
		) {
			return json({ error: 'Name, email and password are required' }, { status: 400 });
		}

		// Validate name length
		if (name.length < 2 || name.length > 30) {
			return json({ error: 'Name must be between 2 and 30 characters' }, { status: 400 });
		}

		// Validate email format
		if (!isValidEmail(email)) {
			return json({ error: 'Invalid email format' }, { status: 400 });
		}

		// Validate email length (matches DB constraint)
		if (email.length > 60) {
			return json({ error: 'Email must not exceed 60 characters' }, { status: 400 });
		}

		// Validate password strength
		if (!isValidPassword(password)) {
			return json(
				{
					error:
						'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number'
				},
				{ status: 400 }
			);
		}

		requireSessionSecret();

		// Check if user already exists
		const existingUser = await users.findByEmail(email);
		if (existingUser) {
			return json({ error: 'Email already registered' }, { status: 409 });
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user
		const user = await users.create({
			name,
			email,
			password: hashedPassword,
			subscription: false
		});

		createSession(user.user_id, cookies);

		// Remove password from response
		const { password: _, user_id: __, session_version: ___, ...userResponse } = user;

		return json(userResponse, { status: 201 });
	} catch (err) {
		console.error('Registration error:', err);
		return json({ error: 'Unable to create account. Please try again.' }, { status: 500 });
	}
};
