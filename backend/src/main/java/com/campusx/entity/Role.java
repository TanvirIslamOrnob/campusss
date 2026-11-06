package com.campusx.entity;
import jakarta.persistence.*;

@Entity @Table(name = "roles")
public class Role {
    @Id public Integer id;
    public String name; // STUDENT, MODERATOR, SUPER_ADMIN
}
