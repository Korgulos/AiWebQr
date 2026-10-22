ALTER TABLE users ALTER COLUMN name TYPE varchar(121) USING trim(name);
ALTER TABLE users ADD COLUMN first_name varchar(60);
ALTER TABLE users ADD COLUMN last_name varchar(60);
ALTER TABLE users ADD COLUMN username varchar(30);
ALTER TABLE users ADD COLUMN avatar_data text CHECK (octet_length(avatar_data) <= 90000);
ALTER TABLE users ADD COLUMN session_version integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX users_username_unique ON users(lower(username)) WHERE username IS NOT NULL;
-- Do not guess how existing display names should be split; users fill these fields themselves.
