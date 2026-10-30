export const artisticExamples = [
	{
		id: 'ocean',
		title: 'Ocean waves',
		animated: false,
		description: 'Soft blue waves for a calm, static PNG design.'
	},
	{
		id: 'sunrise',
		title: 'Warm sunrise',
		animated: false,
		description: 'Warm geometric layers for a static PNG design.'
	},
	{
		id: 'ripple',
		title: 'Moving ripples',
		animated: true,
		description: 'Gentle purple rings for an animated GIF QR code.'
	},
	{
		id: 'confetti',
		title: 'Floating confetti',
		animated: true,
		description: 'Light green shapes for an animated GIF QR code.'
	}
].map((example) => ({
	...example,
	background: `/artistic-examples/${example.id}-background.${example.animated ? 'gif' : 'png'}`,
	preview: `/artistic-examples/${example.id}-qr.${example.animated ? 'gif' : 'png'}`
}));
