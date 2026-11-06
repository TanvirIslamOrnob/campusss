package com.campusx.security;
import com.campusx.entity.User;
import com.campusx.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Reads "Authorization: Bearer <jwt>". The user is re-loaded each request so suspended accounts lose access immediately. */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt; private final UserRepository users;
    public JwtAuthFilter(JwtService jwt, UserRepository users) { this.jwt = jwt; this.users = users; }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        String h = req.getHeader("Authorization");
        if (h != null && h.startsWith("Bearer ")) {
            try {
                Long id = jwt.parseUserId(h.substring(7));
                User user = users.findById(id).filter(u -> u.status == User.Status.ACTIVE).orElse(null);
                if (user != null && user.mustChangePassword && !req.getRequestURI().equals("/api/users/me") && !req.getRequestURI().equals("/api/users/me/password")) {
                    // Admin-issued temporary password: nothing but "who am I" and "change my password" works until it is replaced.
                    res.setStatus(HttpServletResponse.SC_FORBIDDEN); res.setContentType("application/json");
                    res.getWriter().write("{\"message\":\"Please change your temporary password first.\",\"code\":\"PASSWORD_CHANGE_REQUIRED\"}");
                    return;
                }
                if (user != null) SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(user.id, null, List.of(new SimpleGrantedAuthority("ROLE_" + user.role.name))));
            } catch (JwtException | IllegalArgumentException e) { /* invalid token: request stays anonymous */ }
        }
        chain.doFilter(req, res);
    }
}
