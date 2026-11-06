package com.campusx.controller;
import com.campusx.dto.AuthDtos.*;
import com.campusx.entity.*;
import com.campusx.exception.ApiException;
import com.campusx.repository.*;
import com.campusx.service.AuthService;
import java.util.Map;
import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class UserController {
    private final UserRepository users; private final DepartmentRepository depts; private final AuthService auth;
    @Value("${campusx.upload-dir}") private String uploadDir;
    public UserController(UserRepository users, DepartmentRepository depts, AuthService auth) { this.users = users; this.depts = depts; this.auth = auth; }

    @GetMapping("/departments") public List<Department> departments() { return depts.findAll(); }

    @GetMapping("/users/me")
    public UserDto me(@AuthenticationPrincipal Long id) { return UserDto.from(users.findById(id).orElseThrow()); }

    @PostMapping("/users/me/password")
    public Map<String, String> changePassword(@AuthenticationPrincipal Long id, @Valid @RequestBody ChangePasswordRequest r) { auth.changePassword(id, r); return Map.of("message", "ok"); }

    @PutMapping("/users/me") @Transactional
    public UserDto update(@AuthenticationPrincipal Long id, @Valid @RequestBody UpdateProfile r) {
        User u = users.findById(id).orElseThrow();
        u.fullName = r.fullName().trim(); u.semester = r.semester(); u.bio = r.bio(); u.skills = r.skills();
        u.department = r.departmentId() == null ? null : depts.findById(r.departmentId()).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unknown department."));
        return UserDto.from(u);
    }

    @PostMapping("/users/me/avatar") @Transactional
    public UserDto avatar(@AuthenticationPrincipal Long id, @RequestParam("file") MultipartFile f) throws IOException {
        byte[] b = f.getBytes();
        if (b.length == 0 || b.length > 2 * 1024 * 1024) throw new ApiException(HttpStatus.BAD_REQUEST, "Image must be under 2 MB.");
        boolean png = b.length > 4 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
        boolean jpg = b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8;
        if (!png && !jpg) throw new ApiException(HttpStatus.BAD_REQUEST, "Only PNG or JPEG images are allowed."); // checks file bytes, not the client-supplied name
        Path dir = Paths.get(uploadDir, "avatars"); Files.createDirectories(dir);
        String name = UUID.randomUUID() + (png ? ".png" : ".jpg");
        Files.write(dir.resolve(name), b);
        User u = users.findById(id).orElseThrow();
        u.avatarPath = "avatars/" + name;
        return UserDto.from(u);
    }
}
