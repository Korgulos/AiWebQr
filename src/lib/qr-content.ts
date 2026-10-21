export const contentTypes = [
	{ id: 'url', label: 'URL', symbol: '↗' },
	{ id: 'text', label: 'Text', symbol: 'T' },
	{ id: 'email', label: 'Email', symbol: '@' },
	{ id: 'phone', label: 'Phone', symbol: '☎' },
	{ id: 'sms', label: 'SMS', symbol: '✉' },
	{ id: 'wifi', label: 'Wi-Fi', symbol: '◎' },
	{ id: 'vcard', label: 'vCard', symbol: '▣' },
	{ id: 'location', label: 'Location', symbol: '⌖' }
] as const;
export type ContentType = (typeof contentTypes)[number]['id'];
export type ContentValues = Record<string, string>;
export type ContentField = {
	key: string;
	label: string;
	type?: string;
	placeholder?: string;
	wide?: boolean;
	options?: { value: string; label: string }[];
};
export const contentFields: Record<ContentType, ContentField[]> = {
	url: [
		{
			key: 'url',
			label: 'Website URL',
			type: 'url',
			placeholder: 'https://example.com',
			wide: true
		}
	],
	text: [
		{
			key: 'text',
			label: 'Your text',
			type: 'textarea',
			placeholder: 'Write the message your QR code should contain',
			wide: true
		}
	],
	email: [
		{
			key: 'email',
			label: 'Email address',
			type: 'email',
			placeholder: 'hello@example.com',
			wide: true
		},
		{ key: 'subject', label: 'Subject', wide: true },
		{ key: 'message', label: 'Message', type: 'textarea', wide: true }
	],
	phone: [
		{
			key: 'phone',
			label: 'Phone number',
			type: 'tel',
			placeholder: '+381 60 123 4567',
			wide: true
		}
	],
	sms: [
		{
			key: 'phone',
			label: 'Phone number',
			type: 'tel',
			placeholder: '+381 60 123 4567',
			wide: true
		},
		{ key: 'message', label: 'Message', type: 'textarea', wide: true }
	],
	wifi: [
		{ key: 'ssid', label: 'Network name (SSID)', wide: true },
		{ key: 'password', label: 'Network password', type: 'password', wide: true },
		{
			key: 'encryption',
			label: 'Security',
			type: 'select',
			options: [
				{ value: 'WPA', label: 'WPA / WPA2 / WPA3 Personal' },
				{ value: 'WEP', label: 'WEP' },
				{ value: 'nopass', label: 'Open network' }
			]
		},
		{
			key: 'hidden',
			label: 'Hidden network',
			type: 'select',
			options: [
				{ value: 'false', label: 'No' },
				{ value: 'true', label: 'Yes' }
			]
		}
	],
	vcard: [
		{ key: 'firstName', label: 'First name' },
		{ key: 'lastName', label: 'Last name' },
		{ key: 'organization', label: 'Company' },
		{ key: 'jobTitle', label: 'Job title' },
		{ key: 'phone', label: 'Phone number', type: 'tel' },
		{ key: 'email', label: 'Email address', type: 'email' },
		{ key: 'website', label: 'Website', type: 'url', wide: true },
		{ key: 'street', label: 'Street', wide: true },
		{ key: 'city', label: 'City' },
		{ key: 'postalCode', label: 'Postal code' },
		{ key: 'country', label: 'Country', wide: true }
	],
	location: [
		{ key: 'latitude', label: 'Latitude', type: 'number', placeholder: '44.7866' },
		{ key: 'longitude', label: 'Longitude', type: 'number', placeholder: '20.4489' }
	]
};
export function emptyContent(): ContentValues {
	const values: ContentValues = {};
	for (const fields of Object.values(contentFields))
		for (const field of fields) values[field.key] = '';
	return { ...values, encryption: 'WPA', hidden: 'false' };
}
const cardEscape = (value: string) =>
	value
		.replace(/\\/g, '\\\\')
		.replace(/\r\n|\r|\n/g, '\\n')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,');
