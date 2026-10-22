export async function saveCampaignQR(
	campaign: string,
	mode: 'standard' | 'artistic',
	file: Blob,
	content: string
) {
	const form = new FormData();
	form.set('campaign', campaign);
	form.set('mode', mode);
	form.set('content', content);
	form.set('file', file, `qr.${file.type === 'image/gif' ? 'gif' : 'png'}`);
	const response = await fetch('/api/campaigns/designs', { method: 'POST', body: form });
	const result = await response.json();
	if (!response.ok) throw new Error(result.error || 'Could not save QR');
}
