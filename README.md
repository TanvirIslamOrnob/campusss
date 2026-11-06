# CAMPUSX — Phase 7
1. Database: `mysql -u root -p < database/schema.sql` (upgrading from Phase 3? run `database/phase4_migration.sql` to add the seed courses; upgrading from Phase 4 or earlier? run `database/phase5_migration.sql`; to add Civil Engineering to an existing database, run `database/phase6_migration.sql`)
2. Backend: `cd backend && mvn spring-boot:run` (Java 17; env DB_USER, DB_PASSWORD, JWT_SECRET)
3. Frontend: `cd frontend && npm install && npm run dev` -> http://localhost:5173
Emails are NOT sent: verification and reset links are printed in the backend console.

Events are created by staff (admin dashboard arrives in Phase 7). To try events now, register, then edit and run `database/dev_seed_events.sql` (promotes your account to MODERATOR and adds sample events).

Messages refresh by polling (every 5 s in an open chat, 10 s for the list, 30 s for badges). Event reminders are created by a background job every 15 minutes.

Admin console: /admin. Create your first super admin by running `database/dev_make_admin.sql` (put your registered email in it). Super admins can promote students to moderators there.
