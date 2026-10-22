ALTER TABLE campaigns ADD COLUMN purpose text NOT NULL DEFAULT 'url' CHECK(purpose IN ('url','text','email','phone','sms','wifi','vcard','location','pdf','mp3','gallery'));
ALTER TABLE campaigns ADD COLUMN qr_payload text;
ALTER TABLE campaigns ADD COLUMN content_data jsonb NOT NULL DEFAULT '{}';
-- Metadata reservation for managed Blob uploads. Never store PDF/audio/image bytes in SQL.
CREATE TABLE campaign_assets (
 asset_id uuid PRIMARY KEY, user_id integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
 campaign_id integer REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
 storage_provider text NOT NULL DEFAULT 'vercel_blob', storage_path text NOT NULL UNIQUE,
 public_url text NOT NULL, content_type text NOT NULL, byte_size bigint NOT NULL CHECK(byte_size > 0),
 original_name varchar(255) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaign_assets_owner ON campaign_assets(user_id,campaign_id);
