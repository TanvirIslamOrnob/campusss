package com.campusx.service;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Every 15 minutes: remind registered students about events starting within 24 hours. Each student is reminded once per event. */
@Component
public class ReminderJob {
    private static final Logger log = LoggerFactory.getLogger(ReminderJob.class);
    private final JdbcTemplate jdbc;
    public ReminderJob(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Scheduled(initialDelay = 30_000, fixedDelay = 900_000)
    public void remind() {
        LocalDateTime now = LocalDateTime.now();
        int n = jdbc.update("INSERT INTO notifications (user_id, type, content, link) "
            + "SELECT r.user_id, 'EVENT_REMINDER', CONCAT('Reminder: \"', e.title, '\" starts within 24 hours'), CONCAT('/events?event=', e.id) "
            + "FROM event_registrations r JOIN events e ON e.id = r.event_id WHERE e.starts_at > ? AND e.starts_at <= ? "
            + "AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = r.user_id AND n.type = 'EVENT_REMINDER' AND n.link = CONCAT('/events?event=', e.id))",
            now, now.plusHours(24));
        if (n > 0) log.info("Sent {} event reminder(s)", n);
    }
}
