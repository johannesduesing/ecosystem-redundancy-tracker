package de.jd.ecosystems.repository;

import de.jd.ecosystems.model.ClassFile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ClassFileRepository extends JpaRepository<ClassFile, Long> {
    Optional<ClassFile> findByFqnAndSha512(String fqn, String sha512);

    org.springframework.data.domain.Page<ClassFile> findByFqn(String fqn, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT cf FROM ClassFile cf ORDER BY cf.releaseCount DESC")
    java.util.List<ClassFile> findTop10ByReleaseCount(org.springframework.data.domain.Pageable pageable);
}
