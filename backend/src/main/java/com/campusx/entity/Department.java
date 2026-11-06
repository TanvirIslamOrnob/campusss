package com.campusx.entity;
import jakarta.persistence.*;

@Entity @Table(name = "departments")
public class Department {
    @Id public Integer id;
    public String name;
    public String code;
}
