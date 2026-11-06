package com.campusx.controller;
import com.campusx.dto.AuthDtos.*;
import com.campusx.security.RateLimiter;
import com.campusx.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth; private final RateLimiter limiter;
    public AuthController(AuthService auth, RateLimiter limiter) { this.auth = auth; this.limiter = limiter; }

    private void limit(HttpServletRequest req, int max) { limiter.check(req.getRemoteAddr() + ":" + req.getRequestURI(), max, 60_000); }
    private static final Map<String, String> OK = Map.of("message", "ok");

    @PostMapping("/login") public AuthResponse login(@Valid @RequestBody LoginRequest r, HttpServletRequest q) { limit(q, 10); return auth.login(r); }
    @PostMapping("/verify-email") public Map<String, String> verify(@Valid @RequestBody TokenRequest r, HttpServletRequest q) { limit(q, 10); auth.verifyEmail(r.token()); return OK; }
    @PostMapping("/forgot-password") public Map<String, String> forgot(@Valid @RequestBody ForgotRequest r, HttpServletRequest q) { limit(q, 5); auth.forgotPassword(r.email()); return OK; }
    @PostMapping("/reset-password") public Map<String, String> reset(@Valid @RequestBody ResetRequest r, HttpServletRequest q) { limit(q, 5); auth.resetPassword(r); return OK; }
}
