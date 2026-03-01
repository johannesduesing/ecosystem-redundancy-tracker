package de.jd.ecosystems.analyzer.repository;

import de.jd.ecosystems.model.Component;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ComponentRepository extends JpaRepository<Component, Long> {
    Optional<Component> findByGroupIdAndArtifactId(String groupId, String artifactId);
}
