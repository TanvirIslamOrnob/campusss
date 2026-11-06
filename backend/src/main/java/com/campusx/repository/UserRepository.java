package com.campusx.repository;
import com.campusx.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByUniversityId(String universityId);
    Optional<User> findByVerificationTokenHash(String hash);
    Optional<User> findByResetTokenHash(String hash);
}
