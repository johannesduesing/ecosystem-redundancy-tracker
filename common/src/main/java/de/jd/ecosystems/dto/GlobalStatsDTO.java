package de.jd.ecosystems.dto;

public class GlobalStatsDTO {
    private long totalComponents;
    private long totalReleases;
    private long totalUniqueClassFiles;
    private long totalFileOccurrences;

    public GlobalStatsDTO() {
    }

    public GlobalStatsDTO(long totalComponents, long totalReleases, long totalUniqueClassFiles, long totalFileOccurrences) {
        this.totalComponents = totalComponents;
        this.totalReleases = totalReleases;
        this.totalUniqueClassFiles = totalUniqueClassFiles;
        this.totalFileOccurrences = totalFileOccurrences;
    }

    public long getTotalComponents() {
        return totalComponents;
    }

    public void setTotalComponents(long totalComponents) {
        this.totalComponents = totalComponents;
    }

    public long getTotalReleases() {
        return totalReleases;
    }

    public void setTotalReleases(long totalReleases) {
        this.totalReleases = totalReleases;
    }

    public long getTotalUniqueClassFiles() {
        return totalUniqueClassFiles;
    }

    public void setTotalUniqueClassFiles(long totalUniqueClassFiles) {
        this.totalUniqueClassFiles = totalUniqueClassFiles;
    }

    public long getTotalFileOccurrences() {
        return totalFileOccurrences;
    }

    public void setTotalFileOccurrences(long totalFileOccurrences) {
        this.totalFileOccurrences = totalFileOccurrences;
    }
}
