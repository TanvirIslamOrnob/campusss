CREATE DATABASE IF NOT EXISTS campusx CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE campusx;

CREATE TABLE roles (id TINYINT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(20) NOT NULL UNIQUE); -- STUDENT, MODERATOR, SUPER_ADMIN
CREATE TABLE departments (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL UNIQUE, code VARCHAR(10) NOT NULL UNIQUE);
CREATE TABLE courses (id INT PRIMARY KEY AUTO_INCREMENT, department_id INT NOT NULL, code VARCHAR(20) NOT NULL UNIQUE, title VARCHAR(150) NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id), INDEX idx_courses_dept (department_id));

CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, role_id TINYINT NOT NULL, department_id INT NULL,
  university_id VARCHAR(30) NOT NULL UNIQUE, full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE, password_hash VARCHAR(100) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE, status ENUM('ACTIVE','SUSPENDED','PENDING') NOT NULL DEFAULT 'PENDING',
  semester TINYINT NULL, bio VARCHAR(500) NULL, skills VARCHAR(300) NULL, avatar_path VARCHAR(255) NULL,
  reset_token_hash VARCHAR(100) NULL, reset_token_expires_at DATETIME NULL, verification_token_hash VARCHAR(100) NULL, verify_token_hash VARCHAR(100) NULL, must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id), FOREIGN KEY (department_id) REFERENCES departments(id),
  INDEX idx_users_dept (department_id), INDEX idx_users_status (status));

CREATE TABLE posts (id BIGINT PRIMARY KEY AUTO_INCREMENT, author_id BIGINT NOT NULL, content TEXT NOT NULL, image_path VARCHAR(255) NULL,
  is_removed BOOLEAN NOT NULL DEFAULT FALSE, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE, INDEX idx_posts_created (created_at), FULLTEXT INDEX ft_posts (content));
CREATE TABLE comments (id BIGINT PRIMARY KEY AUTO_INCREMENT, post_id BIGINT NOT NULL, author_id BIGINT NOT NULL, content VARCHAR(1000) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE, INDEX idx_comments_post (post_id));
CREATE TABLE likes (post_id BIGINT NOT NULL, user_id BIGINT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id), FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);

CREATE TABLE study_materials (id BIGINT PRIMARY KEY AUTO_INCREMENT, uploader_id BIGINT NOT NULL, course_id INT NOT NULL, title VARCHAR(150) NOT NULL,
  file_path VARCHAR(255) NOT NULL, file_type VARCHAR(50) NOT NULL, is_removed BOOLEAN NOT NULL DEFAULT FALSE, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploader_id) REFERENCES users(id), FOREIGN KEY (course_id) REFERENCES courses(id), INDEX idx_materials_course (course_id));
CREATE TABLE lost_found_items (id BIGINT PRIMARY KEY AUTO_INCREMENT, reporter_id BIGINT NOT NULL, type ENUM('LOST','FOUND') NOT NULL, title VARCHAR(150) NOT NULL,
  description TEXT NULL, location VARCHAR(150) NOT NULL, item_date DATE NOT NULL, image_path VARCHAR(255) NULL, status ENUM('OPEN','RESOLVED') NOT NULL DEFAULT 'OPEN',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (reporter_id) REFERENCES users(id), INDEX idx_lf_type_status (type, status));
CREATE TABLE item_claims (id BIGINT PRIMARY KEY AUTO_INCREMENT, item_id BIGINT NOT NULL, claimant_id BIGINT NOT NULL, message VARCHAR(500) NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES lost_found_items(id) ON DELETE CASCADE, FOREIGN KEY (claimant_id) REFERENCES users(id), UNIQUE (item_id, claimant_id));
CREATE TABLE marketplace_listings (id BIGINT PRIMARY KEY AUTO_INCREMENT, seller_id BIGINT NOT NULL, title VARCHAR(150) NOT NULL, description TEXT NULL,
  price DECIMAL(10,2) NOT NULL, image_path VARCHAR(255) NULL, status ENUM('AVAILABLE','SOLD','REMOVED') NOT NULL DEFAULT 'AVAILABLE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (seller_id) REFERENCES users(id), INDEX idx_listing_status (status), FULLTEXT INDEX ft_listing (title));

CREATE TABLE study_groups (id BIGINT PRIMARY KEY AUTO_INCREMENT, owner_id BIGINT NOT NULL, course_id INT NULL, name VARCHAR(100) NOT NULL, description VARCHAR(500) NULL,
  is_private BOOLEAN NOT NULL DEFAULT FALSE, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id), FOREIGN KEY (course_id) REFERENCES courses(id));
