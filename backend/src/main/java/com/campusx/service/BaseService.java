package com.campusx.service;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.SimpleJdbcInsert;

/** Small helpers shared by the Phase 4 services. */
public abstract class BaseService {
    public static final int PAGE = 10;
    protected final JdbcTemplate jdbc;
    protected BaseService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    protected int count(String sql, Object... args) { Integer n = jdbc.queryForObject(sql, Integer.class, args); return n == null ? 0 : n; }
    protected static String url(String path) { return path == null ? null : "/uploads/" + path; }
    protected static String like(String q) { return "%" + q.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"; }
    protected static int offset(int page) { return Math.max(page, 0) * PAGE; }
    protected String nameOf(long uid) { return jdbc.queryForObject("SELECT full_name FROM users WHERE id = ?", String.class, uid); }
    protected void notifyUser(long userId, String type, String content, String link) {
        jdbc.update("INSERT INTO notifications (user_id, type, content, link) VALUES (?, ?, ?, ?)", userId, type, content, link);
    }
    protected long insert(String table, Map<String, Object> cols) {
        // usingColumns: only write the columns we pass, so DEFAULT values (created_at etc.) apply instead of being overwritten with NULL.
        return new SimpleJdbcInsert(jdbc).withTableName(table).usingGeneratedKeyColumns("id").usingColumns(cols.keySet().toArray(new String[0])).executeAndReturnKey(cols).longValue();
    }
}
