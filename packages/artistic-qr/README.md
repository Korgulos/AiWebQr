# Artistic QR â€” unpublished preview

Framework-independent TypeScript library for browser PNG and animated GIF QR
generation. No Python runtime, CDN scripts or server-side image processing.

## Build and install locally

Run these commands inside this directory:

```sh
npm install
npm run build
npm test
npm pack
```

Install the resulting archive in another project with npm, pnpm or Yarn:

```sh
npm install ./artistic-qr-0.1.0.tgz
```

## Usage

```ts
import { generateArtisticQR } from 'artistic-qr';

const blob = await generateArtisticQR({
  text: 'https://example.com/',
  background: fileInput.files[0], // optional File/Blob or URL
  scale: 4,
  dotSize: 62.68,
  style: { frame: 'rounded', center: 'circle', dark: '#000000' },
  onProgress: console.log
});
const url = URL.createObjectURL(blob);
preview.src = url;
download.href = url;
download.download = blob.type === 'image/gif' ? 'qr.gif' : 'qr.png';
// Revoke url when no longer needed.
```

- `scale`: pixels per module, 3â€“10; default 4.
- `dotSize`: 25â€“100; default 62.68.
- `animated`: inferred from image/gif Blob MIME type. Set explicitly for GIF URLs.
- `signal`: AbortSignal to cancel and terminate the worker.
- `timeoutMs`: positive timeout in milliseconds; default 60000.
- `workerUrl`: override the worker asset URL when required by your bundler.
- Style: frame square/rounded/circle; center square/circle; dark, light,
  frameColor and centerColor accept six-digit hexadecimal colors.

Exports also include `artisticContrast`, `defaultArtisticStyle`, and TypeScript
types. Contrast checks color pairs only, not pixels in an image or animation.
Always scan the final file on real phones.

## Browser and worker deployment

Importing during SSR is safe; generation requires a modern browser with Workers,
OffscreenCanvas, createImageBitmap and roundRect. Node rendering, CommonJS and SVG
output are not supported. The worker includes all runtime dependencies.

Direct static ESM works with dist/index.js and dist/worker.js served together.
Bundlers handle worker assets differently: copy the exported
`artistic-qr/worker.js` into your public directory if necessary and pass
`workerUrl: '/artistic-qr.worker.js'`. Allow the worker URL in CSP worker-src.
Remote background URLs require CORS and appropriate connect-src permission.
Local File/Blob processing does not upload the source image.

Limits: 5 MiB background, 4 MP source image, 180 GIF frames and 100 million total
source pixels. Images are center cropped to a square with a four-module quiet
zone. GIF frame delays, disposal and repeat metadata are preserved.

Serve this directory over HTTP and open `/examples/` for
the plain HTML demo. file:// is not supported.

## Before publishing

Package name: artistic-qr, version 0.1.0. Licensed under MIT (see LICENSE).
Bundled dependency licenses are retained in THIRD_PARTY_NOTICES.txt.
Name availability on npm has not been verified. This package is independently
implemented in JavaScript; it is not a port of, or affiliated with, Python Segno.
It supports standard QR Codes, not Micro QR Codes or Segno's full feature set.

Check name availability, clean installation and target bundlers/mobile browsers,
then review `npm pack --dry-run` before
publishing. See [npm publishing docs](https://docs.npmjs.com/cli/commands/npm-publish/).

This preview is separate from the production site's current generator.
