# JavaScript artistic QR verification

Verified locally on 2026-11-02. Not deployed by this change.

The artistic generator now runs qrcode-generator, gifuct-js and gifenc in a bundled Web Worker instead of loading Pyodide, Pillow and Python packages from external services. The production worker is approximately 40 kB before compression.

## Results

- `npm run check`: zero errors or warnings.
- `npm run test:qr`: all 10 checks pass.
- `npm run build`: passes (Windows sandbox required elevated execution for generated output directories).
- Browser: PNG generation, preview and download pass with a static portfolio background.
- Browser: GIF generation, preview and download pass with the music event background; an independent zxing-cpp decoder reads the correct URL from all 8 exported frames. Frame durations remain 180 ms and the loop remains infinite.
- Mobile layout: 390 × 844 browser viewport, 375 px content width and no document overflow. This is responsive viewport testing, not a physical phone or Safari test.
- Mobile browser workflow: uploaded a transparent 240 × 120 GIF with disposal modes 1/2/3, delays 70/120/180 ms and repeat count 2. All 3 output frames decode the exact Unicode text including Serbian characters and an emoji; timing and repeat metadata match.
- Production build preview: generated the music GIF and downloaded it successfully. First generation through visible preview took approximately 330 ms in this test; this is not a general performance guarantee.

Use `scripts/verify-artistic-export.py output.gif --payload URL --background original.gif` to validate actual browser downloads independently.

## Limits

Requires a current browser with OffscreenCanvas and createImageBitmap. The worker has a 60-second termination timeout, a 4-megapixel input limit, a 180-frame limit and a 100-million-source-pixel animation limit. Large GIFs show an error rather than generating indefinitely. Output styling differs from the original Segno implementation. Physical iOS/Android camera and download behavior still require device testing. Automated decoding of test files does not guarantee that every custom background will scan.

The root cause of the old browser's external Python loading stall was not established; removing those runtime dependencies avoids that loading path.
