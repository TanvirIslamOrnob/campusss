package com.campusx.service;
import com.campusx.dto.AdminDtos.*;
import com.campusx.dto.SocialDtos.EventDto;
import com.campusx.dto.SocialDtos.EventRequest;
import com.campusx.exception.ApiException;
import com.campusx.security.RateLimiter;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Everything staff can do. Role limits are enforced in SecurityConfig (moderators: reports, content, events; super admins: everything).
 * Every state-changing method writes a row to admin_logs, inside the same transaction as the change itself.
 */
@Service
public class AdminService extends BaseService {
    private record Cfg(String cols, String from, String removedCond, String searchCol, String removeSql, String restoreSql, String authorSql, String noun) {}
    private static final Map<String, Cfg> CONTENT = Map.of(
        "posts", new Cfg("p.id AS cid, LEFT(p.content, 150) AS title, u.full_name AS author, p.is_removed AS removed, p.created_at AS made, "
            + "(SELECT COUNT(*) FROM reports r WHERE r.target_type = 'POST' AND r.target_id = p.id AND r.status IN ('PENDING','INVESTIGATING')) AS reps",
            "posts p JOIN users u ON u.id = p.author_id", "p.is_removed", "p.content",
            "UPDATE posts SET is_removed = TRUE WHERE id = ?", "UPDATE posts SET is_removed = FALSE WHERE id = ?", "SELECT author_id FROM posts WHERE id = ?", "post"),
        "materials", new Cfg("m.id AS cid, m.title AS title, u.full_name AS author, m.is_removed AS removed, m.created_at AS made, "
            + "(SELECT COUNT(*) FROM reports r WHERE r.target_type = 'MATERIAL' AND r.target_id = m.id AND r.status IN ('PENDING','INVESTIGATING')) AS reps",
            "study_materials m JOIN users u ON u.id = m.uploader_id", "m.is_removed", "m.title",
            "UPDATE study_materials SET is_removed = TRUE WHERE id = ?", "UPDATE study_materials SET is_removed = FALSE WHERE id = ?", "SELECT uploader_id FROM study_materials WHERE id = ?", "study file"),
        "listings", new Cfg("l.id AS cid, l.title AS title, u.full_name AS author, (l.status = 'REMOVED') AS removed, l.created_at AS made, "
            + "(SELECT COUNT(*) FROM reports r WHERE r.target_type = 'LISTING' AND r.target_id = l.id AND r.status IN ('PENDING','INVESTIGATING')) AS reps",
            "marketplace_listings l JOIN users u ON u.id = l.seller_id", "(l.status = 'REMOVED')", "l.title",
            "UPDATE marketplace_listings SET status = 'REMOVED' WHERE id = ?", "UPDATE marketplace_listings SET status = 'AVAILABLE' WHERE id = ?", "SELECT seller_id FROM marketplace_listings WHERE id = ?", "listing"));
    private static final Map<String, String> REPORT_TO_CONTENT = Map.of("POST", "posts", "MATERIAL", "materials", "LISTING", "listings");

    private final EventService events; private final AuthService auth; private final RateLimiter limiter; private final PasswordEncoder encoder;
    public AdminService(JdbcTemplate jdbc, EventService events, AuthService auth, RateLimiter limiter, PasswordEncoder encoder) { super(jdbc); this.events = events; this.auth = auth; this.limiter = limiter; this.encoder = encoder; }

    public void log(long admin, String action, String type, Long id, String details) {
        jdbc.update("INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)", admin, action, type, id,
            details == null ? null : details.length() > 500 ? details.substring(0, 500) : details);
    }

    // ---------- dashboard ----------
    public StatsDto stats() {
        String stu = "SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'STUDENT'";
        List<ActivityDto> recent = jdbc.query(
            "(SELECT 'New student' AS kind, full_name AS label, created_at AS happened FROM users ORDER BY created_at DESC LIMIT 5) "
            + "UNION ALL (SELECT 'New post', LEFT(content, 80), created_at FROM posts WHERE is_removed = FALSE ORDER BY created_at DESC LIMIT 5) "
            + "UNION ALL (SELECT 'New report', CONCAT(target_type, ': ', LEFT(reason, 70)), created_at FROM reports ORDER BY created_at DESC LIMIT 5) ORDER BY happened DESC LIMIT 10",
            (rs, i) -> new ActivityDto(rs.getString("kind"), rs.getString("label"), rs.getTimestamp("happened").toLocalDateTime()));
        return new StatsDto(count(stu), count(stu + " AND u.status = 'ACTIVE'"), count(stu + " AND u.status = 'SUSPENDED'"),
            count("SELECT COUNT(*) FROM posts WHERE is_removed = FALSE"), count("SELECT COUNT(*) FROM marketplace_listings WHERE status <> 'REMOVED'"),
            count("SELECT COUNT(*) FROM events"), count("SELECT COUNT(*) FROM reports WHERE status IN ('PENDING','INVESTIGATING')"), recent);
    }

