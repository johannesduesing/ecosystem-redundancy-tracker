package de.jd.ecosystems.util;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Component
public class DatabaseSizeGuard {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseSizeGuard(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    /**
     * Checks if the current database size exceeds the given limit.
     * 
     * @param limitInBytes The maximum allowed size in bytes (e.g., 25 * 1024 * 1024 * 1024L)
     * @return true if the limit is exceeded, false otherwise.
     */
    public boolean isLimitExceeded(long limitInBytes) {
        try {
            // Query for the size of the current database in PostgreSQL
            Long size = jdbcTemplate.queryForObject(
                "SELECT pg_database_size(current_database())", Long.class);
            
            if (size == null) {
                return false;
            }

            if (size > limitInBytes) {
                System.err.println("CRITICAL: Database size (" + size + " bytes) exceeds the limit of " + limitInBytes + " bytes. Analysis halted.");
                return true;
            }
            return false;
        } catch (Exception e) {
            System.err.println("Failed to check database size: " + e.getMessage());
            // Fail safe: if we can't check the size, we assume it's okay for now but log error.
            return false;
        }
    }
}
