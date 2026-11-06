package com.campusx.security;
import org.springframework.security.core.Authentication;

public final class Roles {
    private Roles() {}
    public static boolean isStaff(Authentication a) {
        return a.getAuthorities().stream().anyMatch(x -> x.getAuthority().equals("ROLE_MODERATOR") || x.getAuthority().equals("ROLE_SUPER_ADMIN"));
    }
}
