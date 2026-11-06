package com.campusx.entity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Fields are public to keep the code short and beginner-friendly. Column names follow Spring's camelCase -> snake_case rule. */
@Entity @Table(name = "users")
public class User {
    public enum Status { ACTIVE, SUSPENDED, PENDING }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "role_id") public Role role;
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "department_id") public Department department;
    public String universityId;
    public String fullName;
    public String email;
    public String passwordHash;
    public boolean emailVerified;
    @Enumerated(EnumType.STRING) public Status status = Status.PENDING;
    public Integer semester;
    public String bio;
    public String skills;
    public String avatarPath;
    public String resetTokenHash;
    public LocalDateTime resetTokenExpiresAt;
    public String verificationTokenHash;
    public boolean mustChangePassword;
}
