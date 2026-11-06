package com.campusx.service;
import com.campusx.dto.CampusDtos.CourseDto;
import com.campusx.dto.SocialDtos.*;
import com.campusx.exception.ApiException;
import com.campusx.security.RateLimiter;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudyService extends BaseService {
    private static final String GROUP_SELECT =
        "SELECT g.id, g.name, g.description, g.is_private, c.id AS course_id, c.code, c.title AS course_title, d.name AS dept_name, g.owner_id, o.full_name AS owner_name, "
        + "(SELECT COUNT(*) FROM group_members m WHERE m.group_id = g.id AND m.status = 'APPROVED') AS members, "
        + "(SELECT m2.status FROM group_members m2 WHERE m2.group_id = g.id AND m2.user_id = ?) AS my_status, "
        + "(SELECT m3.member_role FROM group_members m3 WHERE m3.group_id = g.id AND m3.user_id = ?) AS my_role, "
        + "(SELECT COUNT(*) FROM group_members m4 WHERE m4.group_id = g.id AND m4.status = 'PENDING') AS pending "
        + "FROM study_groups g JOIN courses c ON c.id = g.course_id JOIN departments d ON d.id = c.department_id JOIN users o ON o.id = g.owner_id WHERE 1 = 1 ";
    private final RateLimiter limiter;
    public StudyService(JdbcTemplate jdbc, RateLimiter limiter) { super(jdbc); this.limiter = limiter; }

    private static final RowMapper<GroupDto> GROUP_MAPPER = (rs, i) -> {
        String role = rs.getString("my_role");
        return new GroupDto(rs.getLong("id"), rs.getString("name"), rs.getString("description"), rs.getBoolean("is_private") ? "PRIVATE" : "PUBLIC", rs.getInt("course_id"),
            rs.getString("code"), rs.getString("course_title"), rs.getString("dept_name"), rs.getLong("owner_id"), rs.getString("owner_name"), rs.getInt("members"),
            rs.getString("my_status"), role, "OWNER".equals(role) ? rs.getInt("pending") : 0);
    };

    private Map<String, Object> group(long id) {
        List<Map<String, Object>> r = jdbc.queryForList("SELECT owner_id, is_private, name FROM study_groups WHERE id = ?", id);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "This group no longer exists.");
        return r.get(0);
    }
    private static boolean isPrivate(Map<String, Object> g) { Object o = g.get("is_private"); return Boolean.TRUE.equals(o) || (o instanceof Number n && n.intValue() != 0); }
    private static long ownerOf(Map<String, Object> g) { return ((Number) g.get("owner_id")).longValue(); }
    private Map<String, Object> ownedGroup(long uid, long id) {
        Map<String, Object> g = group(id);
        if (ownerOf(g) != uid) throw new ApiException(HttpStatus.FORBIDDEN, "Only the group owner can do this.");
        return g;
    }
    private GroupDto get(long uid, long id) { return jdbc.query(GROUP_SELECT + "AND g.id = ?", GROUP_MAPPER, uid, uid, id).get(0); }

    public List<GroupDto> list(long uid, String q, Integer dept, Integer course, boolean mine, int page) {
        StringBuilder sql = new StringBuilder(GROUP_SELECT); List<Object> a = new ArrayList<>(List.of(uid, uid));
        if (q != null && !q.isBlank()) { sql.append("AND (g.name LIKE ? OR g.description LIKE ? OR c.code LIKE ?) "); for (int k = 0; k < 3; k++) a.add(like(q)); }
        if (dept != null) { sql.append("AND d.id = ? "); a.add(dept); }
        if (course != null) { sql.append("AND c.id = ? "); a.add(course); }
        if (mine) { sql.append("AND EXISTS(SELECT 1 FROM group_members mm WHERE mm.group_id = g.id AND mm.user_id = ?) "); a.add(uid); }
        sql.append("ORDER BY g.created_at DESC, g.id DESC LIMIT ? OFFSET ?"); a.add(PAGE); a.add(offset(page));
        return jdbc.query(sql.toString(), GROUP_MAPPER, a.toArray());
    }

    @Transactional
    public GroupDto create(long uid, GroupRequest r) {
        limiter.check("group:" + uid, 10, 60_000);
        if (count("SELECT COUNT(*) FROM courses WHERE id = ?", r.courseId()) == 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid course.");
        Map<String, Object> cols = new HashMap<>();
        cols.put("owner_id", uid); cols.put("course_id", r.courseId()); cols.put("name", r.name().trim());
        cols.put("description", r.description() == null || r.description().isBlank() ? null : r.description().trim()); cols.put("is_private", "PRIVATE".equals(r.visibility()));
        long id = insert("study_groups", cols);
        jdbc.update("INSERT INTO group_members (group_id, user_id, member_role, status) VALUES (?, ?, 'OWNER', 'APPROVED')", id, uid);
        return get(uid, id);
    }

    @Transactional
    public Map<String, String> join(long uid, long id) {
        limiter.check("join:" + uid, 20, 60_000);
        Map<String, Object> g = group(id);
        if (count("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ?", id, uid) > 0) throw new ApiException(HttpStatus.CONFLICT, "You are already in this group or have a pending request.");
        String status = isPrivate(g) ? "PENDING" : "APPROVED";
        jdbc.update("INSERT INTO group_members (group_id, user_id, member_role, status) VALUES (?, ?, 'MEMBER', ?)", id, uid, status);
        if ("PENDING".equals(status)) notifyUser(ownerOf(g), "GROUP_UPDATE", nameOf(uid) + " asked to join \"" + g.get("name") + "\"", "/groups");
        return Map.of("status", status);
    }

    @Transactional
    public void leave(long uid, long id) {
        if (ownerOf(group(id)) == uid) throw new ApiException(HttpStatus.BAD_REQUEST, "Owners can't leave their group. Delete it instead.");
        if (jdbc.update("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", id, uid) == 0) throw new ApiException(HttpStatus.NOT_FOUND, "You are not in this group.");
    }

    @Transactional
    public void delete(long uid, boolean staff, long id) {
        Map<String, Object> g = group(id);
        if (ownerOf(g) != uid && !staff) throw new ApiException(HttpStatus.FORBIDDEN, "Only the group owner can delete it.");
        jdbc.update("DELETE FROM study_groups WHERE id = ?", id);
    }

    /** Private groups hide their member list from outsiders; pending requests are visible only to the owner. */
    public List<MemberDto> members(long uid, long id) {
        Map<String, Object> g = group(id);
        boolean owner = ownerOf(g) == uid;
        boolean member = count("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'APPROVED'", id, uid) > 0;
        if (isPrivate(g) && !member) throw new ApiException(HttpStatus.FORBIDDEN, "Join this group to see its members.");
        return jdbc.query("SELECT m.user_id, u.full_name, u.avatar_path, d.name AS dept_name, m.member_role, m.status FROM group_members m JOIN users u ON u.id = m.user_id "
            + "LEFT JOIN departments d ON d.id = u.department_id WHERE m.group_id = ? AND (m.status = 'APPROVED' OR ?) "
            + "ORDER BY (m.member_role = 'OWNER') DESC, (m.status = 'APPROVED') ASC, u.full_name",
            (rs, i) -> new MemberDto(rs.getLong("user_id"), rs.getString("full_name"), url(rs.getString("avatar_path")), rs.getString("dept_name"), rs.getString("member_role"), rs.getString("status")), id, owner);
    }

    @Transactional
    public void decide(long uid, long id, long target, String status) {
        Map<String, Object> g = ownedGroup(uid, id);
        if (count("SELECT COUNT(*) FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'PENDING'", id, target) == 0) throw new ApiException(HttpStatus.NOT_FOUND, "There is no pending request from this student.");
        if ("APPROVED".equals(status)) jdbc.update("UPDATE group_members SET status = 'APPROVED' WHERE group_id = ? AND user_id = ?", id, target);
        else jdbc.update("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", id, target);
        notifyUser(target, "GROUP_UPDATE", "Your request to join \"" + g.get("name") + "\" was " + ("APPROVED".equals(status) ? "approved" : "declined"), "/groups");
    }

    @Transactional
    public void removeMember(long uid, long id, long target) {
        Map<String, Object> g = ownedGroup(uid, id);
        if (target == uid) throw new ApiException(HttpStatus.BAD_REQUEST, "You can't remove yourself as the owner.");
        if (jdbc.update("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", id, target) == 0) throw new ApiException(HttpStatus.NOT_FOUND, "This student is not in the group.");
        notifyUser(target, "GROUP_UPDATE", "You were removed from \"" + g.get("name") + "\"", "/groups");
    }

    // ---------- study partners ----------
    public List<CourseDto> myCourses(long uid) {
        return jdbc.query("SELECT c.id, c.code, c.title, c.department_id FROM user_courses uc JOIN courses c ON c.id = uc.course_id WHERE uc.user_id = ? ORDER BY c.code",
            (rs, i) -> new CourseDto(rs.getInt("id"), rs.getString("code"), rs.getString("title"), rs.getInt("department_id")), uid);
    }

    @Transactional
    public List<CourseDto> setMyCourses(long uid, List<Integer> ids) {
        List<Integer> uniq = new ArrayList<>(new LinkedHashSet<>(ids));
        for (Integer cid : uniq) if (count("SELECT COUNT(*) FROM courses WHERE id = ?", cid) == 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown course.");
        jdbc.update("DELETE FROM user_courses WHERE user_id = ?", uid);
        jdbc.batchUpdate("INSERT INTO user_courses (user_id, course_id) VALUES (?, ?)", uniq, uniq.size(), (ps, cid) -> { ps.setLong(1, uid); ps.setInt(2, cid); });
        return myCourses(uid);
    }

    /** Only students who listed at least one course appear here (that is their opt-in). Email and university ID are never exposed. */
    public List<StudentDto> students(long uid, String q, Integer dept, Integer course, int page) {
        StringBuilder sql = new StringBuilder("SELECT u.id, u.full_name, u.avatar_path, d.name AS dept_name, u.semester, u.bio, u.skills, "
            + "(SELECT GROUP_CONCAT(c.code ORDER BY c.code SEPARATOR ', ') FROM user_courses uc JOIN courses c ON c.id = uc.course_id WHERE uc.user_id = u.id) AS courses "
            + "FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.status = 'ACTIVE' AND u.id <> ? "
            + "AND EXISTS(SELECT 1 FROM user_courses x WHERE x.user_id = u.id) ");
        List<Object> a = new ArrayList<>(); a.add(uid);
        // Each word may match part of a name or skills, or a complete university ID (IDs are never matched partially, so they can't be guessed by prefix).
        if (q != null && !q.isBlank()) for (String w : q.trim().split("\\s+")) { sql.append("AND (u.full_name LIKE ? OR u.skills LIKE ? OR u.university_id = ?) "); a.add(like(w)); a.add(like(w)); a.add(w); }
        if (dept != null) { sql.append("AND u.department_id = ? "); a.add(dept); }
        if (course != null) { sql.append("AND EXISTS(SELECT 1 FROM user_courses y WHERE y.user_id = u.id AND y.course_id = ?) "); a.add(course); }
        sql.append("ORDER BY u.full_name, u.id LIMIT ? OFFSET ?"); a.add(PAGE); a.add(offset(page));
        return jdbc.query(sql.toString(), (rs, i) -> new StudentDto(rs.getLong("id"), rs.getString("full_name"), url(rs.getString("avatar_path")), rs.getString("dept_name"),
            (Integer) rs.getObject("semester"), rs.getString("bio"), rs.getString("skills"), rs.getString("courses")), a.toArray());
    }
}
