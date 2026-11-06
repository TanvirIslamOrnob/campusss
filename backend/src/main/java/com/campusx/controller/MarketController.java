package com.campusx.controller;
import com.campusx.dto.CampusDtos.*;
import com.campusx.dto.PostDtos.TextRequest;
import com.campusx.security.Roles;
import com.campusx.service.MarketService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/listings")
public class MarketController {
    private static final Map<String, String> OK = Map.of("message", "ok");
    private final MarketService svc;
    public MarketController(MarketService svc) { this.svc = svc; }

    @GetMapping
    public List<ListingDto> list(@AuthenticationPrincipal Long uid, @RequestParam(required = false) String q, @RequestParam(defaultValue = "false") boolean mine, @RequestParam(defaultValue = "0") int page) { return svc.list(uid, q, mine, page); }
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ListingDto create(@AuthenticationPrincipal Long uid, @RequestParam String title, @RequestParam(required = false) String description, @RequestParam BigDecimal price,
                             @RequestParam(required = false) MultipartFile image) throws IOException { return svc.create(uid, title, description, price, image); }
    @PutMapping("/{id}") public ListingDto update(@AuthenticationPrincipal Long uid, @PathVariable long id, @Valid @RequestBody ListingEdit e) { return svc.update(uid, id, e); }
    @PatchMapping("/{id}/sold") public Map<String, String> sold(@AuthenticationPrincipal Long uid, @PathVariable long id) { svc.markSold(uid, id); return OK; }
    @DeleteMapping("/{id}") public Map<String, String> remove(@AuthenticationPrincipal Long uid, Authentication a, @PathVariable long id) { svc.remove(uid, Roles.isStaff(a), id); return OK; }
    @PostMapping("/{id}/contact") public Map<String, String> contact(@AuthenticationPrincipal Long uid, @PathVariable long id, @Valid @RequestBody TextRequest r) { svc.contact(uid, id, r.text()); return OK; }
}
