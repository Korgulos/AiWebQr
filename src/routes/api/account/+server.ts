import { json } from '@sveltejs/kit';
import { db, users } from '$lib/server/db';
import bcrypt from 'bcrypt';
import { del } from '@vercel/blob';
import { env } from '$env/dynamic/private';
import { sessionCookie } from '$lib/server/session';
import type { RequestHandler } from './$types';

function validAvatar(value: unknown) {
	if (value === null) return true;
	if (
		typeof value !== 'string' ||
		value.length > 90000 ||
		!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value)
	)
		return false;
	const bytes = Buffer.from(value.split(',')[1], 'base64');
	return (
		bytes.length >= 33 &&
		bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
		bytes.toString('ascii', 12, 16) === 'IHDR' &&
		bytes.readUInt32BE(16) > 0 &&
		bytes.readUInt32BE(16) <= 256 &&
		bytes.readUInt32BE(20) > 0 &&
		bytes.readUInt32BE(20) <= 256
	);
}
export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const text = await request.text();
	if (text.length > 95000) return json({ error: 'Profile is too large' }, { status: 413 });
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}
	if (!body || typeof body !== 'object' || Array.isArray(body))
		return json({ error: 'Invalid profile' }, { status: 400 });
	// Retain the existing display-name endpoint for older clients.
	if (!('first_name' in body)) {
		if (
			typeof body.name !== 'string' ||
			body.name.trim().length < 2 ||
			body.name.trim().length > 30
		)
			return json({ error: 'Name must contain 2–30 characters' }, { status: 400 });
		const rows = await db.query(
			'UPDATE users SET name=$1, updated_at=now() WHERE user_id=$2 RETURNING user_id',
			[body.name.trim(), locals.user.user_id]
		);
		return rows.length
			? json({ success: true })
			: json({ error: 'Account not found' }, { status: 404 });
	}
	const { first_name: first, last_name: last, username, avatar_data: avatar } = body;
	if (
		typeof first !== 'string' ||
		!first.trim() ||
		first.trim().length > 60 ||
		typeof last !== 'string' ||
		last.trim().length > 60 ||
		typeof username !== 'string' ||
		(username && !/^[a-zA-Z0-9_]{3,30}$/.test(username)) ||
		!validAvatar(avatar)
	)
		return json(
			{ error: 'Check your name, username (3–30 letters, numbers or underscores) and avatar.' },
			{ status: 400 }
		);
	try {
		const rows = await db.query(
			'UPDATE users SET first_name=$1,last_name=$2,username=$3,avatar_data=$4,name=$5,updated_at=now() WHERE user_id=$6 RETURNING user_id',
			[
				first.trim(),
				last.trim(),
				username.toLowerCase() || null,
				avatar,
				[first.trim(), last.trim()].filter(Boolean).join(' '),
				locals.user.user_id
			]
		);
		return rows.length
			? json({ success: true })
			: json({ error: 'Account not found' }, { status: 404 });
	} catch (error) {
		if ((error as { code?: string }).code === '23505')
			return json({ error: 'That username is already taken.' }, { status: 409 });
		return json({ error: 'Could not update profile' }, { status: 500 });
	}
};
export const DELETE: RequestHandler = async ({ locals, request, cookies }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = await request.json().catch(() => null);
	if (
		body?.confirmation !== 'DELETE' ||
		typeof body?.password !== 'string' ||
		Buffer.byteLength(body.password) > 72
	)
		return json({ error: 'Enter your current password and type DELETE.' }, { status: 400 });
	const user = await users.findById(locals.user.user_id);
	if (!user || !(await bcrypt.compare(body.password, user.password)))
		return json({ error: 'Current password is incorrect.' }, { status: 403 });

	const client = await db.getClient();
	try {
		await client.query('BEGIN');
		await client.query('SELECT pg_advisory_xact_lock($1)', [user.user_id]);
		const current = await client.query(
			'SELECT user_id FROM users WHERE user_id=$1 AND password=$2 FOR UPDATE',
			[user.user_id, user.password]
		);
		if (!current.rows.length) {
			await client.query('ROLLBACK');
			return json({ error: 'Account changed. Please sign in again.' }, { status: 409 });
		}
		const assets = await client.query(
			'SELECT public_url FROM campaign_assets WHERE user_id=$1 UNION ALL SELECT image_url AS public_url FROM campaign_qr_designs WHERE user_id=$1',
			[user.user_id]
		);
		if (assets.rows.length)
			await del(
				assets.rows.map((asset) => asset.public_url),
				{ token: env.BLOB_READ_WRITE_TOKEN }
			);
		await client.query('DELETE FROM users WHERE user_id=$1', [user.user_id]);
		await client.query('COMMIT');
	} catch {
		await client.query('ROLLBACK');
		return json(
			{ error: 'Could not remove account and stored files. Please try again.' },
			{ status: 502 }
		);
	} finally {
		client.release();
	}

	cookies.delete(sessionCookie, { path: '/' });
	return json({ success: true });
};
