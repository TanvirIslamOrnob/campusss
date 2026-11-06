-- Phase 5: only needed if you already loaded an earlier schema.sql
USE campusx;
CREATE TABLE IF NOT EXISTS user_courses (user_id BIGINT NOT NULL, course_id INT NOT NULL, PRIMARY KEY (user_id, course_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE);
ALTER TABLE notifications MODIFY type ENUM('LIKE','COMMENT','MESSAGE','EVENT_REMINDER','CLAIM_UPDATE','ANNOUNCEMENT','GROUP_UPDATE') NOT NULL;
