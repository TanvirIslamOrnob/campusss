package com.campusx.service;
import com.campusx.dto.CampusDtos.*;
import com.campusx.exception.ApiException;
import com.campusx.security.RateLimiter;
import java.io.IOException;
import java.time.LocalDate;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LostFoundService extends BaseService {
    private static final String SELECT =
        "SELECT i.id, i.reporter_id, u.full_name, i.type, i.title, i.description, i.location, i.item_date, i.image_path, i.status, i.created_at, "
        + "(SELECT ic.status FROM item_claims ic WHERE ic.item_id = i.id AND ic.claimant_id = ?) AS my_claim, "
        + "(SELECT COUNT(*) FROM item_claims ic2 WHERE ic2.item_id = i.id AND ic2.status = 'PENDING') AS pending "
        + "FROM lost_found_items i JOIN users u ON u.id = i.reporter_id WHERE 1 = 1 ";
    private static final String CLAIM_SELECT =
        "SELECT c.id, c.item_id, i.title, c.claimant_id, u.full_name, c.message, c.status, c.created_at "
        + "FROM item_claims c JOIN lost_found_items i ON i.id = c.item_id JOIN users u ON u.id = c.claimant_id ";
    private final ImageStore images; private final RateLimiter limiter;
    public LostFoundService(JdbcTemplate jdbc, ImageStore images, RateLimiter limiter) { super(jdbc); this.images = images; this.limiter = limiter; }

    private RowMapper<ItemDto> mapper(long uid) {
        return (rs, i) -> { boolean mine = rs.getLong("reporter_id") == uid;
            return new ItemDto(rs.getLong("id"), rs.getLong("reporter_id"), rs.getString("full_name"), rs.getString("type"), rs.getString("title"), rs.getString("description"),
                rs.getString("location"), rs.getDate("item_date").toLocalDate(), url(rs.getString("image_path")), rs.getString("status"), rs.getTimestamp("created_at").toLocalDateTime(),
                mine, rs.getString("my_claim"), mine ? rs.getInt("pending") : 0); };
    }
    private static final RowMapper<ClaimDto> CLAIM_MAPPER = (rs, i) -> new ClaimDto(rs.getLong("id"), rs.getLong("item_id"), rs.getString("title"),
        rs.getLong("claimant_id"), rs.getString("full_name"), rs.getString("message"), rs.getString("status"), rs.getTimestamp("created_at").toLocalDateTime());

    private Map<String, Object> item(long id) {
        List<Map<String, Object>> r = jdbc.queryForList("SELECT reporter_id, status, title, image_path FROM lost_found_items WHERE id = ?", id);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "This item no longer exists.");
        return r.get(0);
    }

    public List<ItemDto> list(long uid, String q, String type, boolean mine, int page) {
        StringBuilder sql = new StringBuilder(SELECT); List<Object> a = new ArrayList<>(); a.add(uid);
        if (q != null && !q.isBlank()) { sql.append("AND (i.title LIKE ? OR i.description LIKE ? OR i.location LIKE ?) "); for (int k = 0; k < 3; k++) a.add(like(q)); }
        if ("LOST".equals(type) || "FOUND".equals(type)) { sql.append("AND i.type = ? "); a.add(type); }
        if (mine) { sql.append("AND i.reporter_id = ? "); a.add(uid); }
        sql.append("ORDER BY (i.status = 'OPEN') DESC, i.created_at DESC, i.id DESC LIMIT ? OFFSET ?"); a.add(PAGE); a.add(offset(page));
        return jdbc.query(sql.toString(), mapper(uid), a.toArray());
    }

    @Transactional
    public ItemDto create(long uid, String type, String title, String description, String location, LocalDate date, MultipartFile image) throws IOException {
        limiter.check("item:" + uid, 10, 60_000);
        if (!"LOST".equals(type) && !"FOUND".equals(type)) throw new ApiException(HttpStatus.BAD_REQUEST, "Choose lost or found.");
        String t = title == null ? "" : title.trim(), loc = location == null ? "" : location.trim();
        if (t.isEmpty() || t.length() > 150) throw new ApiException(HttpStatus.BAD_REQUEST, "Give the item a title (up to 150 characters).");
        if (loc.isEmpty() || loc.length() > 150) throw new ApiException(HttpStatus.BAD_REQUEST, "Say where it was lost or found.");
        if (date.isAfter(LocalDate.now())) throw new ApiException(HttpStatus.BAD_REQUEST, "The date can't be in the future.");
        if (description != null && description.length() > 2000) throw new ApiException(HttpStatus.BAD_REQUEST, "Description is too long.");
        Map<String, Object> cols = new HashMap<>();
        cols.put("reporter_id", uid); cols.put("type", type); cols.put("title", t); cols.put("location", loc); cols.put("item_date", java.sql.Date.valueOf(date));
        cols.put("description", description == null || description.isBlank() ? null : description.trim());
        cols.put("image_path", image == null || image.isEmpty() ? null : images.save(image, "items", 5 * 1024 * 1024));
        long id = insert("lost_found_items", cols);
        return jdbc.query(SELECT + "AND i.id = ?", mapper(uid), uid, id).get(0);
    }

    @Transactional
    public void delete(long uid, boolean staff, long id) {
        Map<String, Object> it = item(id);
        if (((Number) it.get("reporter_id")).longValue() != uid && !staff) throw new ApiException(HttpStatus.FORBIDDEN, "You can only delete your own posts.");
        jdbc.update("DELETE FROM lost_found_items WHERE id = ?", id);
        images.delete((String) it.get("image_path"));
    }

    @Transactional
    public void claim(long uid, long id, String text) {
        limiter.check("claim:" + uid, 10, 60_000);
        Map<String, Object> it = item(id);
        if (((Number) it.get("reporter_id")).longValue() == uid) throw new ApiException(HttpStatus.BAD_REQUEST, "You can't claim your own post.");
        if (!"OPEN".equals(it.get("status"))) throw new ApiException(HttpStatus.CONFLICT, "This item is already resolved.");
        if (count("SELECT COUNT(*) FROM item_claims WHERE item_id = ? AND claimant_id = ?", id, uid) > 0) throw new ApiException(HttpStatus.CONFLICT, "You already sent a claim for this item.");
        jdbc.update("INSERT INTO item_claims (item_id, claimant_id, message) VALUES (?, ?, ?)", id, uid, text.trim());
        notifyUser(((Number) it.get("reporter_id")).longValue(), "CLAIM_UPDATE", nameOf(uid) + " sent a claim on \"" + it.get("title") + "\"", "/lost-found");
    }

    public List<ClaimDto> itemClaims(long uid, long id) {
        if (((Number) item(id).get("reporter_id")).longValue() != uid) throw new ApiException(HttpStatus.FORBIDDEN, "Only the person who posted this can see its claims.");
        return jdbc.query(CLAIM_SELECT + "WHERE c.item_id = ? ORDER BY c.created_at DESC", CLAIM_MAPPER, id);
    }
    public List<ClaimDto> myClaims(long uid) {
        return jdbc.query(CLAIM_SELECT + "WHERE c.claimant_id = ? ORDER BY c.created_at DESC LIMIT 100", CLAIM_MAPPER, uid);
    }

    @Transactional
    public void decide(long uid, long claimId, String status) {
        List<Map<String, Object>> r = jdbc.queryForList("SELECT c.item_id, c.claimant_id, c.status, i.reporter_id, i.title FROM item_claims c JOIN lost_found_items i ON i.id = c.item_id WHERE c.id = ?", claimId);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "This claim no longer exists.");
        Map<String, Object> c = r.get(0);
        if (((Number) c.get("reporter_id")).longValue() != uid) throw new ApiException(HttpStatus.FORBIDDEN, "Only the person who posted this can decide claims.");
        if (!"PENDING".equals(c.get("status"))) throw new ApiException(HttpStatus.CONFLICT, "This claim was already decided.");
        long itemId = ((Number) c.get("item_id")).longValue();
        jdbc.update("UPDATE item_claims SET status = ? WHERE id = ?", status, claimId);
        if ("APPROVED".equals(status)) {
            jdbc.update("UPDATE lost_found_items SET status = 'RESOLVED' WHERE id = ?", itemId);
            jdbc.update("UPDATE item_claims SET status = 'REJECTED' WHERE item_id = ? AND status = 'PENDING' AND id <> ?", itemId, claimId);
        }
        notifyUser(((Number) c.get("claimant_id")).longValue(), "CLAIM_UPDATE", "Your claim on \"" + c.get("title") + "\" was " + status.toLowerCase(), "/lost-found");
    }
}
