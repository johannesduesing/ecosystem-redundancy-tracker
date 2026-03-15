package de.jd.ecosystems.analyzer.repository;

import de.jd.ecosystems.model.ProjectFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectFileRepository extends JpaRepository<ProjectFile, Long> {

    Optional<ProjectFile> findByFqnAndSha512(String fqn, String sha512);

    /**
     * Fetches all ProjectFile rows matching any (fqn, sha512) pair in the provided list.
     * Uses a native Postgres row-value / VALUES constructor so only ONE round-trip
     * is needed for the entire JAR instead of one SELECT per file.
     *
     * @param fqns    ordered list of file names/paths
     * @param sha512s ordered list of SHA-512 hashes (same index = same pair)
     */
    @Query(value = """
            SELECT pf.* FROM project_file pf
            WHERE (pf.fqn, pf.sha512) IN (
                SELECT * FROM unnest(:fqns, :sha512s)
            )
            """, nativeQuery = true)
    List<ProjectFile> findAllByFqnAndSha512Pairs(
            @Param("fqns") String[] fqns,
            @Param("sha512s") String[] sha512s);

    @Modifying
    @Query("UPDATE ProjectFile pf SET pf.releaseCount = pf.releaseCount + 1 WHERE pf IN :files")
    void incrementReleaseCounts(@Param("files") List<ProjectFile> files);
}
