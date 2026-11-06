package com.campusx.controller;
import com.campusx.dto.CampusDtos.CourseDto;
import com.campusx.dto.CampusDtos.StatusRequest;
import com.campusx.dto.SocialDtos.*;
import com.campusx.security.Roles;
import com.campusx.service.StudyService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class StudyController {
    private static final Map<String, String> OK = Map.of("message", "ok");
    private final StudyService svc;
    public StudyController(StudyService svc) { this.svc = svc; }

    @GetMapping("/groups")
    public List<GroupDto> groups(@AuthenticationPrincipal Long uid, @RequestParam(required = false) String q, @RequestParam(required = false) Integer departmentId,
                                 @RequestParam(required = false) Integer courseId, @RequestParam(defaultValue = "false") boolean mine, @RequestParam(defaultValue = "0") int page) {
        return svc.list(uid, q, departmentId, courseId, mine, page);
    }
    @PostMapping("/groups") public GroupDto create(@AuthenticationPrincipal Long uid, @Valid @RequestBody GroupRequest r) { return svc.create(uid, r); }
    @DeleteMapping("/groups/{id}") public Map<String, String> delete(@AuthenticationPrincipal Long uid, Authentication a, @PathVariable long id) { svc.delete(uid, Roles.isStaff(a), id); return OK; }
    @PostMapping("/groups/{id}/join") public Map<String, String> join(@AuthenticationPrincipal Long uid, @PathVariable long id) { return svc.join(uid, id); }
    @DeleteMapping("/groups/{id}/membership") public Map<String, String> leave(@AuthenticationPrincipal Long uid, @PathVariable long id) { svc.leave(uid, id); return OK; }
    @GetMapping("/groups/{id}/members") public List<MemberDto> members(@AuthenticationPrincipal Long uid, @PathVariable long id) { return svc.members(uid, id); }
    @PatchMapping("/groups/{id}/members/{userId}")
    public Map<String, String> decide(@AuthenticationPrincipal Long uid, @PathVariable long id, @PathVariable long userId, @Valid @RequestBody StatusRequest r) { svc.decide(uid, id, userId, r.status()); return OK; }
    @DeleteMapping("/groups/{id}/members/{userId}")
    public Map<String, String> remove(@AuthenticationPrincipal Long uid, @PathVariable long id, @PathVariable long userId) { svc.removeMember(uid, id, userId); return OK; }

    @GetMapping("/users/me/courses") public List<CourseDto> myCourses(@AuthenticationPrincipal Long uid) { return svc.myCourses(uid); }
    @PutMapping("/users/me/courses") public List<CourseDto> setMyCourses(@AuthenticationPrincipal Long uid, @Valid @RequestBody CourseIds r) { return svc.setMyCourses(uid, r.courseIds()); }
    @GetMapping("/students")
    public List<StudentDto> students(@AuthenticationPrincipal Long uid, @RequestParam(required = false) String q, @RequestParam(required = false) Integer departmentId,
                                     @RequestParam(required = false) Integer courseId, @RequestParam(defaultValue = "0") int page) {
        return svc.students(uid, q, departmentId, courseId, page);
    }
}
