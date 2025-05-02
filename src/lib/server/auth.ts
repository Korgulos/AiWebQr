import jwt from 'jsonwebtoken';  // Changed from import * as jwt
import { JWT_SECRET } from '$env/static/private';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const authHeader = event.request.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET || 'fallback-secret-for-development') as { user_id: number };
            event.locals.user = { user_id: decoded.user_id };
        } catch (err) {
            console.error('JWT verification failed:', err);
        }
    }

    return await resolve(event);
};