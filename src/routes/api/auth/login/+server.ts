import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';  // Changed from import * as jwt
import { users } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { JWT_SECRET } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { email, password } = await request.json();

        // Validate input
        if (!email || !password) {
            return json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user by email
        const user = await users.findByEmail(email);
        if (!user) {
            return json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Update login time
        await users.updateLoginTime(user.user_id);

        // Generate JWT token
        const token = jwt.sign(
            { user_id: user.user_id },
            JWT_SECRET || 'fallback-secret-for-development',
            { expiresIn: '7d' }
        );

        // Remove password from response and add token
        const { password: _, ...userResponse } = user;
        return json({
            ...userResponse,
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        return json({ error: errorMessage }, { status: 500 });
    }
};