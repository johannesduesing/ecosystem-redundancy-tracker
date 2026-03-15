package de.jd.ecosystems.repository;

import de.jd.ecosystems.model.Release;
import de.jd.ecosystems.model.Component;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReleaseRepository extends JpaRepository<Release, Long> {
    Optional<Release> findByComponentAndVersion(Component component, String version);

    List<Release> findByComponent(Component component);

    Page<Release> findByClassFilesId(Long classFileId, Pageable pageable);

    @org.springframework.data.jpa.repository.Query(value = "SELECT COUNT(*) FROM release_class_files", nativeQuery = true)
    long countFileOccurrences();
}