    // ---------- students (super admin) ----------
    public List<AdminStudentDto> students(String q, Integer dept, String status, int page) {
        StringBuilder sql = new StringBuilder("SELECT u.id, u.full_name, u.university_id, u.email, ro.name AS role, u.department_id, d.name AS dept, u.semester, u.status, u.email_verified, u.bio, u.skills, u.created_at, "
            + "(SELECT COUNT(*) FROM posts p WHERE p.author_id = u.id AND p.is_removed = FALSE) AS posts, "
            + "(SELECT COUNT(*) FROM marketplace_listings l WHERE l.seller_id = u.id AND l.status <> 'REMOVED') AS listings, "
            + "(SELECT COUNT(*) FROM study_materials m WHERE m.uploader_id = u.id AND m.is_removed = FALSE) AS materials "
            + "FROM users u JOIN roles ro ON ro.id = u.role_id LEFT JOIN departments d ON d.id = u.department_id WHERE 1 = 1 ");
        List<Object> a = new ArrayList<>();
        // Every word must match the name, email or university ID, so "jarin 1702" narrows by both at once.
        if (q != null && !q.isBlank()) for (String w : q.trim().split("\\s+")) { sql.append("AND (u.full_name LIKE ? OR u.email LIKE ? OR u.university_id LIKE ?) "); for (int k = 0; k < 3; k++) a.add(like(w)); }
        if (dept != null) { sql.append("AND u.department_id = ? "); a.add(dept); }
        if (status != null && List.of("ACTIVE", "SUSPENDED", "PENDING").contains(status)) { sql.append("AND u.status = ? "); a.add(status); }
        sql.append("ORDER BY u.created_at DESC, u.id DESC LIMIT ? OFFSET ?"); a.add(PAGE); a.add(offset(page));
        return jdbc.query(sql.toString(), (rs, i) -> new AdminStudentDto(rs.getLong("id"), rs.getString("full_name"), rs.getString("university_id"), rs.getString("email"), rs.getString("role"),
            (Integer) rs.getObject("department_id"), rs.getString("dept"), (Integer) rs.getObject("semester"), rs.getString("status"), rs.getBoolean("email_verified"), rs.getString("bio"), rs.getString("skills"),
            rs.getTimestamp("created_at").toLocalDateTime(), rs.getInt("posts"), rs.getInt("listings"), rs.getInt("materials")), a.toArray());
    }

    private Map<String, Object> user(long id) {
        List<Map<String, Object>> r = jdbc.queryForList("SELECT u.id, u.full_name, u.email, ro.name AS role FROM users u JOIN roles ro ON ro.id = u.role_id WHERE u.id = ?", id);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Student not found.");
        return r.get(0);
    }
    /** Admins can't act on themselves or on other super admins through these endpoints. */
    private Map<String, Object> manageable(long admin, long id) {
        Map<String, Object> u = user(id);
        if (id == admin) throw new ApiException(HttpStatus.BAD_REQUEST, "You can't do this to your own account.");
        if ("SUPER_ADMIN".equals(u.get("role"))) throw new ApiException(HttpStatus.FORBIDDEN, "Super admin accounts can't be changed here.");
        return u;
    }

