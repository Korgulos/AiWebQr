# Development database review

Read-only inspection of the locally configured DATABASE_URL succeeded on 2026-10-22.
No rows containing user data were read and no schema/data changes were applied.
The connection's Neon display label cannot be established from PostgreSQL metadata;
the selected development target relies on the user's local configuration.

Existing tables: users, campaigns, campaign_comments, backlinks, backlink_clicks,
qr_codes and qr_code_scans. Existing primary/foreign keys are present.

Differences from the proposed backend:

- sessions, auth_tokens, scan_events and qr_daily_stats do not exist yet.
- backlink_clicks has no campaign_id, although the current redirect handler inserts
  that column. This can cause a 500 instead of redirecting. The draft SQL now adds it.
- users.name/email are fixed-length CHAR; migrate to bounded VARCHAR in a later
  reviewed migration after checking lengths and whitespace behavior.
- normalized email uniqueness still needs an aggregate duplicate check before migration.
- Existing qr_type enum only covers the legacy types; expand it or introduce a text
  content_type with a check constraint when saving the new generator's eight types.
- qr_codes are linked through backlinks; campaign-to-QR ownership consistency needs
  constraints/transactional validation before supporting multiple codes per campaign.

Next: apply a versioned additive migration to the confirmed development target,
then implement real scan persistence and owner-scoped campaign analytics. The SQL
draft is a review artifact, not yet a tested production migration.
