package com.campusx.service;
import com.campusx.dto.PostDtos.*;
import com.campusx.exception.ApiException;
import com.campusx.security.RateLimiter;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.SimpleJdbcInsert;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** Uses plain SQL (JdbcTemplate) so the feed's counts and "liked by me" flag come back in one query. */
@Service
public class PostService {
    public static final int PAGE = 10;
    private static final String SELECT =
        "SELECT p.id, p.author_id, u.full_name, u.avatar_path, p.content, p.image_path, p.created_at, "
        + "(SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes, "
        + "(SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments, "
        + "EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked "
        + "FROM posts p JOIN users u ON u.id = p.author_id WHERE p.is_removed = FALSE ";

    private final JdbcTemplate jdbc; private final ImageStore images; private final RateLimiter limiter;
    public PostService(JdbcTemplate jdbc, ImageStore images, RateLimiter limiter) { this.jdbc = jdbc; this.images = images; this.limiter = limiter; }

    private static String url(String path) { return path == null ? null : "/uploads/" + path; }
    private RowMapper<PostDto> mapper(long uid) {
        return (rs, i) -> new PostDto(rs.getLong("id"), rs.getLong("author_id"), rs.getString("full_name"), url(rs.getString("avatar_path")),
            rs.getString("content"), url(rs.getString("image_path")), rs.getTimestamp("created_at").toLocalDateTime(),
            rs.getInt("likes"), rs.getInt("comments"), rs.getBoolean("liked"), rs.getLong("author_id") == uid);
    }
    private int count(String sql, Object... args) { Integer n = jdbc.queryForObject(sql, Integer.class, args); return n == null ? 0 : n; }
    private static String escapeLike(String s) { return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_"); }

    private long authorOf(long postId) {
        List<Long> r = jdbc.queryForList("SELECT author_id FROM posts WHERE id = ? AND is_removed = FALSE", Long.class, postId);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "This post no longer exists.");
        return r.get(0);
    }
    private void notifyAuthor(long authorId, long actorId, String type, String verb) {
        if (authorId == actorId) return;
        String name = jdbc.queryForObject("SELECT full_name FROM users WHERE id = ?", String.class, actorId);
        jdbc.update("INSERT INTO notifications (user_id, type, content, link) VALUES (?, ?, ?, '/community')", authorId, type, name + " " + verb);
    }

    public List<PostDto> list(long uid, String q, int page) {
        int offset = Math.max(page, 0) * PAGE;
        String order = "ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?";
        if (q == null || q.isBlank()) return jdbc.query(SELECT + order, mapper(uid), uid, PAGE, offset);
        return jdbc.query(SELECT + "AND p.content LIKE ? " + order, mapper(uid), uid, "%" + escapeLike(q.trim()) + "%", PAGE, offset);
    }
    private PostDto get(long uid, long id) { return jdbc.query(SELECT + "AND p.id = ?", mapper(uid), uid, id).get(0); }

    @Transactional
    public PostDto create(long uid, String content, MultipartFile image) throws IOException {
        limiter.check("post:" + uid, 10, 60_000);
        String text = content == null ? "" : content.trim();
        if (text.isEmpty() || text.length() > 2000) throw new ApiException(HttpStatus.BAD_REQUEST, "Write something (up to 2000 characters).");
        String path = image == null || image.isEmpty() ? null : images.save(image, "posts", 5 * 1024 * 1024);
        Number id = new SimpleJdbcInsert(jdbc).withTableName("posts").usingGeneratedKeyColumns("id").usingColumns("author_id", "content", "image_path")
            .executeAndReturnKey(Map.of("author_id", uid, "content", text, "image_path", path == null ? "" : path));
        if (path == null) jdbc.update("UPDATE posts SET image_path = NULL WHERE id = ?", id.longValue());
        return get(uid, id.longValue());
    }

