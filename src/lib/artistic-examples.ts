export const artisticExamples = [
	{
		id: 'music-event',
		title: 'Music event',
		animated: true,
		description:
			'A looping equalizer for event screens. Replace the demo URL with your lineup or ticket page.'
	},
	{
		id: 'digital-invitation',
		title: 'Digital invitation',
		animated: true,
		description:
			'A gently moving floral border for digital invitations. Add your own RSVP link before sharing.'
	},
	{
		id: 'designer-portfolio',
		title: 'Designer portfolio',
		animated: false,
		description:
			'A geometric PNG for a business card or portfolio cover. Use your own portfolio URL and test the printed result.'
	},
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
