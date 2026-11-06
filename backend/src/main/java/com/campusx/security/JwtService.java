package com.campusx.security;
import com.campusx.entity.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private final SecretKey key;
    public JwtService(@Value("${campusx.jwt-secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
    public String create(User u) {
        long now = System.currentTimeMillis();
        return Jwts.builder().subject(String.valueOf(u.id)).claim("role", u.role.name)
            .issuedAt(new Date(now)).expiration(new Date(now + 24L * 3600 * 1000)).signWith(key).compact();
    }
    public Long parseUserId(String token) {
        return Long.valueOf(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload().getSubject());
    }
}
