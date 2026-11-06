package com.campusx.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class CampusDtos {
    private CampusDtos() {}
    public record CourseDto(Integer id, String code, String title, Integer departmentId) {}
    public record MaterialDto(Long id, String title, Integer courseId, String courseCode, String courseTitle, String departmentName,
                              Long uploaderId, String uploaderName, String fileType, LocalDateTime createdAt, boolean bookmarked, boolean mine) {}
    public record ItemDto(Long id, Long reporterId, String reporterName, String type, String title, String description, String location,
                          LocalDate itemDate, String imageUrl, String status, LocalDateTime createdAt, boolean mine, String myClaimStatus, int pendingClaims) {}
    public record ClaimDto(Long id, Long itemId, String itemTitle, Long claimantId, String claimantName, String message, String status, LocalDateTime createdAt) {}
    public record ListingDto(Long id, Long sellerId, String sellerName, String sellerAvatarUrl, String title, String description,
                             BigDecimal price, String imageUrl, String status, LocalDateTime createdAt, boolean mine) {}
    public record ListingEdit(@NotBlank @Size(max = 150) String title, @Size(max = 2000) String description,
                              @NotNull @DecimalMin("0") @DecimalMax("1000000") BigDecimal price) {}
    public record StatusRequest(@NotBlank @Pattern(regexp = "APPROVED|REJECTED") String status) {}
}
