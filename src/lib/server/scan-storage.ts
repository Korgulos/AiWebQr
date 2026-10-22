import { db } from './db';
import type { ScanEvent } from './scan-analytics';

export async function recordScan(scan: ScanEvent, backlinkId: number) {
	const client = await db.getClient();
	try {
		await client.query('BEGIN');
		await client.query("SET LOCAL statement_timeout = '3s'");
		await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
			`${scan.campaign_id}:${scan.visitor_hash}`
		]);
		await client.query(
			`INSERT INTO scan_events
		 (request_id,campaign_id,backlink_id,occurred_at,visitor_hash,hash_key_version,method,user_agent,browser,os,device_type,referrer_host,origin_host,language,accept,client_hints,fetch_metadata,is_bot,bot_reason,is_rapid_repeat)
		 SELECT $1,c.campaign_id,b.backlink_id,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
		 EXISTS(SELECT 1 FROM scan_events s WHERE s.campaign_id=c.campaign_id AND s.visitor_hash=$5 AND s.occurred_at > $4::timestamptz - interval '10 seconds' AND s.occurred_at <= $4::timestamptz)
		 FROM campaigns c JOIN backlinks b ON b.backlink_id=c.backlink_id AND b.user_id=c.user_id
		 WHERE c.campaign_id=$2 AND b.backlink_id=$3
		 ON CONFLICT(request_id) DO NOTHING`,
			[
				scan.request_id,
				scan.campaign_id,
				backlinkId,
				scan.occurred_at,
				scan.visitor_hash,
				scan.hash_key_version,
				scan.method,
				scan.user_agent,
				scan.browser,
				scan.os,
				scan.device_type,
				scan.referrer_host,
				scan.origin_host,
				scan.language,
				scan.accept,
				JSON.stringify(scan.client_hints),
				JSON.stringify(scan.fetch_metadata),
				scan.is_bot,
				scan.bot_reason
			]
		);
		await client.query('COMMIT');
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
