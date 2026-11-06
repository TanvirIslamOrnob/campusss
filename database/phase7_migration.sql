-- Phase 7: admin-managed accounts. Students get a temporary password from an admin and must change it on first login.
USE campusx;
ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Messages: "unsend for everyone" (text wiped, unsent_at set) and "delete for me" (per-user hidden rows).
ALTER TABLE messages ADD COLUMN unsent_at DATETIME NULL;
CREATE TABLE IF NOT EXISTS message_hidden (message_id BIGINT NOT NULL, user_id BIGINT NOT NULL, PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
