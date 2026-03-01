package de.jd.ecosystems.repository;

import de.jd.ecosystems.model.Component;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ComponentRepository extends JpaRepository<Component, Long> {
    Optional<Component> findByGroupIdAndArtifactId(String groupId, String artifactId);

    Page<Component> findByStatus(de.jd.ecosystems.model.ProcessingStatus status, Pageable pageable);

    Page<Component> findByStatusIn(java.util.Collection<de.jd.ecosystems.model.ProcessingStatus> statuses,
            Pageable pageable);
}
