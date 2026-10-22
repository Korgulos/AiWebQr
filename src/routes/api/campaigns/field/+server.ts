import { json } from '@sveltejs/kit';
import { validPublicId } from '$lib/server/public-ids';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';
export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = await request.json().catch(() => null);
	const id = body?.id,
		field = body?.field,
		value = body?.value;
	if (!validPublicId(id)) return json({ error: 'Invalid campaign ID' }, { status: 400 });
	const columns: Record<string, string> = {
		title: 'title',
		description: 'description',
		status: 'status',
		qr_payload: 'qr_payload'
	};
	if (typeof field === 'string' && Object.hasOwn(columns, field)) {
		if (
			typeof value !== 'string' ||
			value.length > (field === 'title' ? 200 : 5000) ||
			(field === 'title' && !value.trim()) ||
			(field === 'qr_payload' && !value.trim()) ||
			(field === 'status' && !['active', 'paused', 'archived'].includes(value))
		)
			return json({ error: 'Invalid field value' }, { status: 400 });
		const rows = await db.query(
			`UPDATE campaigns SET ${columns[field]}=$1,updated_at=now() WHERE public_id=$2 AND user_id=$3 ${field === 'qr_payload' ? 'AND qr_payload IS NOT NULL' : ''} RETURNING public_id`,
			[value, id, locals.user.user_id]
		);
		return rows.length
			? json({ success: true })
			: json({ error: 'Campaign not found' }, { status: 404 });
	}
	if (!['is_active', 'expiration_date'].includes(field))
		return json({ error: 'Invalid field' }, { status: 400 });
	let validated = value;
	if (field === 'is_active' && typeof value !== 'boolean')
		return json({ error: 'Invalid enabled state' }, { status: 400 });
	if (field === 'expiration_date') {
		if (value !== null && (typeof value !== 'string' || !Number.isFinite(Date.parse(value))))
			return json({ error: 'Invalid date' }, { status: 400 });
		validated = value ? new Date(value).toISOString() : null;
	}
	const rows = await db.query(
		`UPDATE backlinks b SET ${field}=$1 FROM campaigns c WHERE c.backlink_id=b.backlink_id AND c.user_id=b.user_id AND c.public_id=$2 AND c.user_id=$3 RETURNING b.backlink_id`,
		[validated, id, locals.user.user_id]
	);
	return rows.length
		? json({ success: true })
		: json({ error: 'Campaign not found' }, { status: 404 });
};
