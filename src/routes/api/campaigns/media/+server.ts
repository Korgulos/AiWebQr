import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { put, del } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db';
import { MAX_MEDIA_BYTES, mediaSignature } from '$lib/media-upload';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!env.BLOB_READ_WRITE_TOKEN)
		return json({ error: 'File storage is not configured.' }, { status: 503 });
	const reader = request.body?.getReader();
	if (!reader) return json({ error: 'File is required' }, { status: 400 });
	const chunks: Uint8Array[] = [];
	let size = 0;
	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		size += value.length;
		if (size > MAX_MEDIA_BYTES + 16384) {
			await reader.cancel();
			return json({ error: 'Maximum file size is 3 MB.' }, { status: 413 });
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
	const file = form.get('file'),
		purpose = String(form.get('purpose'));
	if (!(file instanceof File) || !file.size || file.size > MAX_MEDIA_BYTES)
		return json({ error: 'Choose a file up to 3 MB.' }, { status: 400 });
	const bytes = new Uint8Array(await file.arrayBuffer());
	const format = mediaSignature(bytes, purpose);
	if (!format)
		return json(
			{ error: 'Choose a valid PDF, MP3, PNG, JPEG or WebP for this campaign type.' },
			{ status: 400 }
		);
	const client = await db.getClient();
	let uploaded: string | undefined;
	try {
		await client.query('BEGIN');
		await client.query('SELECT pg_advisory_xact_lock($1)', [locals.user.user_id]);
		const usage = await client.query(
			'SELECT count(*)::int AS count,coalesce(sum(byte_size),0)::bigint AS bytes FROM campaign_assets WHERE user_id=$1',
			[locals.user.user_id]
		);
		if (usage.rows[0].count >= 100 || Number(usage.rows[0].bytes) + file.size > 100 * 1024 * 1024) {
			await client.query('ROLLBACK');
			return json(
				{ error: 'Storage limit reached (100 files / 100 MB per account).' },
				{ status: 409 }
			);
		}
		const id = randomUUID(),
			path = `campaigns/${id}.${format.extension}`;
		const blob = await put(path, Buffer.from(bytes), {
			access: 'public',
			token: env.BLOB_READ_WRITE_TOKEN,
			addRandomSuffix: false,
			allowOverwrite: false,
			contentType: format.mime
		});
		uploaded = blob.url;
		await client.query(
			'INSERT INTO campaign_assets(asset_id,user_id,storage_path,public_url,content_type,byte_size,original_name) VALUES($1,$2,$3,$4,$5,$6,$7)',
			[
				id,
				locals.user.user_id,
				blob.pathname,
				blob.url,
				format.mime,
				file.size,
				file.name.slice(0, 255)
			]
		);
		await client.query('COMMIT');
		return json(
			{ asset: { id, url: blob.url, name: file.name.slice(0, 255), size: file.size } },
			{ status: 201 }
		);
	} catch {
		await client.query('ROLLBACK');
		if (uploaded) await del(uploaded, { token: env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
		return json({ error: 'Could not upload file. Please try again.' }, { status: 502 });
	} finally {
		client.release();
	}
};
export const DELETE: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = await request.json().catch(() => null);
	if (typeof body?.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id))
		return json({ error: 'Invalid file ID' }, { status: 400 });
	const client = await db.getClient();
	try {
		await client.query('BEGIN');
		const result = await client.query(
			'SELECT public_url FROM campaign_assets WHERE asset_id=$1 AND user_id=$2 AND campaign_id IS NULL FOR UPDATE',
			[body.id, locals.user.user_id]
		);
		if (!result.rows.length) {
			await client.query('ROLLBACK');
			return json({ error: 'File not found or already used by a campaign.' }, { status: 404 });
		}
		await del(result.rows[0].public_url, { token: env.BLOB_READ_WRITE_TOKEN });
		await client.query('DELETE FROM campaign_assets WHERE asset_id=$1', [body.id]);
		await client.query('COMMIT');
		return json({ success: true });
	} catch {
		await client.query('ROLLBACK');
		return json({ error: 'Could not remove file.' }, { status: 502 });
	} finally {
		client.release();
	}
};
