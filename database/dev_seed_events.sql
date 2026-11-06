-- DEV ONLY. Events are created by staff, and the admin dashboard arrives in Phase 7.
-- Until then: put YOUR registered email below, then run this file. It promotes you to MODERATOR and adds sample events.
USE campusx;
SET @email = 'your-email@university.edu';
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'MODERATOR') WHERE email = @email;
INSERT INTO events (organizer_id, title, description, venue, starts_at, capacity)
SELECT u.id, v.title, v.descr, v.venue, DATE_ADD(NOW(), INTERVAL v.d DAY), v.cap FROM users u JOIN (
  SELECT 'Freshers Welcome Day' title, 'Meet student clubs, pick up your welcome kit and tour the campus.' descr, 'Main Auditorium' venue, 3 d, 200 cap UNION ALL
  SELECT '24-Hour Hackathon', 'Form a team of up to four and build something useful for campus life.', 'CSE Lab 2', 10, 60 UNION ALL
  SELECT 'Career Fair', 'Talk to employers, drop off your CV and join short workshops.', 'Sports Complex', 21, NULL
) v WHERE u.email = @email;
