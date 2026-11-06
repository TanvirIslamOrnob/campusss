-- Phase 4: only needed if you already loaded an earlier schema.sql
USE campusx;
INSERT IGNORE INTO courses (department_id, code, title)
SELECT d.id, v.code, v.title FROM departments d JOIN (
  SELECT 'CSE' dc, 'CSE101' code, 'Introduction to Programming' title UNION ALL
  SELECT 'CSE','CSE201','Data Structures' UNION ALL SELECT 'CSE','CSE301','Database Systems' UNION ALL SELECT 'CSE','CSE305','Operating Systems' UNION ALL
  SELECT 'EEE','EEE101','Basic Electrical Engineering' UNION ALL SELECT 'EEE','EEE201','Circuit Analysis' UNION ALL
  SELECT 'BBA','BBA101','Principles of Management' UNION ALL SELECT 'BBA','BBA201','Financial Accounting' UNION ALL
  SELECT 'ENG','ENG101','English Composition' UNION ALL SELECT 'ENG','ENG201','Academic Writing'
) v ON v.dc = d.code;