    private void checkDepartment(Integer id) {
        if (count("SELECT COUNT(*) FROM departments WHERE id = ?", id) == 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown department.");
    }
    private void checkUnique(String email, String universityId, long exceptId) {
        if (count("SELECT COUNT(*) FROM users WHERE (email = ? OR university_id = ?) AND id <> ?", email, universityId, exceptId) > 0)
            throw new ApiException(HttpStatus.CONFLICT, "Another account already uses this email or university ID.");
    }

    /** Accounts are only ever created here. They start verified and active, with a temporary password the user must replace at first login. */
    @Transactional
    public long createUser(long admin, CreateUserRequest r) {
        limiter.check("admin-create:" + admin, 30, 60_000);
        String mail = r.email().trim().toLowerCase(), uid = r.universityId().trim();
        checkDepartment(r.departmentId()); checkUnique(mail, uid, -1);
        jdbc.update("INSERT INTO users (role_id, department_id, university_id, full_name, email, password_hash, email_verified, status, must_change_password, semester) "
            + "VALUES ((SELECT id FROM roles WHERE name = ?), ?, ?, ?, ?, ?, TRUE, 'ACTIVE', TRUE, ?)",
            r.role(), r.departmentId(), uid, r.fullName().trim(), mail, encoder.encode(r.password()), r.semester());
        long id = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        log(admin, "CREATE_USER", "USER", id, r.fullName().trim() + " (" + r.role() + ")");
        return id;
    }
    @Transactional
    public void updateUser(long admin, long id, UpdateUserRequest r) {
        Map<String, Object> u = manageable(admin, id);
        String mail = r.email().trim().toLowerCase(), uid = r.universityId().trim();
        checkDepartment(r.departmentId()); checkUnique(mail, uid, id);
        jdbc.update("UPDATE users SET full_name = ?, university_id = ?, email = ?, department_id = ?, semester = ? WHERE id = ?", r.fullName().trim(), uid, mail, r.departmentId(), r.semester(), id);
        boolean newPassword = r.password() != null && !r.password().isBlank();
        if (newPassword) jdbc.update("UPDATE users SET password_hash = ?, must_change_password = TRUE WHERE id = ?", encoder.encode(r.password()), id);
        log(admin, "EDIT_USER", "USER", id, u.get("full_name") + (newPassword ? " (temporary password set)" : ""));
    }

    @Transactional
    public void verify(long admin, long id) {
        Map<String, Object> u = user(id);
        jdbc.update("UPDATE users SET email_verified = TRUE, verification_token_hash = NULL, status = IF(status = 'PENDING', 'ACTIVE', status) WHERE id = ?", id);
        log(admin, "VERIFY_STUDENT", "USER", id, u.get("full_name") + " verified manually");
    }
    @Transactional
    public void suspend(long admin, long id, String reason) {
        Map<String, Object> u = manageable(admin, id);
        jdbc.update("UPDATE users SET status = 'SUSPENDED' WHERE id = ?", id);
        log(admin, "SUSPEND_STUDENT", "USER", id, u.get("full_name") + ": " + reason.trim());
    }
    @Transactional
    public void reactivate(long admin, long id) {
        Map<String, Object> u = manageable(admin, id);
        jdbc.update("UPDATE users SET status = IF(email_verified, 'ACTIVE', 'PENDING') WHERE id = ?", id);
        log(admin, "REACTIVATE_STUDENT", "USER", id, String.valueOf(u.get("full_name")));
    }
    /** The admin never sees or sets a password: the student gets a one-hour reset link by email. */
    @Transactional
    public void initiatePasswordReset(long admin, long id) {
        limiter.check("admin-reset:" + admin, 10, 60_000);
        Map<String, Object> u = manageable(admin, id);
        auth.forgotPassword((String) u.get("email"));
        log(admin, "INITIATE_PASSWORD_RESET", "USER", id, "Reset link sent to " + u.get("full_name"));
    }
    @Transactional
    public void setRole(long admin, long id, String role) {
        Map<String, Object> u = manageable(admin, id);
        jdbc.update("UPDATE users SET role_id = (SELECT id FROM roles WHERE name = ?) WHERE id = ?", role, id);
        log(admin, "CHANGE_ROLE", "USER", id, u.get("full_name") + ": " + u.get("role") + " -> " + role);
    }

    // ---------- reports ----------
    public List<ReportDto> reports(String status, String type, int page) {
        StringBuilder sql = new StringBuilder("SELECT r.id, rep.full_name AS reporter, r.target_type, r.target_id, r.reason, r.status, h.full_name AS handler, r.created_at, "
            + "(CASE r.target_type WHEN 'POST' THEN (SELECT LEFT(content, 200) FROM posts WHERE id = r.target_id) "
            + "WHEN 'MATERIAL' THEN (SELECT title FROM study_materials WHERE id = r.target_id) "
            + "WHEN 'LISTING' THEN (SELECT title FROM marketplace_listings WHERE id = r.target_id) "
            + "WHEN 'USER' THEN (SELECT full_name FROM users WHERE id = r.target_id) END) AS preview "
            + "FROM reports r JOIN users rep ON rep.id = r.reporter_id LEFT JOIN users h ON h.id = r.handled_by WHERE 1 = 1 ");
        List<Object> a = new ArrayList<>();
        if (status != null && List.of("PENDING", "INVESTIGATING", "RESOLVED", "REJECTED").contains(status)) { sql.append("AND r.status = ? "); a.add(status); }
        if (type != null && List.of("POST", "MATERIAL", "LISTING", "USER").contains(type)) { sql.append("AND r.target_type = ? "); a.add(type); }
        sql.append("ORDER BY (r.status IN ('PENDING','INVESTIGATING')) DESC, r.created_at DESC, r.id DESC LIMIT ? OFFSET ?"); a.add(PAGE); a.add(offset(page));
        return jdbc.query(sql.toString(), (rs, i) -> new ReportDto(rs.getLong("id"), rs.getString("reporter"), rs.getString("target_type"), rs.getLong("target_id"), rs.getString("reason"),
            rs.getString("status"), rs.getString("handler"), rs.getTimestamp("created_at").toLocalDateTime(), rs.getString("preview")), a.toArray());
    }

    private Map<String, Object> openReport(long id) {
        List<Map<String, Object>> r = jdbc.queryForList("SELECT status, target_type, target_id FROM reports WHERE id = ?", id);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Report not found.");
        if (List.of("RESOLVED", "REJECTED").contains(r.get(0).get("status"))) throw new ApiException(HttpStatus.CONFLICT, "This report was already closed.");
        return r.get(0);
    }
    @Transactional
    public void setReportStatus(long admin, long id, String status) {
        Map<String, Object> rep = openReport(id);
        if (status.equals(rep.get("status"))) throw new ApiException(HttpStatus.CONFLICT, "The report is already " + status.toLowerCase() + ".");
        jdbc.update("UPDATE reports SET status = ?, handled_by = ? WHERE id = ?", status, admin, id);
        log(admin, "REPORT_" + status, "REPORT", id, rep.get("target_type") + " #" + rep.get("target_id"));
    }
    @Transactional
    public void removeReportedContent(long admin, long id) {
        Map<String, Object> rep = openReport(id);
        String type = REPORT_TO_CONTENT.get((String) rep.get("target_type"));
        if (type == null) throw new ApiException(HttpStatus.BAD_REQUEST, "This kind of report has no content to remove.");
        removeContent(admin, type, ((Number) rep.get("target_id")).longValue());
        jdbc.update("UPDATE reports SET status = 'RESOLVED', handled_by = ? WHERE id = ?", admin, id);
        log(admin, "REPORT_RESOLVED", "REPORT", id, "Content removed");
    }

    // ---------- content ----------
    private Cfg cfg(String type) { Cfg c = CONTENT.get(type); if (c == null) throw new ApiException(HttpStatus.NOT_FOUND, "Unknown content type."); return c; }

    public List<ContentDto> content(String type, String q, boolean removed, int page) {
        Cfg c = cfg(type);
        StringBuilder sql = new StringBuilder("SELECT " + c.cols() + " FROM " + c.from() + " WHERE " + c.removedCond() + " = ? ");
        List<Object> a = new ArrayList<>(); a.add(removed);
        if (q != null && !q.isBlank()) { sql.append("AND ").append(c.searchCol()).append(" LIKE ? "); a.add(like(q)); }
        sql.append("ORDER BY made DESC, cid DESC LIMIT ? OFFSET ?"); a.add(PAGE); a.add(offset(page));
        return jdbc.query(sql.toString(), (rs, i) -> new ContentDto(rs.getLong("cid"), type, rs.getString("title"), rs.getString("author"), rs.getBoolean("removed"),
            rs.getTimestamp("made").toLocalDateTime(), rs.getInt("reps")), a.toArray());
    }
    @Transactional
    public void removeContent(long admin, String type, long id) {
        Cfg c = cfg(type);
        List<Long> author = jdbc.queryForList(c.authorSql(), Long.class, id);
        if (author.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "That item no longer exists.");
        jdbc.update(c.removeSql(), id);
        notifyUser(author.get(0), "ANNOUNCEMENT", "A moderator removed your " + c.noun() + " for breaking campus guidelines.", null);
        log(admin, "REMOVE_CONTENT", type.toUpperCase(), id, "Removed " + c.noun());
    }
    @Transactional
    public void restoreContent(long admin, String type, long id) {
        Cfg c = cfg(type);
        if (jdbc.queryForList(c.authorSql(), Long.class, id).isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "That item no longer exists.");
        jdbc.update(c.restoreSql(), id);
        log(admin, "RESTORE_CONTENT", type.toUpperCase(), id, "Restored " + c.noun());
    }

    // ---------- events ----------
    @Transactional
    public EventDto createEvent(long admin, EventRequest r) { EventDto e = events.create(admin, r); log(admin, "CREATE_EVENT", "EVENT", e.id(), e.title()); return e; }
    @Transactional
    public EventDto updateEvent(long admin, long id, EventRequest r) { EventDto e = events.update(admin, id, r); log(admin, "UPDATE_EVENT", "EVENT", id, e.title()); return e; }
    @Transactional
    public void deleteEvent(long admin, long id) {
        List<String> t = jdbc.queryForList("SELECT title FROM events WHERE id = ?", String.class, id);
        events.delete(id);
        log(admin, "DELETE_EVENT", "EVENT", id, t.isEmpty() ? null : t.get(0));
    }
    public List<RegistrantDto> registrations(long eventId) {
        return jdbc.query("SELECT u.id, u.full_name, u.university_id, d.name AS dept, r.registered_at FROM event_registrations r JOIN users u ON u.id = r.user_id "
            + "LEFT JOIN departments d ON d.id = u.department_id WHERE r.event_id = ? ORDER BY r.registered_at, u.full_name",
            (rs, i) -> new RegistrantDto(rs.getLong("id"), rs.getString("full_name"), rs.getString("university_id"), rs.getString("dept"), rs.getTimestamp("registered_at").toLocalDateTime()), eventId);
    }
    @Transactional
    public void removeRegistration(long admin, long eventId, long userId) {
        List<String> t = jdbc.queryForList("SELECT title FROM events WHERE id = ?", String.class, eventId);
        if (t.isEmpty() || jdbc.update("DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?", eventId, userId) == 0) throw new ApiException(HttpStatus.NOT_FOUND, "That registration doesn't exist.");
        notifyUser(userId, "ANNOUNCEMENT", "Your registration for \"" + t.get(0) + "\" was removed by the organizers.", "/events");
        log(admin, "REMOVE_REGISTRATION", "EVENT", eventId, "User #" + userId + " removed from " + t.get(0));
    }

    // ---------- logs & announcements (super admin) ----------
    public List<LogDto> logs(String action, int page) {
        String where = action == null || action.isBlank() ? "" : "WHERE l.action LIKE ? ";
        List<Object> a = new ArrayList<>(); if (!where.isEmpty()) a.add(like(action)); a.add(PAGE); a.add(offset(page));
        RowMapper<LogDto> m = (rs, i) -> new LogDto(rs.getLong("id"), rs.getLong("admin_id"), rs.getString("full_name"), rs.getString("action"), rs.getString("target_type"),
            (Long) rs.getObject("target_id"), rs.getString("details"), rs.getTimestamp("created_at").toLocalDateTime());
        return jdbc.query("SELECT l.id, l.admin_id, a.full_name, l.action, l.target_type, l.target_id, l.details, l.created_at FROM admin_logs l JOIN users a ON a.id = l.admin_id "
            + where + "ORDER BY l.created_at DESC, l.id DESC LIMIT ? OFFSET ?", m, a.toArray());
    }
    @Transactional
    public int announce(long admin, String text) {
        limiter.check("announce:" + admin, 5, 60_000);
        String t = text.trim();
        if (t.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Write the announcement first.");
        int n = jdbc.update("INSERT INTO notifications (user_id, type, content, link) SELECT id, 'ANNOUNCEMENT', ?, NULL FROM users WHERE status = 'ACTIVE'", t);
        log(admin, "SEND_ANNOUNCEMENT", null, null, "Sent to " + n + " students: " + t);
        return n;
    }
}
