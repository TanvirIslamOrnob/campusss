package com.campusx.controller;
import com.campusx.dto.PostDtos.*;
import com.campusx.service.PostService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class PostController {
    private static final Map<String, String> OK = Map.of("message", "ok");
    private final PostService posts;
    public PostController(PostService posts) { this.posts = posts; }

    @GetMapping("/posts")
    public List<PostDto> list(@AuthenticationPrincipal Long uid, @RequestParam(required = false) String q, @RequestParam(defaultValue = "0") int page) {
        return posts.list(uid, q, page);
    }
    @PostMapping(value = "/posts", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PostDto create(@AuthenticationPrincipal Long uid, @RequestParam String content, @RequestParam(required = false) MultipartFile image) throws IOException {
        return posts.create(uid, content, image);
    }
    @DeleteMapping("/posts/{id}")
    public Map<String, String> delete(@AuthenticationPrincipal Long uid, Authentication auth, @PathVariable long id) {
        boolean staff = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        posts.delete(uid, staff, id); return OK;
    }
    @PostMapping("/posts/{id}/like") public Map<String, Object> like(@AuthenticationPrincipal Long uid, @PathVariable long id) { return posts.toggleLike(uid, id); }
    @GetMapping("/posts/{id}/comments") public List<CommentDto> comments(@PathVariable long id) { return posts.comments(id); }
    @PostMapping("/posts/{id}/comments")
    public List<CommentDto> comment(@AuthenticationPrincipal Long uid, @PathVariable long id, @Valid @RequestBody TextRequest r) { return posts.addComment(uid, id, r.text()); }
    @DeleteMapping("/posts/{id}/comments/{commentId}")
    public List<CommentDto> deleteComment(@AuthenticationPrincipal Long uid, Authentication auth, @PathVariable long id, @PathVariable long commentId) {
        boolean staff = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        return posts.deleteComment(uid, staff, id, commentId);
    }
    @PostMapping("/posts/{id}/report")
    public Map<String, String> report(@AuthenticationPrincipal Long uid, @PathVariable long id, @Valid @RequestBody ReasonRequest r) { posts.report(uid, id, r.reason()); return OK; }
    @GetMapping("/dashboard") public DashboardDto dashboard(@AuthenticationPrincipal Long uid) { return posts.dashboard(uid); }
}
