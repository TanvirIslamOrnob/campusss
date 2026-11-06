package com.campusx.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.List;

public final class PostDtos {
    private PostDtos() {}
    public record PostDto(Long id, Long authorId, String authorName, String authorAvatarUrl, String content, String imageUrl,
                          LocalDateTime createdAt, int likes, int comments, boolean liked, boolean mine) {}
    public record CommentDto(Long id, Long authorId, String authorName, String authorAvatarUrl, String content, LocalDateTime createdAt) {}
    public record TextRequest(@NotBlank @Size(max = 1000) String text) {}
    public record ReasonRequest(@NotBlank @Size(min = 5, max = 500, message = "must be 5-500 characters") String reason) {}
    public record DashboardDto(int myPosts, int unreadNotifications, List<PostDto> recentPosts) {}
}
