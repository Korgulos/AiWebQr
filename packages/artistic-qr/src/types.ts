import type { ArtisticStyle } from './style.js';
export type ArtisticRequest = {
 text: string;
 background: Blob | string | null;
 scale: number;
 dotSize?: number;
 style?: ArtisticStyle;
 animated: boolean;
};
export type ArtisticOptions = {
 text: string;
 /** A local File/Blob, or a URL allowing cross-origin access. */
 background?: Blob | string | null;
 scale?: number;
 dotSize?: number;
 style?: Partial<ArtisticStyle>;
 /** Defaults to true for image/gif Blobs; set explicitly for GIF URLs. */
 animated?: boolean;
 onProgress?: (message: string) => void;
 signal?: AbortSignal;
 timeoutMs?: number;
 /** Override for bundlers/CSP: serve the exported worker.js from the same origin. */
 workerUrl?: string | URL;
};
