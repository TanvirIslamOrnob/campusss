package com.campusx.service;
import com.campusx.dto.SocialDtos.*;
import com.campusx.exception.ApiException;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventService extends BaseService {
    private static final String SELECT =
        "SELECT e.id, e.title, e.description, e.venue, e.starts_at, e.capacity, "
        + "(SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id) AS regs, "
        + "EXISTS(SELECT 1 FROM event_registrations r2 WHERE r2.event_id = e.id AND r2.user_id = ?) AS registered, "
        + "e.organizer_id, o.full_name AS organizer, d.name AS org_dept "
        + "FROM events e JOIN users o ON o.id = e.organizer_id LEFT JOIN departments d ON d.id = o.department_id WHERE 1 = 1 ";
    public EventService(JdbcTemplate jdbc) { super(jdbc); }

    private static final RowMapper<EventDto> MAPPER = (rs, i) -> new EventDto(rs.getLong("id"), rs.getString("title"), rs.getString("description"), rs.getString("venue"),
        rs.getObject("starts_at", LocalDateTime.class), (Integer) rs.getObject("capacity"), rs.getInt("regs"), rs.getBoolean("registered"),
        rs.getLong("organizer_id"), rs.getString("organizer"), rs.getString("org_dept"));

    private EventDto get(long uid, long id) {
        List<EventDto> r = jdbc.query(SELECT + "AND e.id = ?", MAPPER, uid, id);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "This event no longer exists.");
        return r.get(0);
    }

    public List<EventDto> list(long uid, String q, boolean mine, boolean past, int page) {
        StringBuilder sql = new StringBuilder(SELECT); List<Object> a = new ArrayList<>(); a.add(uid);
        sql.append(past ? "AND e.starts_at < ? " : "AND e.starts_at >= ? "); a.add(LocalDateTime.now());
        if (q != null && !q.isBlank()) { sql.append("AND (e.title LIKE ? OR e.venue LIKE ? OR e.description LIKE ?) "); for (int k = 0; k < 3; k++) a.add(like(q)); }
        if (mine) { sql.append("AND EXISTS(SELECT 1 FROM event_registrations r3 WHERE r3.event_id = e.id AND r3.user_id = ?) "); a.add(uid); }
        sql.append(past ? "ORDER BY e.starts_at DESC, e.id DESC " : "ORDER BY e.starts_at ASC, e.id ASC ").append("LIMIT ? OFFSET ?"); a.add(PAGE); a.add(offset(page));
        return jdbc.query(sql.toString(), MAPPER, a.toArray());
    }

    /** The event row is locked while we count, so two students can't take the last seat at the same time. */
    @Transactional
    public EventDto register(long uid, long id) {
        List<Map<String, Object>> r = jdbc.queryForList("SELECT capacity, starts_at FROM events WHERE id = ? FOR UPDATE", id);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "This event no longer exists.");
        LocalDateTime starts = jdbc.queryForObject("SELECT starts_at FROM events WHERE id = ?", LocalDateTime.class, id);
        if (starts != null && starts.isBefore(LocalDateTime.now())) throw new ApiException(HttpStatus.CONFLICT, "This event has already started.");
        if (count("SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND user_id = ?", id, uid) > 0) throw new ApiException(HttpStatus.CONFLICT, "You are already registered.");
        Object cap = r.get(0).get("capacity");
        if (cap != null && count("SELECT COUNT(*) FROM event_registrations WHERE event_id = ?", id) >= ((Number) cap).intValue()) throw new ApiException(HttpStatus.CONFLICT, "This event is full.");
        jdbc.update("INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)", id, uid);
        return get(uid, id);
    }

    @Transactional
    public EventDto cancel(long uid, long id) {
        if (jdbc.update("DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?", id, uid) == 0) throw new ApiException(HttpStatus.NOT_FOUND, "You are not registered for this event.");
        return get(uid, id);
    }

    // ---------- staff only (the controller checks the role) ----------
    private static void validate(EventRequest r) { if (r.title().isBlank() || r.venue().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Title and venue are required."); }

    @Transactional
    public EventDto create(long uid, EventRequest r) {
        validate(r);
        if (r.startsAt().isBefore(LocalDateTime.now())) throw new ApiException(HttpStatus.BAD_REQUEST, "The start time must be in the future.");
        Map<String, Object> cols = new HashMap<>();
        cols.put("organizer_id", uid); cols.put("title", r.title().trim()); cols.put("venue", r.venue().trim()); cols.put("starts_at", r.startsAt());
        cols.put("description", r.description() == null || r.description().isBlank() ? null : r.description().trim()); cols.put("capacity", r.capacity());
        return get(uid, insert("events", cols));
    }
    @Transactional
    public EventDto update(long uid, long id, EventRequest r) {
        validate(r); get(uid, id);
        jdbc.update("UPDATE events SET title = ?, description = ?, venue = ?, starts_at = ?, capacity = ? WHERE id = ?", r.title().trim(), r.description(), r.venue().trim(), r.startsAt(), r.capacity(), id);
        return get(uid, id);
    }
    @Transactional public void delete(long id) { if (jdbc.update("DELETE FROM events WHERE id = ?", id) == 0) throw new ApiException(HttpStatus.NOT_FOUND, "This event no longer exists."); }
}
