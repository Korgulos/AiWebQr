import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = () => json({ error: 'Not found' }, { status: 404 });
export const POST: RequestHandler = GET;
