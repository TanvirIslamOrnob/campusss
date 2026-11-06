package com.campusx.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public final class SocialDtos {
    private SocialDtos() {}
    public record GroupDto(Long id, String name, String description, String visibility, Integer courseId, String courseCode, String courseTitle, String departmentName,
                           Long ownerId, String ownerName, int memberCount, String myStatus, String myRole, int pendingRequests) {}
    public record MemberDto(Long userId, String name, String avatarUrl, String departmentName, String role, String status) {}
    public record GroupRequest(@NotBlank @Size(max = 100) String name, @Size(max = 500) String description, @NotNull Integer courseId,
                               @NotBlank @Pattern(regexp = "PUBLIC|PRIVATE") String visibility) {}
    public record StudentDto(Long id, String fullName, String avatarUrl, String departmentName, Integer semester, String bio, String skills, String courses) {}
    public record CourseIds(@NotNull @Size(max = 15, message = "choose at most 15 courses") List<Integer> courseIds) {}
    public record EventDto(Long id, String title, String description, String venue, LocalDateTime startsAt, Integer capacity, int registeredCount,
                           boolean registered, Long organizerId, String organizerName, String organizerDepartment) {}
    public record EventRequest(@NotBlank @Size(max = 150) String title, @Size(max = 2000) String description, @NotBlank @Size(max = 150) String venue,
                               @NotNull LocalDateTime startsAt, @Min(1) @Max(100000) Integer capacity) {}
}
