package com.campusx.service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/** DEV STUB: no SMTP yet. Emails are printed to the backend console. Replace with JavaMailSender before going live. */
@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    public void send(String to, String subject, String body) {
        log.info("\n=== DEV EMAIL to {} ===\n{}\n{}\n=======================", to, subject, body);
    }
}
