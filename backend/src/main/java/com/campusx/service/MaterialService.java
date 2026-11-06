package com.campusx.service;
import com.campusx.dto.CampusDtos.*;
import com.campusx.exception.ApiException;
import com.campusx.security.RateLimiter;
import java.io.IOException;
import java.nio.file.Path;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MaterialService extends BaseService {
    public record FileInfo(Path path, String filename) {}
    private static final String SELECT =
        "SELECT m.id, m.title, c.id AS course_id, c.code, c.title AS course_title, d.name AS dept_name, m.uploader_id, u.full_name, m.file_type, m.created_at, "
        + "EXISTS(SELECT 1 FROM bookmarks b WHERE b.material_id = m.id AND b.user_id = ?) AS bookmarked "
        + "FROM study_materials m JOIN courses c ON c.id = m.course_id JOIN departments d ON d.id = c.department_id JOIN users u ON u.id = m.uploader_id "
        + "WHERE m.is_removed = FALSE ";
    private final DocumentStore docs; private final RateLimiter limiter;
    public MaterialService(JdbcTemplate jdbc, DocumentStore docs, RateLimiter limiter) { super(jdbc); this.docs = docs; this.limiter = limiter; }

    private RowMapper<MaterialDto> mapper(long uid) {
        return (rs, i) -> new MaterialDto(rs.getLong("id"), rs.getString("title"), rs.getInt("course_id"), rs.getString("code"), rs.getString("course_title"),
            rs.getString("dept_name"), rs.getLong("uploader_id"), rs.getString("full_name"), rs.getString("file_type"),
            rs.getTimestamp("created_at").toLocalDateTime(), rs.getBoolean("bookmarked"), rs.getLong("uploader_id") == uid);
    }
    private void requireMaterial(long id) {
        if (count("SELECT COUNT(*) FROM study_materials WHERE id = ? AND is_removed = FALSE", id) == 0) throw new ApiException(HttpStatus.NOT_FOUND, "This material no longer exists.");
    }

    public List<CourseDto> courses(Integer deptId) {
        String sql = "SELECT id, code, title, department_id FROM courses " + (deptId == null ? "" : "WHERE department_id = ? ") + "ORDER BY code";
        RowMapper<CourseDto> m = (rs, i) -> new CourseDto(rs.getInt("id"), rs.getString("code"), rs.getString("title"), rs.getInt("department_id"));
        return deptId == null ? jdbc.query(sql, m) : jdbc.query(sql, m, deptId);
    }

    public List<MaterialDto> list(long uid, String q, Integer dept, Integer course, boolean bookmarked, int page) {
        StringBuilder sql = new StringBuilder(SELECT); List<Object> a = new ArrayList<>(); a.add(uid);
        if (q != null && !q.isBlank()) { sql.append("AND (m.title LIKE ? OR c.code LIKE ?) "); a.add(like(q)); a.add(like(q)); }
        if (dept != null) { sql.append("AND d.id = ? "); a.add(dept); }
        if (course != null) { sql.append("AND c.id = ? "); a.add(course); }
        if (bookmarked) { sql.append("AND EXISTS(SELECT 1 FROM bookmarks b2 WHERE b2.material_id = m.id AND b2.user_id = ?) "); a.add(uid); }
        sql.append("ORDER BY m.created_at DESC, m.id DESC LIMIT ? OFFSET ?"); a.add(PAGE); a.add(offset(page));
        return jdbc.query(sql.toString(), mapper(uid), a.toArray());
    }

    @Transactional
    public MaterialDto create(long uid, String title, int courseId, MultipartFile file) throws IOException {
        limiter.check("material:" + uid, 10, 60_000);
        String t = title == null ? "" : title.trim();
        if (t.isEmpty() || t.length() > 150) throw new ApiException(HttpStatus.BAD_REQUEST, "Give the material a title (up to 150 characters).");
        if (count("SELECT COUNT(*) FROM courses WHERE id = ?", courseId) == 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid course.");
        if (file == null || file.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a file to upload.");
        DocumentStore.Saved s = docs.save(file);
        long id = insert("study_materials", Map.of("uploader_id", uid, "course_id", courseId, "title", t, "file_path", s.path(), "file_type", s.type()));
        return jdbc.query(SELECT + "AND m.id = ?", mapper(uid), uid, id).get(0);
    }

    @Transactional
    public void delete(long uid, boolean staff, long id) {
        List<Map<String, Object>> r = jdbc.queryForList("SELECT uploader_id, file_path FROM study_materials WHERE id = ?", id);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "This material no longer exists.");
        if (((Number) r.get(0).get("uploader_id")).longValue() != uid && !staff) throw new ApiException(HttpStatus.FORBIDDEN, "You can only delete your own uploads.");
        jdbc.update("DELETE FROM study_materials WHERE id = ?", id);
        docs.delete((String) r.get(0).get("file_path"));
    }

    @Transactional
    public Map<String, Object> toggleBookmark(long uid, long id) {
        requireMaterial(id);
        boolean added = jdbc.update("DELETE FROM bookmarks WHERE user_id = ? AND material_id = ?", uid, id) == 0;
        if (added) jdbc.update("INSERT IGNORE INTO bookmarks (user_id, material_id) VALUES (?, ?)", uid, id);
        return Map.of("bookmarked", added);
    }

    @Transactional
    public void report(long uid, long id, String reason) {
        requireMaterial(id);
        if (count("SELECT COUNT(*) FROM reports WHERE reporter_id = ? AND target_type = 'MATERIAL' AND target_id = ? AND status IN ('PENDING','INVESTIGATING')", uid, id) > 0)
            throw new ApiException(HttpStatus.CONFLICT, "You already reported this file. Moderators are reviewing it.");
        jdbc.update("INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, 'MATERIAL', ?, ?)", uid, id, reason.trim());
    }

    public FileInfo download(long id) {
        List<Map<String, Object>> r = jdbc.queryForList("SELECT title, file_path, file_type FROM study_materials WHERE id = ? AND is_removed = FALSE", id);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "This material no longer exists.");
        String base = ((String) r.get(0).get("title")).replaceAll("[^A-Za-z0-9 _.-]", "").trim();
        return new FileInfo(docs.resolve((String) r.get(0).get("file_path")), (base.isEmpty() ? "material" : base) + "." + r.get(0).get("file_type"));
    }
}