CREATE TABLE group_members (group_id BIGINT NOT NULL, user_id BIGINT NOT NULL, member_role ENUM('OWNER','MEMBER') NOT NULL DEFAULT 'MEMBER',
  status ENUM('PENDING','APPROVED') NOT NULL DEFAULT 'APPROVED', PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);

CREATE TABLE events (id BIGINT PRIMARY KEY AUTO_INCREMENT, organizer_id BIGINT NOT NULL, title VARCHAR(150) NOT NULL, description TEXT NULL, venue VARCHAR(150) NOT NULL,
  starts_at DATETIME NOT NULL, capacity INT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (organizer_id) REFERENCES users(id), INDEX idx_events_start (starts_at));
CREATE TABLE event_registrations (event_id BIGINT NOT NULL, user_id BIGINT NOT NULL, registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id), FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);

CREATE TABLE conversations (id BIGINT PRIMARY KEY AUTO_INCREMENT, user_a BIGINT NOT NULL, user_b BIGINT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_a) REFERENCES users(id), FOREIGN KEY (user_b) REFERENCES users(id), UNIQUE (user_a, user_b), CHECK (user_a < user_b));
CREATE TABLE messages (id BIGINT PRIMARY KEY AUTO_INCREMENT, conversation_id BIGINT NOT NULL, sender_id BIGINT NOT NULL, body VARCHAR(2000) NOT NULL,
  read_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id), INDEX idx_msg_conv (conversation_id, created_at));
CREATE TABLE notifications (id BIGINT PRIMARY KEY AUTO_INCREMENT, user_id BIGINT NOT NULL,
  type ENUM('LIKE','COMMENT','MESSAGE','EVENT_REMINDER','CLAIM_UPDATE','ANNOUNCEMENT','GROUP_UPDATE') NOT NULL, content VARCHAR(255) NOT NULL, link VARCHAR(255) NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, is_read));

CREATE TABLE reports (id BIGINT PRIMARY KEY AUTO_INCREMENT, reporter_id BIGINT NOT NULL, target_type ENUM('POST','MATERIAL','LISTING','USER') NOT NULL, target_id BIGINT NOT NULL,
  reason VARCHAR(500) NOT NULL, status ENUM('PENDING','INVESTIGATING','RESOLVED','REJECTED') NOT NULL DEFAULT 'PENDING', handled_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (reporter_id) REFERENCES users(id), FOREIGN KEY (handled_by) REFERENCES users(id), INDEX idx_reports_status (status));
CREATE TABLE admin_logs (id BIGINT PRIMARY KEY AUTO_INCREMENT, admin_id BIGINT NOT NULL, action VARCHAR(80) NOT NULL, target_type VARCHAR(30) NULL, target_id BIGINT NULL,
  details VARCHAR(500) NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (admin_id) REFERENCES users(id), INDEX idx_logs_admin (admin_id, created_at));
CREATE TABLE bookmarks (user_id BIGINT NOT NULL, material_id BIGINT NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, material_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (material_id) REFERENCES study_materials(id) ON DELETE CASCADE);

INSERT INTO roles (name) VALUES ('STUDENT'),('MODERATOR'),('SUPER_ADMIN');
INSERT INTO departments (name, code) VALUES ('Computer Science & Engineering','CSE'),('Civil Engineering','CIVIL'),('Electrical & Electronic Engineering','EEE'),('Business Administration','BBA'),('English','ENG');

INSERT IGNORE INTO courses (department_id, code, title)
SELECT d.id, v.code, v.title FROM departments d JOIN (
  SELECT 'CSE' dc, 'CSE101' code, 'Introduction to Programming' title UNION ALL
  SELECT 'CSE','CSE201','Data Structures' UNION ALL SELECT 'CSE','CSE301','Database Systems' UNION ALL SELECT 'CSE','CSE305','Operating Systems' UNION ALL
  SELECT 'EEE','EEE101','Basic Electrical Engineering' UNION ALL SELECT 'EEE','EEE201','Circuit Analysis' UNION ALL
  SELECT 'BBA','BBA101','Principles of Management' UNION ALL SELECT 'BBA','BBA201','Financial Accounting' UNION ALL
  SELECT 'ENG','ENG101','English Composition' UNION ALL SELECT 'ENG','ENG201','Academic Writing'
) v ON v.dc = d.code;

-- Phase 5: the courses each student is taking (powers "find study partners by course")
CREATE TABLE IF NOT EXISTS user_courses (user_id BIGINT NOT NULL, course_id INT NOT NULL, PRIMARY KEY (user_id, course_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE);

-- Messages: unsend for everyone / delete for me
ALTER TABLE messages ADD COLUMN unsent_at DATETIME NULL;
CREATE TABLE IF NOT EXISTS message_hidden (message_id BIGINT NOT NULL, user_id BIGINT NOT NULL, PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