const wifiEscape = (value: string) =>
	value.replace(/([\\;,:" ])/g, (match) => (match === ' ' ? match : `\\${match}`));
function website(value: string) {
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		throw new Error('Enter a complete URL starting with https:// or http://.');
	}
	if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
		throw new Error('Use an HTTP or HTTPS URL without embedded login details.');
	return url.href;
}
function email(value: string) {
	if (!/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(value.trim()))
		throw new Error('Enter a valid email address.');
	return value.trim();
}
function phone(value: string) {
	const number = value.replace(/[\s().-]/g, '');
	if (!/^\+?\d{3,20}$/.test(number))
		throw new Error('Enter a phone number, including the country code.');
	return number;
}
export function buildQRContent(type: ContentType, values: ContentValues): string {
	const get = (key: string) => values[key] || '';
	switch (type) {
		case 'url':
			return website(get('url'));
		case 'text':
			if (!get('text').trim()) throw new Error('Enter some text.');
			return get('text');
		case 'email': {
			const address = email(get('email'));
			const params = [
				get('subject') && `subject=${encodeURIComponent(get('subject'))}`,
				get('message') && `body=${encodeURIComponent(get('message'))}`
			].filter(Boolean);
			return `mailto:${address}${params.length ? '?' + params.join('&') : ''}`;
		}
		case 'phone':
			return `tel:${phone(get('phone'))}`;
		case 'sms':
			return `SMSTO:${phone(get('phone'))}:${get('message')}`;
		case 'wifi': {
			if (!get('ssid').trim()) throw new Error('Enter the Wi-Fi network name.');
			const security = get('encryption') || 'WPA';
			if (!['WPA', 'WEP', 'nopass'].includes(security))
				throw new Error('Select a supported Wi-Fi security type.');
			if (security !== 'nopass' && !get('password'))
				throw new Error('Enter the network password, or choose Open network.');
			return `WIFI:T:${security};S:${wifiEscape(get('ssid'))};${security !== 'nopass' ? 'P:' + wifiEscape(get('password')) + ';' : ''}H:${get('hidden') === 'true'};;`;
		}
		case 'vcard': {
			if (!get('firstName').trim() && !get('lastName').trim())
				throw new Error('Enter at least a first or last name.');
			const lines = [
				'BEGIN:VCARD',
				'VERSION:3.0',
				`N:${cardEscape(get('lastName'))};${cardEscape(get('firstName'))};;;`,
				`FN:${cardEscape([get('firstName'), get('lastName')].filter(Boolean).join(' '))}`
			];
			for (const [key, tag] of [
				['organization', 'ORG'],
				['jobTitle', 'TITLE']
			])
				if (get(key)) lines.push(`${tag}:${cardEscape(get(key))}`);
			if (get('phone')) lines.push(`TEL;TYPE=CELL:${phone(get('phone'))}`);
			if (get('email')) lines.push(`EMAIL:${email(get('email'))}`);
			if (get('website')) lines.push(`URL:${website(get('website'))}`);
			if (['street', 'city', 'postalCode', 'country'].some((key) => get(key)))
				lines.push(
					`ADR;TYPE=WORK:;;${cardEscape(get('street'))};${cardEscape(get('city'))};;${cardEscape(get('postalCode'))};${cardEscape(get('country'))}`
				);
			return [...lines, 'END:VCARD'].join('\r\n');
		}
		case 'location': {
			if (!get('latitude').trim() || !get('longitude').trim())
				throw new Error('Enter both latitude and longitude.');
			const lat = Number(get('latitude')),
				lon = Number(get('longitude'));
			if (
				!Number.isFinite(lat) ||
				Math.abs(lat) > 90 ||
				!Number.isFinite(lon) ||
				Math.abs(lon) > 180
			)
				throw new Error('Latitude must be between −90 and 90; longitude between −180 and 180.');
			return `geo:${lat},${lon}`;
		}
	}
}
export function contrastRatio(foreground: string, background: string): number {
	const luminance = (hex: string) => {
		const rgb = [1, 3, 5]
			.map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
			.map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
		return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
	};
	const a = luminance(foreground),
		b = luminance(background);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
