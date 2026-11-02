import { defaultArtisticStyle } from './style.js';
import type { ArtisticOptions, ArtisticRequest } from './types.js';
export { artisticContrast, defaultArtisticStyle } from './style.js';
export type { ArtisticStyle } from './style.js';
export type { ArtisticOptions } from './types.js';

/** Browser-only generation. Importing this module during SSR is safe. */
export async function generateArtisticQR(options: ArtisticOptions): Promise<Blob> {
 if (typeof Worker === 'undefined') throw new Error('Artistic QR generation requires a browser with Web Workers.');
 if (options.signal?.aborted) throw new DOMException('Generation aborted.', 'AbortError');
 if (typeof options.text !== 'string' || !options.text.trim() || options.text.length > 2000)
  throw new Error('Enter a link or text of up to 2000 characters.');
 const scale = options.scale ?? 4;
 const dotSize = options.dotSize ?? 62.68;
 const timeout = options.timeoutMs ?? 60000;
 if (!Number.isFinite(scale) || scale < 3 || scale > 10) throw new Error('Scale must be between 3 and 10.');
 if (!Number.isFinite(dotSize) || dotSize < 25 || dotSize > 100) throw new Error('Dot size must be between 25 and 100.');
 if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('Timeout must be a positive number.');
 const style = { ...defaultArtisticStyle, ...options.style };
 if (!['square', 'rounded', 'circle'].includes(style.frame) || !['square', 'circle'].includes(style.center))
  throw new Error('Choose a valid marker shape.');
 if (![style.dark, style.light, style.frameColor, style.centerColor].every(c => /^#[0-9a-f]{6}$/i.test(c)))
  throw new Error('Colors must use six-digit hexadecimal notation.');
 {
  const background = options.background ?? null;
  const request: ArtisticRequest = {
   text: options.text, background, scale, dotSize, style,
   animated: options.animated ?? (options.background instanceof Blob && options.background.type === 'image/gif')
  };
  return await new Promise<Blob>((resolve, reject) => {
   const worker = new Worker(options.workerUrl ?? new URL('./worker.js', import.meta.url), { type: 'module' });
   const finish = () => { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); worker.terminate(); };
   const abort = () => { finish(); reject(new DOMException('Generation aborted.', 'AbortError')); };
   const timer = setTimeout(() => { finish(); reject(new Error('Generation timed out. Try a smaller image or GIF.')); }, timeout);
   options.signal?.addEventListener('abort', abort, { once: true });
   worker.onmessage = ({ data }) => {
    if (data.progress) {
     try { options.onProgress?.(data.progress); } catch (error) { finish(); reject(error); }
     return;
    }
    finish();
    if (data.error) reject(new Error(data.error)); else resolve(data.blob);
   };
   worker.onerror = () => { finish(); reject(new Error('Unable to run image worker. Check browser support, worker URL and CSP.')); };
   worker.onmessageerror = () => { finish(); reject(new Error('Unable to read image worker response.')); };
   try { worker.postMessage(request); } catch (error) { finish(); reject(error); }
  });
 }
}
