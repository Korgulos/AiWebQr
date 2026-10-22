# Production release — 23 October 2026

Project: `qr_generator` in `korgulos-projects`.
Deployment: `dpl_4P8cP3z9LNDMfgKaB81qPJ8s6nGo`.
URL: https://www.qr-gen-me.com/
Built from the local working tree; changes are not yet committed to Git.

Production uses the separately confirmed Neon production connection, synchronized to Vercel's production DATABASE_URL Secret. Development configuration was preserved. ANALYTICS_SECRET and BLOB_READ_WRITE_TOKEN were configured as production Secrets. No credentials are included in this document.

Migrations 001–005 were committed together on production. The production baseline already contained backlink_clicks.campaign_id; the production runner tolerates that existing column without changing migration source files or checksums. Existing records were preserved.

Before promotion, a temporary production account exercised login, authenticated dashboard, campaign creation, analytics, status edit and deletion. The fixture account and campaign were removed. The exact tested production deployment was promoted to the public domain.

Public checks passed: home, Artistic QR and login HTTP 200; campaigns API HTTP 401 anonymously; development analytics draft HTTP 404; anonymous /qr-gen redirects home.

Commands and helpers are in scripts/migrate-production.mjs, scripts/test-production-smoke.mjs and scripts/check-production-public.mjs. Pulled secrets remain in the ignored .vercel directory. Do not upload or commit that directory. Production migration runner requires a separate production database.
