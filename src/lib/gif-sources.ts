const maxGifBytes = 5 * 1024 * 1024;

export function parseGifLink(value: string): { url: URL; giphyId: string | null } {
	let url: URL;
	try {
		url = new URL(value.trim());
	} catch {
		throw new Error('Paste a complete HTTPS link to a GIF.');
	}
	if (url.protocol !== 'https:' || url.username || url.password) {
		throw new Error('Use an HTTPS GIF link without embedded login details.');
	}
	const giphyPage = ['giphy.com', 'www.giphy.com'].includes(url.hostname);
	if (!giphyPage) return { url, giphyId: null };
	const match = url.pathname.match(/^\/(?:gifs|stickers)\/([a-zA-Z0-9-]+)\/?$/);
	if (!match)
		throw new Error('This is a GIPHY collection page. Open a GIF and copy its GIF link instead.');
	return { url, giphyId: match[1].split('-').at(-1)! };
}

export async function fetchGifBlob(
	url: string,
	signal: AbortSignal,
	fetcher: typeof fetch = fetch
): Promise<Blob> {
	// Fetch in the browser without cookies; no server proxy or media storage.
	const response = await fetcher(url, {
		signal,
		credentials: 'omit',
		referrerPolicy: 'no-referrer',
		cache: 'no-store'
	});
	if (!response.ok)
		throw new Error('This GIF could not be loaded. Try another GIF link or upload the file.');
	const length = Number(response.headers.get('content-length'));
	if (length > maxGifBytes) {
		await response.body?.cancel();
		throw new Error('Choose a GIF smaller than 5 MB.');
	}
	if (!response.body) throw new Error('This link did not return a GIF file.');
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maxGifBytes) {
				await reader.cancel();
				throw new Error('Choose a GIF smaller than 5 MB.');
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.length;
	}
	const signature = new TextDecoder().decode(bytes.subarray(0, 6));
	if (signature !== 'GIF87a' && signature !== 'GIF89a') {
		throw new Error(
			'This is a webpage or another file type. Copy the direct GIF link, or upload the GIF file.'
		);
	}
	return new Blob([bytes.buffer], { type: 'image/gif' });
}
