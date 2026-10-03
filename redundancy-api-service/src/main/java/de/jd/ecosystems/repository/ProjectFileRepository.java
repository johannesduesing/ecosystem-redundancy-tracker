package de.jd.ecosystems.repository;

import de.jd.ecosystems.model.ProjectFile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ProjectFileRepository extends JpaRepository<ProjectFile, Long> {
    Optional<ProjectFile> findByFqnAndSha512(String fqn, String sha512);

    org.springframework.data.domain.Page<ProjectFile> findByFqn(String fqn, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT pf FROM ProjectFile pf ORDER BY pf.releaseCount DESC")
    java.util.List<ProjectFile> findTop10ByReleaseCount(org.springframework.data.domain.Pageable pageable);
}
