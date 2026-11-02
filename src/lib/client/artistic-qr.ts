import type { ArtisticStyle } from '../artistic-style';
export type ArtisticRequest = {
	text: string;
	background: string | null;
	scale: number;
	dotSize?: number;
	style?: ArtisticStyle;
	animated: boolean;
};

/** Keep decoding and GIF encoding off the UI thread; terminate stalled work. */
export function generateArtisticImage(
	request: ArtisticRequest,
	progress: (message: string) => void
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./artistic-qr.worker.ts', import.meta.url), {
			type: 'module'
		});
		const timer = setTimeout(() => {
			worker.terminate();
			reject(new Error('Generation timed out. Try a smaller image or a shorter GIF.'));
		}, 60000);
		const finish = () => {
			clearTimeout(timer);
			worker.terminate();
		};
		worker.onmessage = ({ data }) => {
			if (data.progress) {
				progress(data.progress);
				return;
			}
			finish();
			if (data.error) reject(new Error(data.error));
			else resolve(data.blob);
		};
		worker.onerror = () => {
			finish();
			reject(new Error('Unable to start image tools. Try a current browser.'));
		};
		worker.postMessage(request);
	});
}
