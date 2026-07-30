-- PostgreSQL initialization script
-- Runs once on first container startup

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- for trigram full-text search fallback
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- for UUID generation

-- Set timezone
SET timezone = 'Asia/Kolkata';
