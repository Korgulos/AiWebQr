CREATE TABLE campaign_qr_designs (
 design_id uuid PRIMARY KEY,
 user_id integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
 campaign_id integer NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
 image_url text NOT NULL UNIQUE,
 storage_path text NOT NULL UNIQUE,
 mime_type text NOT NULL CHECK(mime_type IN ('image/png','image/gif')),
 byte_size integer NOT NULL CHECK(byte_size > 0 AND byte_size <= 3145728),
 mode text NOT NULL CHECK(mode IN ('standard','artistic')),
 content_hash char(64) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaign_qr_designs_owner ON campaign_qr_designs(user_id,campaign_id,created_at DESC);
