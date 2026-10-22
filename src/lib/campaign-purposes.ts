import { contentTypes, buildQRContent, type ContentType, type ContentValues } from './qr-content';
export const campaignPurposes = [
	...contentTypes.map((type) => ({
		...type,
		description: {
			url: 'Open a website with tracked visits.',
			text: 'Share a message.',
			email: 'Prepare an email.',
			phone: 'Start a phone call.',
			sms: 'Prepare a text message.',
			wifi: 'Connect to a wireless network.',
			vcard: 'Share contact details.',
			location: 'Share a map location.'
		}[type.id]
	})),
	{
		id: 'pdf',
		label: 'PDF document',
		symbol: '▤',
		description: 'Share a menu, brochure or document.'
	},
	{ id: 'mp3', label: 'MP3 audio', symbol: '♫', description: 'Open an audio player.' },
	{
		id: 'gallery',
		label: 'Image gallery',
		symbol: '▧',
		description: 'Show a collection of images.'
	}
] as const;
export type CampaignPurpose = (typeof campaignPurposes)[number]['id'];
export const isMedia = (purpose: string) => ['pdf', 'mp3', 'gallery'].includes(purpose);
export function prepareCampaign(purpose: string, values: ContentValues) {
	if (!campaignPurposes.some((type) => type.id === purpose))
		throw new Error('Choose a supported purpose');
	if (isMedia(purpose)) {
		const links = (values.media_urls || '')
			.split('\n')
			.map((value) => value.trim())
			.filter(Boolean);
		if (!links.length || links.length > (purpose === 'gallery' ? 12 : 1))
			throw new Error(purpose === 'gallery' ? 'Add 1–12 image links' : 'Add one file link');
		const media_urls = links.map((link) => {
			const url = new URL(link);
			if (url.protocol !== 'https:' || url.username || url.password)
				throw new Error('Use public HTTPS file links');
			return url.href;
		});
		return { payload: null, content: { media_urls }, destination: media_urls[0], tracked: true };
	}
	const payload = buildQRContent(purpose as ContentType, values);
	return {
		payload,
		content: {},
		destination: purpose === 'url' ? payload : null,
		tracked: purpose === 'url'
	};
}
