import { del } from '@vercel/blob';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { Campaign } from '$lib/server/db';
import { validPublicId, publicCampaign } from '$lib/server/public-ids';
import { nanoid } from 'nanoid';
import { prepareCampaign } from '$lib/campaign-purposes';

interface CampaignWithMeta extends Campaign {
	author_name: string;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const campaignId = url.searchParams.get('id');
	let query: string;
	let params: (string | number)[] = [];

	if (campaignId) {
		query = `
            SELECT c.*, b.slug as public_token, b.destination_url, b.is_active, b.expiration_date, (SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.asset_id,'url',a.public_url,'name',a.original_name,'size',a.byte_size)),'[]'::jsonb) FROM campaign_assets a WHERE a.campaign_id=c.campaign_id AND a.user_id=c.user_id) AS assets, u.name as author_name
            FROM campaigns c
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN backlinks b ON b.backlink_id=c.backlink_id AND b.user_id=c.user_id
            WHERE c.public_id = $1 AND c.user_id = $2
        `;
		if (!validPublicId(campaignId)) {
			return json({ error: 'Invalid campaign ID' }, { status: 400 });
		}
		params = [campaignId, user.user_id];
	} else {
		query = `
            SELECT c.*, b.slug as public_token, b.destination_url, b.is_active, b.expiration_date, (SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.asset_id,'url',a.public_url,'name',a.original_name,'size',a.byte_size)),'[]'::jsonb) FROM campaign_assets a WHERE a.campaign_id=c.campaign_id AND a.user_id=c.user_id) AS assets, u.name as author_name
            FROM campaigns c
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN backlinks b ON b.backlink_id=c.backlink_id AND b.user_id=c.user_id
            WHERE c.user_id = $1
            ORDER BY c.created_at DESC
            LIMIT 100
        `;
	}

