package com.campusx.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public final class AdminDtos {
    private AdminDtos() {}
    public record ActivityDto(String kind, String label, LocalDateTime at) {}
    public record StatsDto(int students, int activeStudents, int suspendedStudents, int posts, int listings, int events, int pendingReports, List<ActivityDto> recent) {}
    /** Deliberately has no password or token fields. */
    public record AdminStudentDto(Long id, String fullName, String universityId, String email, String role, Integer departmentId, String departmentName, Integer semester, String status,
                                  boolean emailVerified, String bio, String skills, LocalDateTime createdAt, int posts, int listings, int materials) {}
    public record CreateUserRequest(
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Size(max = 30) String universityId,
        @NotBlank @Email @Size(max = 150) String email,
        @NotNull Integer departmentId,
        @Min(1) @Max(12) Integer semester,
        @NotBlank @Pattern(regexp = "STUDENT|MODERATOR") String role,
        @NotBlank @Size(min = 8, max = 72, message = "must be 8-72 characters") String password) {}
    /** password is optional: when given it becomes a new temporary password the user must change at next login. */
    public record UpdateUserRequest(
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Size(max = 30) String universityId,
        @NotBlank @Email @Size(max = 150) String email,
        @NotNull Integer departmentId,
        @Min(1) @Max(12) Integer semester,
        @Size(min = 8, max = 72, message = "must be 8-72 characters") String password) {}
    public record ReportDto(Long id, String reporterName, String targetType, Long targetId, String reason, String status, String handledBy, LocalDateTime createdAt, String preview) {}
    public record ReportStatus(@NotBlank @Pattern(regexp = "INVESTIGATING|RESOLVED|REJECTED") String status) {}
    public record ContentDto(Long id, String type, String title, String author, boolean removed, LocalDateTime createdAt, int openReports) {}
    public record RoleRequest(@NotBlank @Pattern(regexp = "STUDENT|MODERATOR") String role) {}
    public record RegistrantDto(Long userId, String name, String universityId, String departmentName, LocalDateTime registeredAt) {}
    public record LogDto(Long id, Long adminId, String adminName, String action, String targetType, Long targetId, String details, LocalDateTime createdAt) {}
    public record AnnouncementRequest(@NotBlank @Size(max = 240) String text) {}
}
