# QR Gen Me

SvelteKit 2 / Svelte 5 QR generator, hosted on Vercel. Standard QR codes are generated in the browser with `qr-code-styling`; Artistic QR uses Pyodide, Segno and Pillow, loaded only when generating an artistic code.

## Local development

Use Node.js 22 and install the locked dependencies:

```sh
npm ci
cp .env.example .env
npm run dev
```

Set `DATABASE_URL` to the existing Neon PostgreSQL connection string and `JWT_SECRET` to a unique random secret (at least 32 bytes). Keep real credentials out of Git. Authentication fails closed when the JWT secret is missing. The existing `users`, `campaigns`, `campaign_comments`, `backlinks` and `backlink_clicks` tables are required for account and campaign features.

The untracked Drizzle scaffold is separate from the existing SQL data layer in `src/lib/server/db.ts`; do not push its placeholder schema to the production database.

## Validation

```sh
npm run check
npm test
npm run build
npm run preview
```

The security tests execute the actual route handlers with an isolated secret and mocked database operations. They verify session issuance, protected cookies, input validation, campaign ownership, cross-origin protections, safe redirects and retirement of the diagnostic user-list endpoint. They never read or modify the production database. A real account/database integration test remains necessary before a production release.

## Sessions and deployment

Sessions use HttpOnly, SameSite=Lax cookies (Secure in production). Passwords and bearer tokens are not returned to browser storage. Legacy localStorage authentication is removed on page load; existing users must sign in again after this update. Logout identifies the user from the verified session.

`/api/data` is retired and returns 404. Campaigns and their comments are private to their owner. New campaigns require an HTTP(S) destination URL. Existing campaigns whose destination points back to the old incomplete redirect route return 410 rather than a redirect loop; their destinations need to be repaired before reusing those QR codes.

Vercel uses the existing SvelteKit adapter auto-detection. Ensure `DATABASE_URL` and `JWT_SECRET` are configured for the intended deployment environment, then test a preview before releasing production. No database migration is required for these changes.

## Artistic QR dependencies

The `pyodide` dependency is pinned to 0.27.7 and must match the version in the CDN `indexURL`. Segno and qrcode-artistic are also pinned in the generator. The initial generation requires network access to jsDelivr and PyPI. Uploaded images are processed in the browser and limited to 5 MB (2 MB for standard QR logos). Always scan the final QR design, particularly with logos or artistic backgrounds, before printing.

## GIF web imports and GIPHY search

The Artistic QR page can import a direct HTTPS GIF link (up to 5 MB) in the browser, without cookies or a server-side media proxy. The source must permit cross-origin fetching; otherwise users can download the file and upload it. Selected backgrounds can be previewed and removed before generating the QR code.

To enable the embedded GIPHY search grid, create a web API key in the GIPHY developer dashboard and configure `PUBLIC_GIPHY_API_KEY` in the target environment. This is a public browser key by design. GIPHY requests and media loads go directly from the client to GIPHY, preserve provider URLs and result order, and display provider attribution. Search stays unavailable until a key is configured; direct media-link imports continue working. A collection URL such as `/explore/free` is a browsing link, not a GIF file. With the key configured, individual GIPHY page links can also be resolved via the API.

GIF availability and permissions depend on the original provider and creator; a search for “free” is not a blanket content license.

Artistic backgrounds are center-cropped to a square before QR compositing, so the shorter side fills the active QR area without stretching. Animated frame durations and loop counts are preserved. Run `python3 scripts/test-artistic-background.py` with Pillow installed to verify portrait/landscape cropping and animation metadata.

## Standard QR generator

The shared generator on the homepage and `/qr-gen` supports URL, plain text, email, phone, SMS, Wi-Fi, vCard 3.0 and geographic coordinates. Content is serialized and validated locally. Colors support linear/radial gradients, transparent backgrounds and independent eye colors, with a contrast hint. Body, eye-frame and eye-center shapes can be changed independently. Logos have size, padding and background-dot controls; five templates provide a starting point. Export resolution ranges from 200 to 2000 px for PNG; SVG stays scalable.

Run `npm run test:qr` for content format, escaping and validation checks. Scan downloaded codes on the target device, particularly Wi-Fi and contact codes, because scanner support varies. Standard generator changes share the same component on both routes; the Artistic QR flow is separate.
