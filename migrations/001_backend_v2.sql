-- REVIEW DRAFT ONLY. Not applied automatically; verify live schema before migration.
-- Existing users/campaigns/backlinks/qr_codes remain the ownership model.
BEGIN;
ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
ALTER TABLE users ADD COLUMN deleted_at timestamptz;
-- Audit duplicate lower(trim(email)) values before creating this index.
CREATE UNIQUE INDEX users_email_normalized ON users (lower(trim(email)));
CREATE TABLE sessions (
 id uuid PRIMARY KEY, user_id integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 revoked_at timestamptz
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE auth_tokens (
 id uuid PRIMARY KEY, user_id integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE, purpose text NOT NULL CHECK(purpose IN ('verify_email','reset_password')),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, used_at timestamptz
);
CREATE INDEX auth_tokens_user ON auth_tokens(user_id);
ALTER TABLE campaigns ADD COLUMN archived_at timestamptz;
-- Actual development schema lacks this column, but the existing redirect writes it.
ALTER TABLE backlink_clicks ADD COLUMN campaign_id integer REFERENCES campaigns(campaign_id) ON DELETE SET NULL;
ALTER TABLE qr_codes ADD COLUMN name text;
ALTER TABLE qr_codes ADD COLUMN design jsonb NOT NULL DEFAULT '{}';
-- A scan targets an existing campaign/backlink. qr_code_id can be null for legacy links.
CREATE TABLE scan_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id uuid NOT NULL UNIQUE,
 campaign_id integer NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
 backlink_id integer NOT NULL REFERENCES backlinks(backlink_id) ON DELETE CASCADE,
 qr_code_id integer REFERENCES qr_codes(qr_code_id) ON DELETE SET NULL,
 occurred_at timestamptz NOT NULL DEFAULT now(),
 visitor_hash char(64) NOT NULL, hash_key_version text NOT NULL,
 method text NOT NULL CHECK(method IN ('GET','POST')),
 user_agent varchar(512), browser varchar(64), os varchar(64), device_type varchar(16),
 referrer_host varchar(253), origin_host varchar(253), language varchar(256), accept varchar(256),
 country_code char(2), region varchar(128),
 client_hints jsonb NOT NULL DEFAULT '{}', fetch_metadata jsonb NOT NULL DEFAULT '{}',
 is_bot boolean NOT NULL DEFAULT false, bot_reason varchar(256),
 is_rapid_repeat boolean NOT NULL DEFAULT false
);
CREATE INDEX scans_campaign_time ON scan_events(campaign_id, occurred_at DESC);
CREATE INDEX scans_repeat_lookup ON scan_events(campaign_id, visitor_hash, occurred_at DESC);
CREATE TABLE qr_daily_stats (
 qr_code_id integer NOT NULL REFERENCES qr_codes(qr_code_id) ON DELETE CASCADE,
 date date NOT NULL, scan_count bigint NOT NULL DEFAULT 0,
 unique_visitors bigint NOT NULL DEFAULT 0, bot_count bigint NOT NULL DEFAULT 0,
 rapid_repeat_count bigint NOT NULL DEFAULT 0,
 PRIMARY KEY(qr_code_id, date)
);
COMMIT;

-- Production integration requirements:
-- Verify campaign/backlink/QR ownership relationship before every insert.
-- Use server-generated request_id; ON CONFLICT(request_id) DO NOTHING on retries.
-- Serialize repeat lookup + insert per campaign/visitor with a transaction advisory lock.
-- Update/recompute daily stats idempotently; never sum daily uniques as monthly uniques.
-- Use trusted platform request IP/geo only; never trust arbitrary forwarded headers.
-- Keep redirects functional if analytics fails; no-store and ignore HEAD/OPTIONS scans.
-- UTC retention job: delete scan_events older than 30 days; expire sessions/tokens.
-- Session/token tables are proposed; existing JWT login remains unchanged in this draft.
