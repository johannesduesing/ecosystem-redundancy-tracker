package de.jd.ecosystems.analyzer.repository;

import de.jd.ecosystems.model.ClassFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClassFileRepository extends JpaRepository<ClassFile, Long> {

    Optional<ClassFile> findByFqnAndSha512(String fqn, String sha512);

    /**
     * Fetches all ClassFile rows matching any (fqn, sha512) pair in the provided list.
     * Uses a native Postgres row-value / VALUES constructor so only ONE round-trip
     * is needed for the entire JAR instead of one SELECT per class file.
     *
     * @param fqns    ordered list of fully-qualified class names
     * @param sha512s ordered list of SHA-512 hashes (same index = same pair)
     */
    @Query(value = """
            SELECT cf.* FROM class_file cf
            WHERE (cf.fqn, cf.sha512) IN (
                SELECT * FROM unnest(:fqns, :sha512s)
            )
            """, nativeQuery = true)
    List<ClassFile> findAllByFqnAndSha512Pairs(
            @Param("fqns") String[] fqns,
            @Param("sha512s") String[] sha512s);
}
