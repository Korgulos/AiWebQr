import { createHmac, randomUUID } from 'node:crypto';

const cut = (value: string | null, length = 256) => value?.slice(0, length) || null;
const host = (value: string | null) => {
	try {
		return value ? new URL(value).hostname.slice(0, 253) : null;
	} catch {
		return null;
	}
};

/** Allowlisted request metadata only. IP is consumed for HMAC, never returned. */
export function collectScan(
	request: Request,
	ip: string,
	secret: string,
	campaignId = 1,
	now = new Date()
) {
	if (secret.length < 32) throw new Error('Analytics secret must contain at least 32 characters');
	const h = request.headers;
	const ua = cut(h.get('user-agent'), 512) || '';
	const day = now.toISOString().slice(0, 10);
	const browser = /Edg\//i.test(ua)
		? 'Edge'
		: /Firefox\//i.test(ua)
			? 'Firefox'
			: /Chrome\//i.test(ua)
				? 'Chrome'
				: /Safari\//i.test(ua)
					? 'Safari'
					: 'Unknown';
	const os = /Android/i.test(ua)
		? 'Android'
		: /iPhone|iPad/i.test(ua)
			? 'iOS'
			: /Windows/i.test(ua)
				? 'Windows'
				: /Macintosh/i.test(ua)
					? 'macOS'
					: /Linux/i.test(ua)
						? 'Linux'
						: 'Unknown';
	const bot = /bot|crawler|spider|preview|facebookexternalhit|curl|wget/i.test(ua);
	const purpose = cut(h.get('sec-purpose') || h.get('purpose'));
	return {
		request_id: randomUUID(),
		campaign_id: campaignId,
		occurred_at: now.toISOString(),
		visitor_hash: createHmac('sha256', secret)
			.update(JSON.stringify([day, campaignId, ip, ua]))
			.digest('hex'),
		hash_key_version: 'v1-daily',
		method: request.method,
		user_agent: ua || null,
		browser,
		os,
		device_type: /iPad|Tablet/i.test(ua)
			? 'tablet'
			: /Mobi|Android|iPhone/i.test(ua)
				? 'mobile'
				: ua
					? 'desktop'
					: 'unknown',
		referrer_host: host(h.get('referer')),
		origin_host: host(h.get('origin')),
		language: cut(h.get('accept-language')),
		accept: cut(h.get('accept')),
		client_hints: {
			brands: cut(h.get('sec-ch-ua')),
			mobile: cut(h.get('sec-ch-ua-mobile')),
			platform: cut(h.get('sec-ch-ua-platform'))
		},
		fetch_metadata: {
			site: cut(h.get('sec-fetch-site')),
			mode: cut(h.get('sec-fetch-mode')),
			destination: cut(h.get('sec-fetch-dest')),
			purpose
		},
		is_bot: bot || /prefetch|preview/i.test(purpose || ''),
		bot_reason: bot
			? 'user-agent heuristic'
			: /prefetch|preview/i.test(purpose || '')
				? 'prefetch/preview'
				: null,
		is_rapid_repeat: false
	};
}

export type ScanEvent = ReturnType<typeof collectScan>;

export function appendScan(events: ScanEvent[], event: ScanEvent) {
	if (events.some((row) => row.request_id === event.request_id)) return false;
	event.is_rapid_repeat = events.some(
		(row) =>
			row.campaign_id === event.campaign_id &&
			row.visitor_hash === event.visitor_hash &&
			Date.parse(event.occurred_at) >= Date.parse(row.occurred_at) &&
			Date.parse(event.occurred_at) - Date.parse(row.occurred_at) < 10000
	);
	events.push(event);
	return true;
}

export function summarizeScans(events: ScanEvent[]) {
	const human = events.filter((row) => !row.is_bot);
	return {
		total: events.length,
		human: human.length,
		bots: events.length - human.length,
		daily_visitors: new Set(human.map((row) => row.visitor_hash)).size,
		rapid_repeats: human.filter((row) => row.is_rapid_repeat).length
	};
}
