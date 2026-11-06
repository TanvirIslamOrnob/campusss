package com.campusx.service;
import com.campusx.dto.MessagingDtos.*;
import com.campusx.exception.ApiException;
import com.campusx.security.RateLimiter;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** One-to-one messaging. The browser polls for new messages (no websockets yet). */
@Service
public class MessageService extends BaseService {
    public static final int THREAD_PAGE = 30;
    private static final String UNREAD_MESSAGES =
        "SELECT COUNT(*) FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE (c.user_a = ? OR c.user_b = ?) AND m.sender_id <> ? AND m.read_at IS NULL AND m.unsent_at IS NULL";
    /** Messages a user chose "delete for me" on are invisible to them; the other person still sees them. */
    private static final String VISIBLE = "AND NOT EXISTS (SELECT 1 FROM message_hidden h WHERE h.message_id = m.id AND h.user_id = ?) ";
    private final RateLimiter limiter;
    public MessageService(JdbcTemplate jdbc, RateLimiter limiter) { super(jdbc); this.limiter = limiter; }

    /** Returns the other participant's id. Non-participants get a 404 so conversation ids can't be probed. */
    private long otherParticipant(long uid, long convId) {
        List<Map<String, Object>> r = jdbc.queryForList("SELECT user_a, user_b FROM conversations WHERE id = ?", convId);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Conversation not found.");
        long a = ((Number) r.get(0).get("user_a")).longValue(), b = ((Number) r.get(0).get("user_b")).longValue();
        if (a != uid && b != uid) throw new ApiException(HttpStatus.NOT_FOUND, "Conversation not found.");
        return a == uid ? b : a;
    }

    public List<ConversationDto> conversations(long uid) {
        return jdbc.query(
            "SELECT c.id, o.id AS other_id, o.full_name, o.avatar_path, "
            + "(SELECT IF(m.unsent_at IS NULL, m.body, 'Message unsent') FROM messages m WHERE m.conversation_id = c.id " + VISIBLE + "ORDER BY m.id DESC LIMIT 1) AS last_body, "
            + "(SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id " + VISIBLE + "ORDER BY m.id DESC LIMIT 1) AS last_at, "
            + "(SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id " + VISIBLE + "ORDER BY m.id DESC LIMIT 1) AS last_sender, "
            + "(SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id <> ? AND m.read_at IS NULL AND m.unsent_at IS NULL) AS unread "
            + "FROM conversations c JOIN users o ON o.id = IF(c.user_a = ?, c.user_b, c.user_a) WHERE c.user_a = ? OR c.user_b = ? "
            + "ORDER BY last_at DESC, c.id DESC LIMIT 100",
            (rs, i) -> new ConversationDto(rs.getLong("id"), rs.getLong("other_id"), rs.getString("full_name"), url(rs.getString("avatar_path")), rs.getString("last_body"),
                rs.getTimestamp("last_at") == null ? null : rs.getTimestamp("last_at").toLocalDateTime(), rs.getLong("last_sender") == uid, rs.getInt("unread")),
            uid, uid, uid, uid, uid, uid, uid);
    }

    /** Newest THREAD_PAGE messages (oldest first). Pass `before` to page back. Opening the latest page marks incoming messages as read. */
    @Transactional
    public List<MessageDto> messages(long uid, long convId, Long before) {
        otherParticipant(uid, convId);
        List<Object> a = new ArrayList<>(List.of(convId, uid));
        String sql = "SELECT m.id, m.sender_id, m.body, m.created_at, m.read_at, m.unsent_at FROM messages m WHERE m.conversation_id = ? " + VISIBLE + (before != null ? "AND m.id < ? " : "") + "ORDER BY m.id DESC LIMIT ?";
        if (before != null) a.add(before);
        a.add(THREAD_PAGE);
        List<MessageDto> list = new ArrayList<>(jdbc.query(sql, (rs, i) -> new MessageDto(rs.getLong("id"), rs.getLong("sender_id"), rs.getObject("unsent_at") != null ? "" : rs.getString("body"),
            rs.getTimestamp("created_at").toLocalDateTime(), rs.getLong("sender_id") == uid, rs.getObject("read_at") != null, rs.getObject("unsent_at") != null), a.toArray()));
        Collections.reverse(list);
        if (before == null) markRead(uid, convId);
        return list;
    }

