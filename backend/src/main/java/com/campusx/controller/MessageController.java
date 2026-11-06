package com.campusx.controller;
import com.campusx.dto.MessagingDtos.*;
import com.campusx.service.MessageService;
import com.campusx.service.NotificationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class MessageController {
    private static final Map<String, String> OK = Map.of("message", "ok");
    private final MessageService messages; private final NotificationService notifications;
    public MessageController(MessageService messages, NotificationService notifications) { this.messages = messages; this.notifications = notifications; }

    @GetMapping("/conversations") public List<ConversationDto> conversations(@AuthenticationPrincipal Long uid) { return messages.conversations(uid); }
    @PostMapping("/conversations")
    public Map<String, Long> start(@AuthenticationPrincipal Long uid, @Valid @RequestBody StartConversation r) { return Map.of("conversationId", messages.start(uid, r.userId(), r.text())); }
    @GetMapping("/conversations/{id}/messages")
    public List<MessageDto> thread(@AuthenticationPrincipal Long uid, @PathVariable long id, @RequestParam(required = false) Long before) { return messages.messages(uid, id, before); }
    @PostMapping("/conversations/{id}/messages")
    public MessageDto send(@AuthenticationPrincipal Long uid, @PathVariable long id, @Valid @RequestBody SendMessage r) { return messages.send(uid, id, r.text()); }
    @DeleteMapping("/conversations/{id}/messages/{messageId}")
    public Map<String, String> deleteMessage(@AuthenticationPrincipal Long uid, @PathVariable long id, @PathVariable long messageId, @RequestParam(defaultValue = "me") String scope) {
        messages.deleteMessage(uid, id, messageId, scope); return OK;
    }
    @GetMapping("/users/{id}/public") public PublicUserDto publicUser(@PathVariable long id) { return messages.publicUser(id); }
    @GetMapping("/badges") public BadgesDto badges(@AuthenticationPrincipal Long uid) { return messages.badges(uid); }

    @GetMapping("/notifications")
    public List<NotificationDto> notifications(@AuthenticationPrincipal Long uid, @RequestParam(defaultValue = "false") boolean unread, @RequestParam(defaultValue = "0") int page) { return notifications.list(uid, unread, page); }
    @PostMapping("/notifications/{id}/read") public Map<String, String> read(@AuthenticationPrincipal Long uid, @PathVariable long id) { notifications.markRead(uid, id); return OK; }
    @PostMapping("/notifications/read-all") public Map<String, String> readAll(@AuthenticationPrincipal Long uid) { notifications.markAllRead(uid); return OK; }
}
