ALTER TABLE campaigns ADD COLUMN public_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX campaigns_public_id_unique ON campaigns(public_id);
ALTER TABLE users ADD COLUMN public_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX users_public_id_unique ON users(public_id);
ALTER TABLE qr_codes ADD COLUMN public_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX qr_codes_public_id_unique ON qr_codes(public_id);
