package com.campusx.service;
import com.campusx.dto.AuthDtos.*;
import com.campusx.entity.User;
import com.campusx.exception.ApiException;
import com.campusx.repository.*;
import com.campusx.security.*;
import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder; private final JwtService jwt; private final EmailService email;
    @Value("${campusx.frontend-url}") private String frontendUrl;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, EmailService email) {
        this.users = users; this.encoder = encoder; this.jwt = jwt; this.email = email;
    }

    /** Students never create accounts themselves; admins do. This is how they replace the temporary password. */
    @Transactional
    public void changePassword(long userId, ChangePasswordRequest r) {
        User u = users.findById(userId).orElseThrow();
        if (!encoder.matches(r.currentPassword(), u.passwordHash)) throw new ApiException(HttpStatus.BAD_REQUEST, "Your current password is incorrect.");
        if (r.currentPassword().equals(r.newPassword())) throw new ApiException(HttpStatus.BAD_REQUEST, "Choose a different password from the current one.");
        u.passwordHash = encoder.encode(r.newPassword()); u.mustChangePassword = false;
    }

    @Transactional
    public void verifyEmail(String token) {
        User u = users.findByVerificationTokenHash(TokenUtil.hash(token)).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "This verification link is invalid or already used."));
        u.emailVerified = true; u.verificationTokenHash = null;
        if (u.status == User.Status.PENDING) u.status = User.Status.ACTIVE;
    }

    public AuthResponse login(LoginRequest r) {
        User u = users.findByEmail(r.email().trim().toLowerCase()).filter(x -> encoder.matches(r.password(), x.passwordHash))
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));
        if (!u.emailVerified) throw new ApiException(HttpStatus.FORBIDDEN, "Please verify your email before logging in.");
        if (u.status == User.Status.SUSPENDED) throw new ApiException(HttpStatus.FORBIDDEN, "This account is suspended. Contact campus administration.");
        return new AuthResponse(jwt.create(u), UserDto.from(u));
    }

    /** Always succeeds silently so attackers cannot discover which emails are registered. */
    @Transactional
    public void forgotPassword(String mail) {
        users.findByEmail(mail.trim().toLowerCase()).ifPresent(u -> {
            String token = TokenUtil.newToken();
            u.resetTokenHash = TokenUtil.hash(token); u.resetTokenExpiresAt = LocalDateTime.now().plusHours(1);
            email.send(u.email, "Reset your CAMPUSX password", frontendUrl + "/reset-password?token=" + token);
        });
    }

    @Transactional
    public void resetPassword(ResetRequest r) {
        User u = users.findByResetTokenHash(TokenUtil.hash(r.token())).filter(x -> x.resetTokenExpiresAt != null && x.resetTokenExpiresAt.isAfter(LocalDateTime.now()))
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "This reset link is invalid or has expired."));
        u.passwordHash = encoder.encode(r.password()); u.mustChangePassword = false; u.resetTokenHash = null; u.resetTokenExpiresAt = null;
    }
}
