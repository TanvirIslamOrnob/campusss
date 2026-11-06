package com.campusx.service;
import com.campusx.dto.MessagingDtos.NotificationDto;
import com.campusx.exception.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService extends BaseService {
    public NotificationService(JdbcTemplate jdbc) { super(jdbc); }

    public List<NotificationDto> list(long uid, boolean unreadOnly, int page) {
        return jdbc.query("SELECT id, type, content, link, is_read, created_at FROM notifications WHERE user_id = ? " + (unreadOnly ? "AND is_read = FALSE " : "")
            + "ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?",
            (rs, i) -> new NotificationDto(rs.getLong("id"), rs.getString("type"), rs.getString("content"), rs.getString("link"), rs.getBoolean("is_read"), rs.getTimestamp("created_at").toLocalDateTime()),
            uid, PAGE, offset(page));
    }
    @Transactional
    public void markRead(long uid, long id) {
        if (count("SELECT COUNT(*) FROM notifications WHERE id = ? AND user_id = ?", id, uid) == 0) throw new ApiException(HttpStatus.NOT_FOUND, "Notification not found."); // someone else's id looks the same as a missing one
        jdbc.update("UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?", id, uid);
    }
    @Transactional public void markAllRead(long uid) { jdbc.update("UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE", uid); }
}
