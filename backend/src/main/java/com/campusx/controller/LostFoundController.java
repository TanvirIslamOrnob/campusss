package com.campusx.controller;
import com.campusx.dto.CampusDtos.*;
import com.campusx.dto.PostDtos.TextRequest;
import com.campusx.security.Roles;
import com.campusx.service.LostFoundService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class LostFoundController {
    private static final Map<String, String> OK = Map.of("message", "ok");
    private final LostFoundService svc;
    public LostFoundController(LostFoundService svc) { this.svc = svc; }

    @GetMapping("/lost-found")
    public List<ItemDto> list(@AuthenticationPrincipal Long uid, @RequestParam(required = false) String q, @RequestParam(required = false) String type,
                              @RequestParam(defaultValue = "false") boolean mine, @RequestParam(defaultValue = "0") int page) { return svc.list(uid, q, type, mine, page); }

    @PostMapping(value = "/lost-found", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ItemDto create(@AuthenticationPrincipal Long uid, @RequestParam String type, @RequestParam String title, @RequestParam(required = false) String description,
                          @RequestParam String location, @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate itemDate,
                          @RequestParam(required = false) MultipartFile image) throws IOException { return svc.create(uid, type, title, description, location, itemDate, image); }

    @DeleteMapping("/lost-found/{id}") public Map<String, String> delete(@AuthenticationPrincipal Long uid, Authentication a, @PathVariable long id) { svc.delete(uid, Roles.isStaff(a), id); return OK; }
    @PostMapping("/lost-found/{id}/claims")
    public Map<String, String> claim(@AuthenticationPrincipal Long uid, @PathVariable long id, @Valid @RequestBody TextRequest r) { svc.claim(uid, id, r.text()); return OK; }
    @GetMapping("/lost-found/{id}/claims") public List<ClaimDto> claims(@AuthenticationPrincipal Long uid, @PathVariable long id) { return svc.itemClaims(uid, id); }
    @GetMapping("/claims/mine") public List<ClaimDto> mine(@AuthenticationPrincipal Long uid) { return svc.myClaims(uid); }
    @PatchMapping("/claims/{id}")
    public Map<String, String> decide(@AuthenticationPrincipal Long uid, @PathVariable long id, @Valid @RequestBody StatusRequest r) { svc.decide(uid, id, r.status()); return OK; }
}
