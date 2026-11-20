-- Cloudflare D1 Migration: 0002_google_oauth_users.sql
-- Sri Saraswathi Dental Clinic - Support for Google OAuth 2.0 / OpenID Connect on users table

ALTER TABLE users ADD COLUMN google_id TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN profile_picture TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local';
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
