# AiWebQr · QR Gen Me

QR Gen Me is a SvelteKit application for creating standard and artistic QR codes, managing campaigns, and tracking visits to campaign links. The repository is named `aiwebqr`; the public application is [qr-gen-me.com](https://www.qr-gen-me.com).

Built with SvelteKit 2, Svelte 5, TypeScript, Tailwind CSS and Vite. PostgreSQL stores accounts, campaigns and analytics; Vercel Blob stores uploaded campaign files and saved QR images. Deployment uses Vercel through `@sveltejs/adapter-auto`.

## Features

### Standard QR codes

The shared generator on the homepage and `/qr-gen` supports URL, plain text, email, phone, SMS, Wi-Fi, vCard 3.0 and geographic coordinates. Generation and content validation happen in the browser using `qr-code-styling`.

Customize body and eye shapes, independent eye colors, linear/radial gradients, transparent backgrounds and logos. Five templates provide starting designs. Export PNG at 200–2000 px or scalable SVG. Logo uploads are limited to 2 MB. Standalone generation does not require an account.

### Artistic QR codes

`/arte-qr-gen` combines QR content with static images or animated GIF backgrounds and exports PNG or GIF. A bundled JavaScript Web Worker uses qrcode-generator, gifuct-js and gifenc; generation does not download Python, packages from PyPI or runtime files from a CDN. Processing requires a current browser with OffscreenCanvas and createImageBitmap support. GIF frame timing and loop counts are retained, including disposal handling. Generation has a 60-second timeout; backgrounds are limited to 4 megapixels and animations to 180 frames / 100 million source pixels across frames. These limits produce a visible error rather than unbounded processing.

Background uploads and direct HTTPS GIF imports are limited to 5 MB. Remote sources must permit cross-origin fetching. Optional GIPHY search requires `PUBLIC_GIPHY_API_KEY`; direct GIF imports work without it. Images are center-cropped to a square, and GIF frame durations and loop counts are preserved. Provider search results do not imply a content license.

### Campaigns and saved designs

Signed-in users can create and edit campaigns, manage status and expiration, add private comments, and view campaign details. Eleven purposes are supported: the eight standard content types plus PDF, MP3 and image gallery.

- URL campaigns encode a tracked redirect link. PDF, MP3 and gallery campaigns use the same tracking entry point and open a public media page at `/view/[id]`.
- Text, email, phone, SMS, Wi-Fi, vCard and location campaigns encode content directly. Scanning these codes does not contact the server, so scans cannot be measured.
- Tracked links keep their public token when content changes. Direct content changes require generating and distributing a new QR image.
- Media can use public HTTPS links or uploads to Vercel Blob. Uploads accept PDF, MP3, PNG, JPEG and WebP, up to 3 MB per file; galleries contain up to 12 images. Uploaded media is limited to 100 files / 100 MB per account.
- Both generators can save PNG/GIF snapshots to a campaign. Limits are 3 MB per image, 50 designs per campaign, and 100 designs / 100 MB per account gallery. Existing snapshots do not regenerate when campaign content changes.

Campaign details and authenticated APIs use public UUIDs with owner checks. Tracking tokens are separate from campaign UUIDs. Blob image/file URLs are public even though campaign management and saved-design listings require authentication.

### Accounts and analytics

Email/password registration and login use bcrypt and signed JWT sessions in HttpOnly, SameSite=Lax cookies, with Secure enabled in production. Google and Microsoft sign-in appear when their credentials are configured. Matching email addresses require proof of account ownership before linking providers. See [social sign-in setup](docs/social-sign-in.md).

Account settings support profile details, username, a cropped avatar, provider connections, password changes and account deletion. Password changes invalidate older sessions through a stored session version. Password changes and deletion currently require a password, which limits those actions for social-only accounts.

The homepage dashboard and campaign details show scan summaries, daily activity and device information. Collection requires `ANALYTICS_SECRET`; valid redirects continue working if analytics is disabled or a write fails. Only GET requests count, and inactive or expired links are rejected. Analytics identifies bots and rapid repeats, and uses daily, campaign-specific HMAC visitor identifiers instead of storing raw IP addresses. Visitor counts are estimates, not unique people across an entire month. Visible dates and daily buckets use the browser's time zone; visitor identifiers rotate at UTC day boundaries.

## Local development

Use Node.js 22 and npm with the committed lockfile:

```sh
npm ci
cp .env.example .env
```

Configure a development database and secrets, then start the app:

```sh
npm run dev
```

Vite normally serves the application at `http://localhost:5173`. `.env.local` can override `.env`; check which database is selected before running database scripts. Keep credentials out of Git.

### Environment variables

| Variable                                         | Purpose                                                                                                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                   | PostgreSQL connection string for account, campaign and analytics features.                                                                                |
| `JWT_SECRET`                                     | Unique random session-signing secret of at least 32 bytes. Authentication fails closed if missing.                                                        |
| `ANALYTICS_SECRET`                               | Separate server-only secret, at least 32 random characters. Empty disables scan collection.                                                               |
| `BLOB_READ_WRITE_TOKEN`                          | Server-only Vercel Blob credential for media uploads, saved QR snapshots and Blob cleanup. Add it manually; it is not currently listed in `.env.example`. |
| `PUBLIC_GIPHY_API_KEY`                           | Optional public browser key for embedded GIPHY search.                                                                                                    |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`       | Optional Google sign-in credentials.                                                                                                                      |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | Optional Microsoft sign-in credentials.                                                                                                                   |

OAuth callbacks are `/api/auth/google/callback` and `/api/auth/microsoft/callback`. Register the exact origin and path with each provider and use separate development and production credentials.

### Database setup and migrations

The application uses parameterized SQL through `pg` in `src/lib/server/db.ts`. `.schema.sql` contains the legacy base schema; the versioned SQL files in `migrations/` extend it. The migration runner assumes the base tables already exist and is not a blank-database bootstrap tool.

For an existing development database, review and apply missing migrations in order using:

```sh
node scripts/migrate-development.mjs 001_backend_v2
node scripts/migrate-development.mjs 002_account_settings
node scripts/migrate-development.mjs 003_campaign_purposes
node scripts/migrate-development.mjs 004_public_ids
node scripts/migrate-development.mjs 005_campaign_qr_gallery
node scripts/migrate-development.mjs 006_social_accounts
```

Each invocation selects one migration. The runner uses transactions, an advisory lock and a checksum ledger; unchanged applied migrations are skipped. It also creates a local analytics secret if absent. Never edit an applied migration. Verify the target database and existing migration state before execution; historical deployment notes are not a live schema inventory.

The separate Drizzle scaffold in `src/lib/server/db/` contains a placeholder `user` table and does not model the application schema. Do not use `npm run db:push` or the Drizzle migration commands to synchronize the application database. See [migration notes](migrations/README.md) for implementation history.

## Validation

```sh
npm run check
npm test
npm run build
npm run preview
```

`npm test` runs security, QR content and social-auth tests with isolated or mocked dependencies; it does not validate a real deployment or provider consent flow. Additional focused checks:

```sh
npm run test:qr
node scripts/test-scan-analytics.mjs
node scripts/test-local-time.mjs
python3 scripts/test-artistic-background.py
```

The Python check requires Pillow. It covers portrait/landscape cropping and GIF animation metadata.

The `test-development-account.mjs`, `test-development-analytics.mjs`, `test-development-upload.mjs` and `test-development-social.mjs` scripts exercise real development resources, create temporary fixtures and clean them up. Run them only after verifying the development database and required storage configuration; they are not part of `npm test`. Production inspection, migration and configuration scripts in `scripts/` are operational tools, not local setup steps.

Always scan exported QR codes on target devices before distribution, especially artistic codes, logos, Wi-Fi and contact payloads.

## Deployment and current limits

Configure environment variables for the intended Vercel environment, apply reviewed missing SQL migrations to that environment's database, and verify a preview before production release. Uploads and saved designs require a public Vercel Blob store. Verify each configured OAuth provider through a full browser sign-in flow.

Email verification and password recovery are not implemented. The schema includes session/token tables, but authentication currently uses JWT cookies with user session-version checks. Scan retention and scheduled aggregation jobs are not wired; analytics queries scan events directly. Geographic scan data remains unavailable without trusted platform metadata. Individual saved-design deletion is not implemented; account deletion includes managed Blob cleanup. `/analytics-draft` is an experimental page, and the retired `/api/data` endpoint returns 404.