	if (!campaignId) params = [user.user_id];
	const campaigns = await db.query<CampaignWithMeta>(query, params);
	return json({ campaigns: campaigns.map(publicCampaign) });
};

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const editing = request.method === 'PATCH';
	const editToken = url.searchParams.get('id');
	let editId: number | null = null;
	if (editing && !validPublicId(editToken))
		return json({ error: 'Invalid campaign ID' }, { status: 400 });
	const payload = await request.json().catch(() => null);
	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		return json({ error: 'A valid JSON object is required' }, { status: 400 });
	}
	const { title, destination_url } = payload;
	const description = payload.description ?? '';
	const purpose = payload.purpose || 'url';
	let prepared: ReturnType<typeof prepareCampaign>;
	try {
		const values = payload.values || { url: destination_url };
		if (
			!values ||
			typeof values !== 'object' ||
			Array.isArray(values) ||
			Object.values(values).some((value) => typeof value !== 'string' || value.length > 5000)
		)
			throw new Error('Invalid content');
		prepared = prepareCampaign(purpose, values);
		(prepared.content as Record<string, unknown>).values = values;
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Invalid content' },
			{ status: 400 }
		);
	}

	if (
		typeof title !== 'string' ||
		typeof description !== 'string' ||
		!title.trim() ||
		title.length > 200 ||
		description.length > 5000
	) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	const status = payload.status || 'active';
	if (
		!['active', 'paused', 'archived'].includes(status) ||
		(payload.is_active !== undefined && typeof payload.is_active !== 'boolean')
	)
		return json({ error: 'Invalid status' }, { status: 400 });
	const expiry = payload.expiration_date ? new Date(payload.expiration_date) : null;
	if (expiry && !Number.isFinite(expiry.getTime()))
		return json({ error: 'Invalid expiration date' }, { status: 400 });

	const assetIds = payload.asset_ids || [];
	if (
		!Array.isArray(assetIds) ||
		assetIds.length > 12 ||
		new Set(assetIds).size !== assetIds.length ||
		assetIds.some((id) => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) ||
		(assetIds.length && !['pdf', 'mp3', 'gallery'].includes(purpose))
	)
		return json({ error: 'Invalid uploaded files' }, { status: 400 });

	let destination: URL;
	try {
		destination = new URL(prepared.destination || url.origin);
		if (
			!['https:', 'http:'].includes(destination.protocol) ||
			destination.username ||
			destination.password
		)
			throw new Error();
		if (destination.origin === url.origin && destination.pathname === '/api/campaigns/redirect')
			throw new Error();
	} catch {
		return json(
			{ error: 'Enter a valid destination URL beginning with https:// or http://' },
			{ status: 400 }
		);
	}

	try {
		// Create a unique slug for the backlink
		let slug = nanoid(24);

		// Start a transaction
		const client = await db.getClient();
		try {
			await client.query('BEGIN');
			let existing: { backlink_id: number; slug: string } | undefined;
			if (editing) {
				const owned = await client.query(
					'SELECT c.campaign_id,c.backlink_id,b.slug FROM campaigns c JOIN backlinks b ON b.backlink_id=c.backlink_id AND b.user_id=c.user_id WHERE c.public_id=$1 AND c.user_id=$2 FOR UPDATE OF c,b',
					[editToken, user.user_id]
				);
				if (!owned.rows.length) {
					await client.query('ROLLBACK');
					return json({ error: 'Campaign not found' }, { status: 404 });
				}
				existing = owned.rows[0];
				editId = owned.rows[0].campaign_id;
				slug = existing!.slug;
			}

			if (assetIds.length) {
				const assets = await client.query(
					'SELECT asset_id,public_url,content_type FROM campaign_assets WHERE asset_id=ANY($1::uuid[]) AND user_id=$2 AND (campaign_id IS NULL OR campaign_id=$3) FOR UPDATE',
					[assetIds, user.user_id, editing ? editId : null]
				);
				const urls = (prepared.content as { media_urls?: string[] }).media_urls || [];
				const allowed =
					purpose === 'pdf'
						? ['application/pdf']
						: purpose === 'mp3'
							? ['audio/mpeg']
							: ['image/png', 'image/jpeg', 'image/webp'];
				if (
					assets.rows.length !== assetIds.length ||
					urls.length !== assetIds.length ||
					assets.rows.some((a) => !urls.includes(a.public_url) || !allowed.includes(a.content_type))
				) {
					await client.query('ROLLBACK');
					return json(
						{ error: 'Uploaded files are unavailable or do not belong to this account.' },
						{ status: 400 }
					);
				}
			}

			const backlinkId =
				existing?.backlink_id ||
				(
					await client.query(
						'INSERT INTO backlinks(user_id,destination_url,slug) VALUES($1,$2,$3) RETURNING backlink_id',
						[user.user_id, destination.href, slug]
					)
				).rows[0].backlink_id;
			const params = [
				user.user_id,
				title,
				description,
				backlinkId,
				purpose,
				prepared.tracked ? null : prepared.payload,
				JSON.stringify(prepared.content),
				status
			];
			const result = editing
				? await client.query(
						'UPDATE campaigns SET title=$2,description=$3,backlink_id=$4,purpose=$5,qr_payload=$6,content_data=$7,status=$8,updated_at=now() WHERE campaign_id=$9 AND user_id=$1 RETURNING *',
						[
							user.user_id,
							title,
							description,
							backlinkId,
							purpose,
							prepared.tracked ? null : prepared.payload,
							JSON.stringify(prepared.content),
							status,
							editId
						]
					)
				: await client.query(
						'INSERT INTO campaigns(user_id,title,description,backlink_id,purpose,qr_payload,content_data,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
						[
							user.user_id,
							title,
							description,
							backlinkId,
							purpose,
							prepared.tracked ? null : prepared.payload,
							JSON.stringify(prepared.content),
							status
						]
					);
			await client.query(
				'UPDATE backlinks SET destination_url=$1,is_active=$2,expiration_date=$3 WHERE backlink_id=$4 AND user_id=$5',
				[
					destination.href,
					payload.is_active ?? true,
					expiry?.toISOString() || null,
					backlinkId,
					user.user_id
				]
			);
			if (editing)
				await client.query(
					'UPDATE campaign_assets SET campaign_id=NULL WHERE campaign_id=$1 AND user_id=$2 AND NOT(asset_id=ANY($3::uuid[]))',
					[editId, user.user_id, assetIds]
				);

			if (['pdf', 'mp3', 'gallery'].includes(purpose)) {
				await client.query('UPDATE backlinks SET destination_url=$1 WHERE backlink_id=$2', [
					new URL(`/view/${slug}`, url.origin).href,
					backlinkId
				]);
			}
			if (assetIds.length)
				await client.query(
					'UPDATE campaign_assets SET campaign_id=$1 WHERE asset_id=ANY($2::uuid[]) AND user_id=$3',
					[result.rows[0].campaign_id, assetIds, user.user_id]
				);
			// Get author name for response
			const authorResult = await client.query(`SELECT name FROM users WHERE user_id = $1`, [
				user.user_id
			]);

			await client.query('COMMIT');

			// Return campaign with metadata
			return json({
				campaign: {
					...publicCampaign(result.rows[0]),
					public_token: slug,
					author_name: authorResult.rows[0].name
				}
			});
		} catch (err) {
			await client.query('ROLLBACK');
			throw err;
		} finally {
			client.release();
		}
	} catch (error) {
		console.error('Campaign creation error:', error);
		return json({ error: 'Failed to create campaign' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = POST;

export const DELETE: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const body = await request.json().catch(() => null);
	if (!validPublicId(body?.id) || body?.confirmation !== 'DELETE')
		return json({ error: 'Invalid deletion request' }, { status: 400 });
	const client = await db.getClient();
	try {
		await client.query('BEGIN');
		await client.query('SELECT pg_advisory_xact_lock($1)', [locals.user.user_id]);
		const result = await client.query(
			'SELECT campaign_id,backlink_id FROM campaigns WHERE public_id=$1 AND user_id=$2 FOR UPDATE',
			[body.id, locals.user.user_id]
		);
		const campaign = result.rows[0];
		if (!campaign) {
			await client.query('ROLLBACK');
			return json({ error: 'Campaign not found' }, { status: 404 });
		}
		const files = await client.query(
			'SELECT public_url FROM campaign_assets WHERE campaign_id=$1 AND user_id=$2 UNION ALL SELECT image_url AS public_url FROM campaign_qr_designs WHERE campaign_id=$1 AND user_id=$2',
			[campaign.campaign_id, locals.user.user_id]
		);
		if (files.rows.length)
			await del(
				files.rows.map((file) => file.public_url),
				{ token: env.BLOB_READ_WRITE_TOKEN }
			);
		await client.query('DELETE FROM campaigns WHERE campaign_id=$1 AND user_id=$2', [
			campaign.campaign_id,
			locals.user.user_id
		]);
		if (campaign.backlink_id)
			await client.query(
				'DELETE FROM backlinks WHERE backlink_id=$1 AND user_id=$2 AND NOT EXISTS (SELECT 1 FROM campaigns WHERE backlink_id=$1)',
				[campaign.backlink_id, locals.user.user_id]
			);
		await client.query('COMMIT');
		return json({ success: true });
	} catch {
		await client.query('ROLLBACK');
		return json(
			{ error: 'Could not delete campaign and its files. Please try again.' },
			{ status: 502 }
		);
	} finally {
		client.release();
	}
};
