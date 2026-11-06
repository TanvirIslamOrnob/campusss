-- DEV ONLY: creates your first SUPER_ADMIN. Register normally in the app, put your email below, then run this file.
-- (After that, super admins can promote other students to MODERATOR in the admin dashboard.)
USE campusx;
SET @email = 'your-email@university.edu';
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'SUPER_ADMIN'), email_verified = TRUE, status = 'ACTIVE' WHERE email = @email;
SELECT id, full_name, email FROM users WHERE email = @email AND role_id = (SELECT id FROM roles WHERE name = 'SUPER_ADMIN');
