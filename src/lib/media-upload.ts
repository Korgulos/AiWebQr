export const MAX_MEDIA_BYTES = 3 * 1024 * 1024;
export function mediaSignature(
	bytes: Uint8Array,
	purpose: string
): { mime: string; extension: string } | null {
	const b = Buffer.from(bytes);
	if (purpose === 'pdf' && b.subarray(0, 5).toString() === '%PDF-')
		return { mime: 'application/pdf', extension: 'pdf' };
	if (
		purpose === 'mp3' &&
		((b.length > 10 && b.subarray(0, 3).toString() === 'ID3') ||
			(b.length > 4 && b[0] === 255 && (b[1] & 0xe0) === 0xe0 && (b[1] & 6) !== 0))
	)
		return { mime: 'audio/mpeg', extension: 'mp3' };
	if (purpose === 'gallery') {
		if (b.length > 24 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
			return { mime: 'image/png', extension: 'png' };
		if (b.length > 4 && b[0] === 255 && b[1] === 216 && b[2] === 255)
			return { mime: 'image/jpeg', extension: 'jpg' };
		if (
			b.length > 12 &&
			b.subarray(0, 4).toString() === 'RIFF' &&
			b.subarray(8, 12).toString() === 'WEBP'
		)
			return { mime: 'image/webp', extension: 'webp' };
	}
	return null;
}
