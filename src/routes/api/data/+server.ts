import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// The old diagnostic endpoint exposed the users table. It is intentionally retired.
export const GET: RequestHandler = () => json({ error: 'Not found' }, { status: 404 });
