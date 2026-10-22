# Backend v2 draft

This is an isolated analytics prototype and SQL proposal, not a production migration.
Existing login, campaigns and redirects are unchanged. No production data was read or modified.

## Try locally

Run `npm run dev -- --host 127.0.0.1 --port 4174` and open
`http://127.0.0.1:4174/analytics-draft`. Click **Record test opening** twice within
10 seconds: total=2, human=2, daily visitors=1, rapid repeats=1 for an ordinary browser.
The real request metadata appears below. The test uses POST; the collector also
accepts GET requests when called by a future redirect handler. There is no public GET
collection/listing endpoint. Local events are session-isolated, bounded to 100 events,
expire after an hour, and disappear on restart. Both draft routes return 404 in production.

## What requests reveal

Method, timestamp, bounded user-agent, approximate browser/OS/device, language,
accept, available low-entropy client hints, fetch metadata, referrer/origin host.
Many scanners omit these headers. Referrer paths/query strings, cookies,
authorization, arbitrary headers/query parameters and POST bodies are deliberately
excluded: they can contain passwords, access tokens and private form contents.
Body contents are not needed to count a QR opening. Exact location, email, phone
number, identity and hardware identifiers are not available from a normal redirect.

IP is used transiently with a secret HMAC, UTC date, campaign and bounded user-agent.
It is never returned or stored raw. This is pseudonymous data, not guaranteed anonymity.
Daily identifiers cannot count cross-day unique people; shared networks and changing
IP/browser cause under/over-counting. Repeat threshold is 10 seconds; bots/prefetch
are heuristics and remain visible as separate metrics. Real scan vs shared-link visit
cannot be established reliably. The demo generates a server UUID per opening and
deduplicates retried inserts sharing that UUID, not separate user requests.

## Next integration steps

1. Compare `drafts/backend-v2.sql` against the actual schema in a test database.
   `.schema.sql` has forward references and is not a runnable migration; the existing
   Drizzle `user`/`age` example is not the application schema. Do not run db:push.
2. Resolve normalized-email collisions before the unique index; test rollback/backups.
3. Wire scan writes into GET redirects using trusted request address/geo, stable
   server-only ANALYTICS_SECRET, ownership checks and transactional repeat detection.
   Do not capture failed/expired destinations or count HEAD/OPTIONS. Analytics failure
   must not prevent a valid redirect. Replace legacy raw-IP backlink click storage.
4. Add session-authenticated, owner-scoped campaign analytics with date limits and
   pagination; never expose raw events through public links. Implement the dashboard.
5. Implement database-backed revocable sessions, verification/reset token consumption
   transactions, mail provider, login rate limits and account recovery tests.
6. Add bounded retention/aggregation jobs, deletion behavior and an accurate privacy notice.

Uploads remain in object storage; do not put image/GIF binaries into SQL.
No new services, migrations, user emails or production deploys are triggered by this draft.
