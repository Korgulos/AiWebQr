-- Provider identity is independent of email; existing accounts must explicitly link.
CREATE TABLE social_accounts (
 provider text NOT NULL CHECK (provider IN ('google', 'microsoft')),
 subject text NOT NULL,
 user_id integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (provider, subject),
 UNIQUE (user_id, provider)
);
CREATE INDEX social_accounts_user ON social_accounts(user_id);
