package de.jd.ecosystems.producer.repository;

import de.jd.ecosystems.model.Release;
import de.jd.ecosystems.model.Component;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ReleaseRepository extends JpaRepository<Release, Long> {
    Optional<Release> findByComponentAndVersion(Component component, String version);
}
