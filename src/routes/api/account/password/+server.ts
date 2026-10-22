import { json } from '@sveltejs/kit';
import { db, users } from '$lib/server/db';
import bcrypt from 'bcrypt';
import { sessionCookie } from '$lib/server/session';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ locals, request, cookies }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = await request.json().catch(() => null);
	if (
		typeof body?.current_password !== 'string' ||
		Buffer.byteLength(body.current_password) > 72 ||
		typeof body?.new_password !== 'string' ||
		Buffer.byteLength(body.new_password) > 72 ||
		!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(body.new_password)
	)
		return json(
			{
				error: 'Use 8+ characters with uppercase, lowercase and a number (maximum 72 UTF-8 bytes).'
			},
			{ status: 400 }
		);
	const user = await users.findById(locals.user.user_id);
	if (!user || !(await bcrypt.compare(body.current_password, user.password)))
		return json({ error: 'Current password is incorrect.' }, { status: 403 });
	if (body.current_password === body.new_password)
		return json({ error: 'Choose a different new password.' }, { status: 400 });
	const hash = await bcrypt.hash(body.new_password, 12);
	const client = await db.getClient();
	try {
		await client.query('BEGIN');
		const result = await client.query(
			'UPDATE users SET password=$1,session_version=session_version+1,updated_at=now() WHERE user_id=$2 AND password=$3 RETURNING user_id',
			[hash, user.user_id, user.password]
		);
		if (!result.rowCount) {
			await client.query('ROLLBACK');
			return json({ error: 'Account changed. Please sign in again.' }, { status: 409 });
		}
		await client.query('DELETE FROM sessions WHERE user_id=$1', [user.user_id]);
		await client.query('DELETE FROM auth_tokens WHERE user_id=$1', [user.user_id]);
		await client.query('COMMIT');
	} catch {
		await client.query('ROLLBACK');
		return json({ error: 'Could not change password.' }, { status: 500 });
	} finally {
		client.release();
	}
	cookies.delete(sessionCookie, { path: '/' });
	return json({ success: true });
};
