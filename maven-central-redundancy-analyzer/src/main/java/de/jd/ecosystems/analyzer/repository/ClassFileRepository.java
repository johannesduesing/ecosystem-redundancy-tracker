package de.jd.ecosystems.analyzer.repository;

import de.jd.ecosystems.model.ClassFile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ClassFileRepository extends JpaRepository<ClassFile, Long> {
    Optional<ClassFile> findByFqnAndSha512(String fqn, String sha512);
}
