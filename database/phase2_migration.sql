-- Only needed if you already loaded the Phase 1 schema.sql
USE campusx;
ALTER TABLE users ADD COLUMN verification_token_hash VARCHAR(100) NULL;
