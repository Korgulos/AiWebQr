import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { validPublicId } from '$lib/server/public-ids';
import { env } from '$env/dynamic/private';
import { put, del } from '@vercel/blob';
import { randomUUID, createHash } from 'node:crypto';
import type { RequestHandler } from './$types';
const MAX = 3 * 1024 * 1024;
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = url.searchParams.get('campaign');
	if (!validPublicId(id)) return json({ error: 'Invalid campaign' }, { status: 400 });
	const owned = await db.query(
		'SELECT campaign_id FROM campaigns WHERE public_id=$1 AND user_id=$2',
		[id, locals.user.user_id]
	);
	if (!owned.length) return json({ error: 'Campaign not found' }, { status: 404 });
	const designs = await db.query(
		`SELECT d.design_id,d.image_url,d.mime_type,d.mode,d.created_at FROM campaign_qr_designs d JOIN campaigns c ON c.campaign_id=d.campaign_id WHERE c.public_id=$1 AND d.user_id=$2 AND c.user_id=$2 ORDER BY d.created_at DESC LIMIT 50`,
		[id, locals.user.user_id]
	);
	return json({ designs }, { headers: { 'Cache-Control': 'private, no-store' } });
};
export const POST: RequestHandler = async ({ locals, request, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!env.BLOB_READ_WRITE_TOKEN) return json({ error: 'Storage unavailable' }, { status: 503 });
	const reader = request.body?.getReader();
	if (!reader) return json({ error: 'File required' }, { status: 400 });
	const chunks: Uint8Array[] = [];
	let length = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		length += value.length;
		if (length > MAX + 32768) {
			await reader.cancel();
			return json({ error: 'Saved QR images must be smaller than 3 MB.' }, { status: 413 });
		}
		chunks.push(value);
	}
	let form: FormData;
	try {
		form = await new Request(request.url, {
			method: 'POST',
			headers: { 'Content-Type': request.headers.get('content-type') || '' },
			body: Buffer.concat(chunks)
		}).formData();
	} catch {
		return json({ error: 'Invalid upload' }, { status: 400 });
	}
	const campaign = form.get('campaign'),
		mode = form.get('mode'),
		content = form.get('content'),
		file = form.get('file');
	if (
		!validPublicId(campaign) ||
		!['standard', 'artistic'].includes(String(mode)) ||
		typeof content !== 'string' ||
		content.length > 10000 ||
		!(file instanceof File) ||
		!file.size ||
		file.size > MAX
	)
		return json({ error: 'Invalid QR design' }, { status: 400 });
	const bytes = Buffer.from(await file.arrayBuffer());
	const png =
		bytes.length >= 33 &&
		bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
	const gif = bytes.length > 13 && ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6));
	if (!png && !gif)
		return json({ error: 'Only generated PNG or GIF images can be saved.' }, { status: 400 });
	const client = await db.getClient();
	let uploaded: string | undefined;
	try {
		await client.query('BEGIN');
		await client.query('SELECT pg_advisory_xact_lock($1)', [locals.user.user_id]);
		const owned = await client.query(
			'SELECT c.campaign_id,c.qr_payload,b.slug FROM campaigns c JOIN backlinks b ON b.backlink_id=c.backlink_id AND b.user_id=c.user_id WHERE c.public_id=$1 AND c.user_id=$2 FOR UPDATE OF c',
			[campaign, locals.user.user_id]
		);
		if (!owned.rows.length) {
			await client.query('ROLLBACK');
			return json({ error: 'Campaign not found' }, { status: 404 });
		}
		const row = owned.rows[0];
		const expected =
			row.qr_payload ||
			`${url.origin}/api/campaigns/redirect?token=${encodeURIComponent(row.slug)}`;
		if (content !== expected) {
			await client.query('ROLLBACK');
			return json(
				{ error: 'Campaign content changed. Reload and generate the QR again.' },
				{ status: 409 }
			);
		}
		const usage = await client.query(
			'SELECT count(*)::int AS count,coalesce(sum(byte_size),0)::bigint AS bytes FROM campaign_qr_designs WHERE user_id=$1',
			[locals.user.user_id]
		);
		if (usage.rows[0].count >= 100 || Number(usage.rows[0].bytes) + file.size > 100 * 1024 * 1024) {
			await client.query('ROLLBACK');
			return json({ error: 'QR gallery storage limit reached.' }, { status: 409 });
		}
		const count = await client.query(
			'SELECT count(*)::int AS count FROM campaign_qr_designs WHERE campaign_id=$1',
			[row.campaign_id]
		);
		if (count.rows[0].count >= 50) {
			await client.query('ROLLBACK');
			return json({ error: 'Maximum 50 saved QR designs per campaign.' }, { status: 409 });
		}
		const id = randomUUID();
		const blob = await put(`qr-designs/${id}.${gif ? 'gif' : 'png'}`, bytes, {
			token: env.BLOB_READ_WRITE_TOKEN,
			access: 'public',
			addRandomSuffix: false,
			allowOverwrite: false,
			contentType: gif ? 'image/gif' : 'image/png'
		});
		uploaded = blob.url;
		await client.query(
			'INSERT INTO campaign_qr_designs(design_id,user_id,campaign_id,image_url,storage_path,mime_type,byte_size,mode,content_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
			[
				id,
				locals.user.user_id,
				row.campaign_id,
				blob.url,
				blob.pathname,
				gif ? 'image/gif' : 'image/png',
				file.size,
				mode,
				createHash('sha256').update(content).digest('hex')
			]
		);
		await client.query('COMMIT');
		return json({ success: true }, { status: 201 });
	} catch {
		await client.query('ROLLBACK');
		if (uploaded) await del(uploaded, { token: env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
		return json({ error: 'Could not save QR design.' }, { status: 502 });
	} finally {
		client.release();
	}
};
