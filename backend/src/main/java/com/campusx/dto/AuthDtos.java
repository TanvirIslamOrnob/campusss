package com.campusx.dto;
import com.campusx.entity.User;
import jakarta.validation.constraints.*;

public final class AuthDtos {
    private AuthDtos() {}
    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
    public record TokenRequest(@NotBlank String token) {}
    public record ForgotRequest(@NotBlank @Email String email) {}
    public record ChangePasswordRequest(@NotBlank String currentPassword, @NotBlank @Size(min = 8, max = 72, message = "must be 8-72 characters") String newPassword) {}
    public record ResetRequest(@NotBlank String token, @NotBlank @Size(min = 8, max = 72, message = "must be 8-72 characters") String password) {}
    public record UpdateProfile(
        @NotBlank @Size(max = 100) String fullName, Integer departmentId,
        @Min(1) @Max(12) Integer semester, @Size(max = 500) String bio, @Size(max = 300) String skills) {}

    public record UserDto(Long id, String universityId, String fullName, String email, String role,
                          Integer departmentId, String departmentName, Integer semester, String bio, String skills, String avatarUrl, boolean mustChangePassword) {
        public static UserDto from(User u) {
            return new UserDto(u.id, u.universityId, u.fullName, u.email, u.role.name,
                u.department == null ? null : u.department.id, u.department == null ? null : u.department.name,
                u.semester, u.bio, u.skills, u.avatarPath == null ? null : "/uploads/" + u.avatarPath, u.mustChangePassword);
        }
    }
    public record AuthResponse(String token, UserDto user) {}
}
