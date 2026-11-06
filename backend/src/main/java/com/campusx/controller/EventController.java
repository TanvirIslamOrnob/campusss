package com.campusx.controller;
import com.campusx.dto.SocialDtos.EventDto;
import com.campusx.service.EventService;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Student-facing event endpoints. Creating, editing and deleting events lives in AdminController so every change is logged. */
@RestController
@RequestMapping("/api/events")
public class EventController {
    private final EventService svc;
    public EventController(EventService svc) { this.svc = svc; }

    @GetMapping
    public List<EventDto> list(@AuthenticationPrincipal Long uid, @RequestParam(required = false) String q, @RequestParam(defaultValue = "false") boolean registered,
                               @RequestParam(defaultValue = "false") boolean past, @RequestParam(defaultValue = "0") int page) { return svc.list(uid, q, registered, past, page); }
    @PostMapping("/{id}/register") public EventDto register(@AuthenticationPrincipal Long uid, @PathVariable long id) { return svc.register(uid, id); }
    @DeleteMapping("/{id}/register") public EventDto cancel(@AuthenticationPrincipal Long uid, @PathVariable long id) { return svc.cancel(uid, id); }
}
