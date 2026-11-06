package com.campusx.service;
import com.campusx.dto.CampusDtos.*;
import com.campusx.exception.ApiException;
import com.campusx.security.RateLimiter;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MarketService extends BaseService {
    private static final String SELECT =
        "SELECT l.id, l.seller_id, u.full_name, u.avatar_path, l.title, l.description, l.price, l.image_path, l.status, l.created_at "
        + "FROM marketplace_listings l JOIN users u ON u.id = l.seller_id WHERE l.status <> 'REMOVED' ";
    private final ImageStore images; private final RateLimiter limiter;
    public MarketService(JdbcTemplate jdbc, ImageStore images, RateLimiter limiter) { super(jdbc); this.images = images; this.limiter = limiter; }

    private RowMapper<ListingDto> mapper(long uid) {
        return (rs, i) -> new ListingDto(rs.getLong("id"), rs.getLong("seller_id"), rs.getString("full_name"), url(rs.getString("avatar_path")), rs.getString("title"),
            rs.getString("description"), rs.getBigDecimal("price"), url(rs.getString("image_path")), rs.getString("status"), rs.getTimestamp("created_at").toLocalDateTime(), rs.getLong("seller_id") == uid);
    }
    private Map<String, Object> listing(long id) {
        List<Map<String, Object>> r = jdbc.queryForList("SELECT seller_id, status, title FROM marketplace_listings WHERE id = ? AND status <> 'REMOVED'", id);
        if (r.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "This listing no longer exists.");
        return r.get(0);
    }
    private Map<String, Object> owned(long uid, long id) {
        Map<String, Object> l = listing(id);
        if (((Number) l.get("seller_id")).longValue() != uid) throw new ApiException(HttpStatus.FORBIDDEN, "You can only change your own listings.");
        return l;
    }

    public List<ListingDto> list(long uid, String q, boolean mine, int page) {
        StringBuilder sql = new StringBuilder(SELECT); List<Object> a = new ArrayList<>();
        if (mine) { sql.append("AND l.seller_id = ? "); a.add(uid); } else sql.append("AND l.status = 'AVAILABLE' ");
        if (q != null && !q.isBlank()) { sql.append("AND (l.title LIKE ? OR l.description LIKE ?) "); a.add(like(q)); a.add(like(q)); }
        sql.append("ORDER BY l.created_at DESC, l.id DESC LIMIT ? OFFSET ?"); a.add(PAGE); a.add(offset(page));
        return jdbc.query(sql.toString(), mapper(uid), a.toArray());
    }

    private static void validate(String title, BigDecimal price) {
        if (title == null || title.trim().isEmpty() || title.trim().length() > 150) throw new ApiException(HttpStatus.BAD_REQUEST, "Give the listing a title (up to 150 characters).");
        if (price == null || price.signum() < 0 || price.compareTo(new BigDecimal("1000000")) > 0) throw new ApiException(HttpStatus.BAD_REQUEST, "Enter a price between 0 and 1,000,000.");
    }

    @Transactional
    public ListingDto create(long uid, String title, String description, BigDecimal price, MultipartFile image) throws IOException {
        limiter.check("listing:" + uid, 10, 60_000);
        validate(title, price);
        if (description != null && description.length() > 2000) throw new ApiException(HttpStatus.BAD_REQUEST, "Description is too long.");
        Map<String, Object> cols = new HashMap<>();
        cols.put("seller_id", uid); cols.put("title", title.trim()); cols.put("price", price);
        cols.put("description", description == null || description.isBlank() ? null : description.trim());
        cols.put("image_path", image == null || image.isEmpty() ? null : images.save(image, "listings", 5 * 1024 * 1024));
        long id = insert("marketplace_listings", cols);
        return jdbc.query(SELECT + "AND l.id = ?", mapper(uid), id).get(0);
    }

    @Transactional
    public ListingDto update(long uid, long id, ListingEdit e) {
        owned(uid, id); validate(e.title(), e.price());
        jdbc.update("UPDATE marketplace_listings SET title = ?, description = ?, price = ? WHERE id = ?", e.title().trim(), e.description(), e.price(), id);
        return jdbc.query(SELECT + "AND l.id = ?", mapper(uid), id).get(0);
    }
    @Transactional public void markSold(long uid, long id) { owned(uid, id); jdbc.update("UPDATE marketplace_listings SET status = 'SOLD' WHERE id = ?", id); }
    @Transactional
    public void remove(long uid, boolean staff, long id) {
        if (!staff) owned(uid, id); else listing(id);
        jdbc.update("UPDATE marketplace_listings SET status = 'REMOVED' WHERE id = ?", id);
    }

    /** Stores the message in a conversation. The inbox screen arrives in Phase 6; the seller gets a notification now. */
    @Transactional
    public void contact(long uid, long id, String text) {
        limiter.check("contact:" + uid, 10, 60_000);
        Map<String, Object> l = listing(id);
        long seller = ((Number) l.get("seller_id")).longValue();
        if (seller == uid) throw new ApiException(HttpStatus.BAD_REQUEST, "This is your own listing.");
        if (!"AVAILABLE".equals(jdbc.queryForObject("SELECT status FROM marketplace_listings WHERE id = ?", String.class, id))) throw new ApiException(HttpStatus.CONFLICT, "This item is no longer available.");
        long a = Math.min(uid, seller), b = Math.max(uid, seller);
        jdbc.update("INSERT IGNORE INTO conversations (user_a, user_b) VALUES (?, ?)", a, b);
        Long conv = jdbc.queryForObject("SELECT id FROM conversations WHERE user_a = ? AND user_b = ?", Long.class, a, b);
        String body = "About \"" + l.get("title") + "\": " + text.trim();
        jdbc.update("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)", conv, uid, body.length() > 2000 ? body.substring(0, 2000) : body);
        notifyUser(seller, "MESSAGE", nameOf(uid) + " messaged you about \"" + l.get("title") + "\"", "/messages");
    }
}