    @Transactional
    public void delete(long uid, boolean isStaff, long id) {
        List<Map<String, Object>> r = jdbc.queryForList("SELECT author_id, image_path FROM posts WHERE id = ?", id);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "This post no longer exists.");
        if (((Number) r.get(0).get("author_id")).longValue() != uid && !isStaff) throw new ApiException(HttpStatus.FORBIDDEN, "You can only delete your own posts.");
        jdbc.update("DELETE FROM posts WHERE id = ?", id);
        images.delete((String) r.get(0).get("image_path"));
        if (((Number) r.get(0).get("author_id")).longValue() != uid) staffLog(uid, "DELETE_POST", "POST", id, "Deleted another user's post");
    }

    /** Authors delete their own comments, post owners can clear comments on their post, and staff can delete any comment. */
    @Transactional
    public List<CommentDto> deleteComment(long uid, boolean isStaff, long postId, long commentId) {
        long postAuthor = authorOf(postId);
        List<Long> c = jdbc.queryForList("SELECT author_id FROM comments WHERE id = ? AND post_id = ?", Long.class, commentId, postId);
        if (c.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "This comment no longer exists.");
        long commentAuthor = c.get(0);
        if (commentAuthor != uid && postAuthor != uid && !isStaff) throw new ApiException(HttpStatus.FORBIDDEN, "You can only delete your own comments.");
        jdbc.update("DELETE FROM comments WHERE id = ?", commentId);
        if (commentAuthor != uid && isStaff && postAuthor != uid) staffLog(uid, "DELETE_COMMENT", "COMMENT", commentId, "Deleted a comment on post #" + postId);
        return comments(postId);
    }

    private void staffLog(long uid, String action, String type, long id, String details) {
        if (count("SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND r.name IN ('MODERATOR','SUPER_ADMIN')", uid) > 0)
            jdbc.update("INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)", uid, action, type, id, details);
    }

    @Transactional
    public Map<String, Object> toggleLike(long uid, long id) {
        long author = authorOf(id);
        boolean liked = jdbc.update("DELETE FROM likes WHERE post_id = ? AND user_id = ?", id, uid) == 0;
        if (liked) {
            jdbc.update("INSERT IGNORE INTO likes (post_id, user_id) VALUES (?, ?)", id, uid);
            notifyAuthor(author, uid, "LIKE", "liked your post");
        }
        return Map.of("liked", liked, "likes", count("SELECT COUNT(*) FROM likes WHERE post_id = ?", id));
    }

    public List<CommentDto> comments(long id) {
        authorOf(id);
        return jdbc.query("SELECT c.id, c.author_id, u.full_name, u.avatar_path, c.content, c.created_at FROM comments c JOIN users u ON u.id = c.author_id "
            + "WHERE c.post_id = ? ORDER BY c.created_at, c.id LIMIT 200",
            (rs, i) -> new CommentDto(rs.getLong("id"), rs.getLong("author_id"), rs.getString("full_name"), url(rs.getString("avatar_path")),
                rs.getString("content"), rs.getTimestamp("created_at").toLocalDateTime()), id);
    }

    @Transactional
    public List<CommentDto> addComment(long uid, long id, String text) {
        limiter.check("comment:" + uid, 20, 60_000);
        long author = authorOf(id);
        jdbc.update("INSERT INTO comments (post_id, author_id, content) VALUES (?, ?, ?)", id, uid, text.trim());
        notifyAuthor(author, uid, "COMMENT", "commented on your post");
        return comments(id);
    }

    @Transactional
    public void report(long uid, long id, String reason) {
        long author = authorOf(id);
        if (author == uid) throw new ApiException(HttpStatus.BAD_REQUEST, "You can't report your own post.");
        if (count("SELECT COUNT(*) FROM reports WHERE reporter_id = ? AND target_type = 'POST' AND target_id = ? AND status IN ('PENDING','INVESTIGATING')", uid, id) > 0)
            throw new ApiException(HttpStatus.CONFLICT, "You already reported this post. Moderators are reviewing it.");
        jdbc.update("INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, 'POST', ?, ?)", uid, id, reason.trim());
    }

    public DashboardDto dashboard(long uid) {
        return new DashboardDto(
            count("SELECT COUNT(*) FROM posts WHERE author_id = ? AND is_removed = FALSE", uid),
            count("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = FALSE", uid),
            jdbc.query(SELECT + "ORDER BY p.created_at DESC, p.id DESC LIMIT 5", mapper(uid), uid));
    }
}
