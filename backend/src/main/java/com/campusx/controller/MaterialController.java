package com.campusx.controller;
import com.campusx.dto.CampusDtos.*;
import com.campusx.dto.PostDtos.ReasonRequest;
import com.campusx.security.Roles;
import com.campusx.service.MaterialService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class MaterialController {
    private static final Map<String, String> OK = Map.of("message", "ok");
    private final MaterialService svc;
    public MaterialController(MaterialService svc) { this.svc = svc; }

    @GetMapping("/courses") public List<CourseDto> courses(@RequestParam(required = false) Integer departmentId) { return svc.courses(departmentId); }

    @GetMapping("/materials")
    public List<MaterialDto> list(@AuthenticationPrincipal Long uid, @RequestParam(required = false) String q, @RequestParam(required = false) Integer departmentId,
                                  @RequestParam(required = false) Integer courseId, @RequestParam(defaultValue = "false") boolean bookmarked, @RequestParam(defaultValue = "0") int page) {
        return svc.list(uid, q, departmentId, courseId, bookmarked, page);
    }
    @PostMapping(value = "/materials", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MaterialDto create(@AuthenticationPrincipal Long uid, @RequestParam String title, @RequestParam int courseId, @RequestParam MultipartFile file) throws IOException {
        return svc.create(uid, title, courseId, file);
    }
    @DeleteMapping("/materials/{id}") public Map<String, String> delete(@AuthenticationPrincipal Long uid, Authentication a, @PathVariable long id) { svc.delete(uid, Roles.isStaff(a), id); return OK; }
    @PostMapping("/materials/{id}/bookmark") public Map<String, Object> bookmark(@AuthenticationPrincipal Long uid, @PathVariable long id) { return svc.toggleBookmark(uid, id); }
    @PostMapping("/materials/{id}/report")
    public Map<String, String> report(@AuthenticationPrincipal Long uid, @PathVariable long id, @Valid @RequestBody ReasonRequest r) { svc.report(uid, id, r.reason()); return OK; }

    @GetMapping("/materials/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable long id) {
        MaterialService.FileInfo f = svc.download(id);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(f.filename()).build().toString())
            .contentType(MediaType.APPLICATION_OCTET_STREAM).body(new FileSystemResource(f.path()));
    }
}
