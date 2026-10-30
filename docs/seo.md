# Search visibility

## Technical baseline — 25 October 2026

Production canonical origin: `https://www.qr-gen-me.com`.

- Public indexable pages: `/`, `/arte-qr-gen`, `/privacy`,
  `/wifi-qr-code-generator`, `/vcard-qr-code-generator`, `/qr-code-with-logo`.
- `/sitemap.xml` lists these pages only. No fabricated modification dates.
- `/robots.txt` advertises the sitemap and excludes `/api/` from crawling.
- Public pages have canonical URLs without query parameters and distinct descriptions.
- Other application pages and authenticated views use `noindex, nofollow`.
  They remain crawlable so search engines can read that instruction; this is not access control.
- Homepage title and visible H1 describe the free QR code generator.
- Google Search Console HTML verification belongs to `katicod100@gmail.com`,
  approved by the site operator. Keep the public verification meta tag in `src/app.html`.

Production deployment `dpl_GVPZFUMsWsRkEA4e5zxQLYCw3JPX` is Ready.
Public HTTP checks passed for all three public pages, login, robots and sitemap.
Google confirmed ownership using the HTML meta tag on 25 October 2026.
Search Console fetched the original sitemap successfully and discovered its three pages.
The sitemap now includes six public URLs after adding the dedicated QR tools.
URL Inspection confirmed the homepage is already indexed ("URL is on Google").
The initial inspection returned a transient Google error; one retry succeeded.
Google accepted the reindexing request and added the updated homepage to its
priority crawl queue. Performance reports are still processing; Search Console
asks to check again after a day or more. No ranking improvement is claimed yet.
Use Search Console Performance filtered by `qr code generator` to measure impressions,
clicks and average position by country/device. Search results alone do not establish
an exact ranking or prove that a URL is absent from the index.

These changes help discovery and clarify page content; they do not guarantee indexing
or a ranking. Future content should explain actual supported workflows and features.

## Dedicated generators

The three new landing pages share the existing browser-side QR generator. Wi-Fi
and vCard initialize the corresponding form; the logo page initializes URL mode
and opens the logo section. Route changes remount the generator to reset the form.
Each page has its own title, description, H1, instructions, example, limitations,
FAQ and links to related tools. The homepage links all three pages.

Verification: eight QR content checks, Svelte type checks and production build passed.
Anonymous local HTTP checks confirmed indexable SSR content, canonical URLs, one H1,
correct starting fields, homepage links and all six sitemap entries. Browser checks
confirmed vCard rendering and enabled export, correct route changes and visible logo
upload. Browser download events timed out; saving a PNG was not independently confirmed.

## Artistic gallery — 27 October 2026

The Artistic page now includes four original geometric QR examples (two PNGs,
two animated GIFs), background reuse buttons, a format comparison, scanning tips
and FAQs. GIF previews use static posters when reduced motion is requested.
All examples encode `https://www.qr-gen-me.com/`; reuse keeps any destination
already entered by the visitor. Static assets are small and gallery images load lazily.

Reproduce examples with `scripts/generate-artistic-examples.py` using an isolated
Python environment with segno 1.6.6, qrcode-artistic 3.0.2, Pillow and zxing-cpp.
The script decodes every generated frame before accepting the example files.
All 18 example frames passed. A real browser-generated GIF from the ripple background
also passed decoding for all eight frames.

GIPHY defaults now use the client-side Trending endpoint with rating `g`, 12 items
per group, a random initial group and a rotating session-local page. Reopening moves
to the next group; Show more GIFs changes groups without automatically moving items
under the pointer. Explicit search terms still use Search and have paginated results.
Only the group number is kept in sessionStorage; no new tracking identifier is added.
Provider documentation: https://developers.giphy.com/docs/api/

Verification: 10 QR/content/discovery checks, 20 security checks, type checks and
production build passed. Browser checks confirmed different GIPHY groups, example
selection, animated generation and no console errors during those flows.
