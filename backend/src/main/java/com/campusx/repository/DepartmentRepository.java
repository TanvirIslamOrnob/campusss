package com.campusx.repository;
import com.campusx.entity.Department;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentRepository extends JpaRepository<Department, Integer> {
    Optional<Department> findByCode(String code);
}
