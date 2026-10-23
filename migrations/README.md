# Development backend migration

006_social_accounts.sql adds provider/subject identities for Google and Microsoft.
Matching email never links accounts automatically. The development migration and
fixture test can run independently of provider credentials. See docs/social-sign-in.md
for provisioning, activation, scopes and current account-management limitations.
Migration 006 has been applied to development and production. Temporary development
fixtures validated identity creation, repeat login, collision rejection and explicit linking.

Visible timestamps and expiry editors use the browser's local time zone. Expiry
inputs convert local wall time to ISO UTC for storage. Dashboard daily buckets use
the validated qr_timezone cookie populated by the browser; campaign analytics gets
the browser's IANA zone explicitly. No timestamps are rewritten in the database.
Visitor HMAC identifiers still rotate on UTC boundaries, so unique visitor metrics
remain approximate. Time conversion tests cover winter/summer offset and DST.

005_campaign_qr_gallery.sql stores per-campaign generated PNG/GIF snapshots in Blob
with owner-scoped SQL metadata and random UUID paths. Both design tools expose
Save to campaign in step 3 and campaign details. Saved-image listing is authenticated;
image URLs themselves are public, explicitly disclosed at save time. No raw payload
is stored in gallery metadata; a SHA-256 digest records which content was encoded.
The save endpoint checks the submitted content against current campaign content.
Changing content never regenerates old saved images. Limits: 3 MB/image, 50 designs
per campaign, 100 designs/100 MB per user gallery. Account deletion cleans both media
and QR snapshot blobs. Individual design removal/retention is not yet implemented.
The real-development upload test covers PNG and GIF storage, listing ownership,
preview reads and cleanup of all fixture files.

004_public_ids.sql adds independently random public UUIDs to campaigns, users and
saved QR rows, preserving all integer primary/foreign keys internally. Campaign
detail URLs and authenticated APIs accept UUIDs only. Numeric routes intentionally
return 404/400 and old bookmarks must be opened again from the list/dashboard.
Campaign responses strip internal owner/backlink IDs and serialize campaign_id as
the public UUID for client compatibility. Profile responses omit internal user ID
and session version. Tracking slugs stay unchanged. New Blob paths contain a random
asset UUID, without an owner number. The development inventory found zero legacy
managed blobs containing numeric owner paths. Signed server session claims still
use the internal ID for lookup; they do not grant access without signature/version
verification. Public IDs are not a substitute for owner checks or authentication.

001_backend_v2.sql was applied to the user-confirmed local development DATABASE_URL.
The runner uses one transaction, a lock, normalized-email collision detection and
a checksum ledger. Re-running skips the applied version. Never edit an applied file.
No production migration/deployment has been performed.

002_account_settings.sql adds first/last name, a case-insensitively unique optional
username, bounded PNG avatar data and session_version. Applied to development only.
Run the runner with `002_account_settings` to select that version. Uploaded profile
images are cropped client-side to 128px PNG; the server limits type, size and PNG
dimensions. This small avatar is stored with the user, not in a separate blob service.
Username is a profile handle; login still uses email. Existing display names are
not automatically split into first/last names.

Account password changes require the current password, hash the new password and
increment session_version transactionally. Old JWTs are rejected on every request
against the stored version; the user signs in again. Existing sessions/auth tokens
are removed. Deletion requires password + DELETE and relies on existing cascading
foreign keys to remove owned records; historical backups follow provider retention.
The browser deletion flow is never exercised against a real user by automation.
`scripts/test-development-account.mjs` tests these actions only on temporary fixtures.

Run scripts/migrate-development.mjs only after selecting and verifying the intended
development DATABASE_URL. It creates a local ANALYTICS_SECRET if absent without printing it.
No db:push or destructive schema reset is used.

Campaign redirects now write scan_events with transactional repeat detection and
ownership checks. Legacy backlink_clicks raw-IP writes are discontinued; old records
are untouched. GET is counted, HEAD is not; inactive/expired links are rejected.
If analytics is disabled or fails, a valid destination still opens. An absent
ANALYTICS_SECRET disables collection, so provision it before testing/deploying analytics.
Request IP comes from SvelteKit getClientAddress, not arbitrary forwarded headers.
Geography remains null until trusted platform metadata is configured.

Campaign detail shows owner-scoped summaries, UTC daily totals and device counts
for the last 30 days. Daily visitor sum is not monthly unique people. New analytics
API returns aggregates only. Daily materialized stats/retention jobs are not yet wired;
the dashboard queries scan_events directly and old events are not automatically deleted.
Sessions/auth_tokens tables are available but existing JWT authentication remains
in use. Email verification/reset, revocable sessions and saved multi-QR campaigns
are separate pending work; this migration does not enable them automatically.

Integration validation: scripts/test-development-analytics.mjs creates a temporary
disabled-login user/campaign, exercises real handlers and PostgreSQL storage, checks
repeats, HEAD exclusion, owner isolation, inactive links and metrics outage fallback,
then removes its own fixtures. It must run only against the development database.
