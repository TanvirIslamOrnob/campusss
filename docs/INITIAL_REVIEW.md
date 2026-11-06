# CAMPUSX Phase Archive Review

## Archive selection
- Reviewed `campusx-phase1.zip` through `campusx-phase7.zip`.
- Phase 7 contains every file path present in Phases 1–6, plus the Phase 7 admin additions.
- Therefore Phase 7 is the consolidated source snapshot; do not overlay all seven ZIPs in sequence.
- Phase 7 contains 114 files (excluding directory entries).

## Project contents observed
- React 18 + Vite + Tailwind frontend.
- Spring Boot 3.3.5 / Java 17 backend with Maven.
- MySQL schema and SQL seed/admin scripts.
- JWT / Spring Security configuration.
- Student pages for dashboard, profile, community, materials, lost & found, marketplace, study groups, events, messages, notifications.
- Moderator/Super Admin routes and admin pages.

## Checks performed
- ZIP integrity and file inventory inspected.
- Phase 7 path coverage compared with Phases 1–6: no earlier file paths are missing from Phase 7.
- Frontend package metadata, route definitions, API service, backend controller mappings, security configuration, application config, and SQL schema inspected.

## Checks not completed
- `npm install` did not finish within the available execution window; `vite` was consequently unavailable and `npm run build` could not run.
- Maven is not installed in the review environment; Spring Boot compile/test could not run.
- MySQL server is not available here; schema execution and database integration were not tested.
- No automated frontend/backend test files were found in the archive.

## Items to verify before demo/deployment
1. Execute `database/schema.sql` against a fresh MySQL database.
2. Run backend with Java 17+ and Maven; fix any compile/runtime errors.
3. Run `npm install` and `npm run build` in frontend.
4. Test registration, login, email verification development flow, password reset development flow, and each role.
5. Test file uploads, ownership checks, private messages, group join approvals, event registration, reports, and admin actions.
6. Replace the development JWT secret and configure production secrets outside source control.
7. Configure real email delivery before relying on verification/reset emails.
8. Review the redundant-looking `verify_token_hash` column in `database/schema.sql`; application code found in this review references `verification_token_hash`.
9. Review localStorage JWT storage and XSS mitigations before public deployment.

This is a source/archive review, not a claim that the app has passed runtime QA.
