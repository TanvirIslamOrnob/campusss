package com.campusx.security;
import com.campusx.exception.ApiException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Simple in-memory sliding window (fine for one server; use Redis if you scale out). */
@Component
public class RateLimiter {
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();
    public void check(String key, int max, long windowMs) {
        long now = System.currentTimeMillis();
        Deque<Long> q = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > windowMs) q.pollFirst();
            if (q.size() >= max) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please wait a minute and try again.");
            q.addLast(now);
        }
    }
}
