package com.campusx.controller;
import com.campusx.dto.AdminDtos.*;
import com.campusx.dto.PostDtos.ReasonRequest;
import com.campusx.dto.SocialDtos.EventDto;
import com.campusx.dto.SocialDtos.EventRequest;
import com.campusx.service.AdminService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Access rules live in SecurityConfig: /api/admin/** needs MODERATOR or SUPER_ADMIN; students, logs and announcements need SUPER_ADMIN. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private static final Map<String, String> OK = Map.of("message", "ok");
    private final AdminService svc;
    public AdminController(AdminService svc) { this.svc = svc; }

    @GetMapping("/stats") public StatsDto stats() { return svc.stats(); }

    @GetMapping("/students")
    public List<AdminStudentDto> students(@RequestParam(required = false) String q, @RequestParam(required = false) Integer departmentId, @RequestParam(required = false) String status, @RequestParam(defaultValue = "0") int page) {
        return svc.students(q, departmentId, status, page);
    }
    @PostMapping("/students") public Map<String, Object> createUser(@AuthenticationPrincipal Long admin, @Valid @RequestBody CreateUserRequest r) { return Map.of("id", svc.createUser(admin, r)); }
    @PutMapping("/students/{id}") public Map<String, String> editUser(@AuthenticationPrincipal Long admin, @PathVariable long id, @Valid @RequestBody UpdateUserRequest r) { svc.updateUser(admin, id, r); return OK; }
    @PostMapping("/students/{id}/verify") public Map<String, String> verify(@AuthenticationPrincipal Long admin, @PathVariable long id) { svc.verify(admin, id); return OK; }
    @PostMapping("/students/{id}/suspend") public Map<String, String> suspend(@AuthenticationPrincipal Long admin, @PathVariable long id, @Valid @RequestBody ReasonRequest r) { svc.suspend(admin, id, r.reason()); return OK; }
    @PostMapping("/students/{id}/reactivate") public Map<String, String> reactivate(@AuthenticationPrincipal Long admin, @PathVariable long id) { svc.reactivate(admin, id); return OK; }
    @PostMapping("/students/{id}/reset-password") public Map<String, String> reset(@AuthenticationPrincipal Long admin, @PathVariable long id) { svc.initiatePasswordReset(admin, id); return OK; }
    @PutMapping("/students/{id}/role") public Map<String, String> role(@AuthenticationPrincipal Long admin, @PathVariable long id, @Valid @RequestBody RoleRequest r) { svc.setRole(admin, id, r.role()); return OK; }

    @GetMapping("/reports")
    public List<ReportDto> reports(@RequestParam(required = false) String status, @RequestParam(required = false) String type, @RequestParam(defaultValue = "0") int page) { return svc.reports(status, type, page); }
    @PatchMapping("/reports/{id}") public Map<String, String> reportStatus(@AuthenticationPrincipal Long admin, @PathVariable long id, @Valid @RequestBody ReportStatus r) { svc.setReportStatus(admin, id, r.status()); return OK; }
    @PostMapping("/reports/{id}/remove-content") public Map<String, String> removeReported(@AuthenticationPrincipal Long admin, @PathVariable long id) { svc.removeReportedContent(admin, id); return OK; }

    @GetMapping("/content/{type}")
    public List<ContentDto> content(@PathVariable String type, @RequestParam(required = false) String q, @RequestParam(defaultValue = "false") boolean removed, @RequestParam(defaultValue = "0") int page) { return svc.content(type, q, removed, page); }
    @PostMapping("/content/{type}/{id}/remove") public Map<String, String> remove(@AuthenticationPrincipal Long admin, @PathVariable String type, @PathVariable long id) { svc.removeContent(admin, type, id); return OK; }
    @PostMapping("/content/{type}/{id}/restore") public Map<String, String> restore(@AuthenticationPrincipal Long admin, @PathVariable String type, @PathVariable long id) { svc.restoreContent(admin, type, id); return OK; }

    @PostMapping("/events") public EventDto createEvent(@AuthenticationPrincipal Long admin, @Valid @RequestBody EventRequest r) { return svc.createEvent(admin, r); }
    @PutMapping("/events/{id}") public EventDto updateEvent(@AuthenticationPrincipal Long admin, @PathVariable long id, @Valid @RequestBody EventRequest r) { return svc.updateEvent(admin, id, r); }
    @DeleteMapping("/events/{id}") public Map<String, String> deleteEvent(@AuthenticationPrincipal Long admin, @PathVariable long id) { svc.deleteEvent(admin, id); return OK; }
    @GetMapping("/events/{id}/registrations") public List<RegistrantDto> registrations(@PathVariable long id) { return svc.registrations(id); }
    @DeleteMapping("/events/{id}/registrations/{userId}")
    public Map<String, String> removeRegistration(@AuthenticationPrincipal Long admin, @PathVariable long id, @PathVariable long userId) { svc.removeRegistration(admin, id, userId); return OK; }

    @GetMapping("/logs") public List<LogDto> logs(@RequestParam(required = false) String action, @RequestParam(defaultValue = "0") int page) { return svc.logs(action, page); }
    @PostMapping("/announcements")
    public Map<String, Object> announce(@AuthenticationPrincipal Long admin, @Valid @RequestBody AnnouncementRequest r) { return Map.of("sentTo", svc.announce(admin, r.text())); }
}
