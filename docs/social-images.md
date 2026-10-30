# Social images and lightweight QR example

- The generator uses `/artistic-examples/ripple-qr.gif` (80,397 bytes) instead of the old 3,470,411-byte `QrInfo.gif`: 97.7% fewer image bytes.
- The complete 328 × 328 QR is displayed without cropping. Reduced-motion visitors receive `ripple-poster.png` through a `<picture>` source.
- Five PNG social cards in `static/og/` are 1200 × 630: home, artistic, wifi, vcard and logo. `home-square.png` is a supplementary 1080 × 1080 variant.
- Public-route Open Graph and Twitter large-image metadata are emitted by `src/routes/+layout.svelte`, with absolute URLs, image dimensions, MIME type and alternative text. Authenticated and private pages retain noindex and do not emit these public previews.
- Regenerate the cards with `python scripts/generate-social-images.py` using Pillow and the Noto Sans Regular/Bold fonts under `/usr/share/fonts/noto/`. Original QR artwork comes from `scripts/generate-artistic-examples.py`.
- Verified all eight GIF frames and all six card QR images decode to `https://www.qr-gen-me.com/`. Social platforms may cache an existing link preview until they fetch it again.