    private void markRead(long uid, long convId) {
        jdbc.update("UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE conversation_id = ? AND sender_id <> ? AND read_at IS NULL", convId, uid);
        if (count(UNREAD_MESSAGES, uid, uid, uid) == 0) jdbc.update("UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND type = 'MESSAGE' AND is_read = FALSE", uid);
    }

    @Transactional
    public MessageDto send(long uid, long convId, String text) {
        limiter.check("msg:" + uid, 30, 60_000);
        long other = otherParticipant(uid, convId);
        String body = text.trim();
        if (body.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST, "Write a message first.");
        long id = insert("messages", Map.of("conversation_id", convId, "sender_id", uid, "body", body));
        String note = nameOf(uid) + " sent you a message"; // one unread notification per sender is enough
        if (count("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND type = 'MESSAGE' AND is_read = FALSE AND content = ?", other, note) == 0) notifyUser(other, "MESSAGE", note, "/messages");
        return jdbc.query("SELECT id, sender_id, body, created_at, read_at FROM messages WHERE id = ?", (rs, i) -> new MessageDto(rs.getLong("id"), rs.getLong("sender_id"), rs.getString("body"),
            rs.getTimestamp("created_at").toLocalDateTime(), true, false, false), id).get(0);
    }

    /**
     * scope "everyone": only the sender can unsend; the text is erased for both people and replaced by "This message was unsent".
     * scope "me": either person can hide a message from their own view; the other person keeps seeing it.
     */
    @Transactional
    public void deleteMessage(long uid, long convId, long msgId, String scope) {
        otherParticipant(uid, convId);
        List<Map<String, Object>> r = jdbc.queryForList("SELECT sender_id, unsent_at FROM messages WHERE id = ? AND conversation_id = ?", msgId, convId);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Message not found.");
        if ("everyone".equals(scope)) {
            if (((Number) r.get(0).get("sender_id")).longValue() != uid) throw new ApiException(HttpStatus.FORBIDDEN, "You can only unsend your own messages.");
            jdbc.update("UPDATE messages SET body = '', unsent_at = COALESCE(unsent_at, CURRENT_TIMESTAMP) WHERE id = ?", msgId);
        } else if ("me".equals(scope)) {
            jdbc.update("INSERT IGNORE INTO message_hidden (message_id, user_id) VALUES (?, ?)", msgId, uid);
        } else throw new ApiException(HttpStatus.BAD_REQUEST, "Choose \"me\" or \"everyone\".");
    }

    @Transactional
    public long start(long uid, long otherId, String text) {
        if (otherId == uid) throw new ApiException(HttpStatus.BAD_REQUEST, "You can't message yourself.");
        if (count("SELECT COUNT(*) FROM users WHERE id = ? AND status = 'ACTIVE'", otherId) == 0) throw new ApiException(HttpStatus.NOT_FOUND, "That student can't be messaged.");
        long a = Math.min(uid, otherId), b = Math.max(uid, otherId);
        jdbc.update("INSERT IGNORE INTO conversations (user_a, user_b) VALUES (?, ?)", a, b);
        Long conv = jdbc.queryForObject("SELECT id FROM conversations WHERE user_a = ? AND user_b = ?", Long.class, a, b);
        send(uid, conv, text);
        return conv;
    }

    public PublicUserDto publicUser(long id) {
        List<PublicUserDto> r = jdbc.query("SELECT u.id, u.full_name, u.avatar_path, d.name AS dept FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.id = ? AND u.status = 'ACTIVE'",
            (rs, i) -> new PublicUserDto(rs.getLong("id"), rs.getString("full_name"), url(rs.getString("avatar_path")), rs.getString("dept")), id);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Student not found.");
        return r.get(0);
    }

    public BadgesDto badges(long uid) {
        return new BadgesDto(count(UNREAD_MESSAGES, uid, uid, uid), count("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = FALSE", uid));
    }
}
