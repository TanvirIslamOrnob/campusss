package com.campusx.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

public final class MessagingDtos {
    private MessagingDtos() {}
    public record ConversationDto(Long id, Long otherUserId, String otherName, String otherAvatarUrl, String lastMessage, LocalDateTime lastAt, boolean lastMine, int unread) {}
    public record MessageDto(Long id, Long senderId, String body, LocalDateTime createdAt, boolean mine, boolean read, boolean unsent) {}
    public record NotificationDto(Long id, String type, String content, String link, boolean read, LocalDateTime createdAt) {}
    public record BadgesDto(int unreadMessages, int unreadNotifications) {}
    public record PublicUserDto(Long id, String fullName, String avatarUrl, String departmentName) {}
    public record SendMessage(@NotBlank @Size(max = 2000) String text) {}
    public record StartConversation(@NotNull Long userId, @NotBlank @Size(max = 2000) String text) {}
}
