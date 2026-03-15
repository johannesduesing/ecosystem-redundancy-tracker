package de.jd.ecosystems.dto;

public class GlobalStatsDTO {
    private long totalComponents;
    private long totalReleases;
    private long totalUniqueFiles;
    private long totalFileOccurrences;

    public GlobalStatsDTO() {
    }

    public GlobalStatsDTO(long totalComponents, long totalReleases, long totalUniqueFiles, long totalFileOccurrences) {
        this.totalComponents = totalComponents;
        this.totalReleases = totalReleases;
        this.totalUniqueFiles = totalUniqueFiles;
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

    public long getTotalUniqueFiles() {
        return totalUniqueFiles;
    }

    public void setTotalUniqueFiles(long totalUniqueFiles) {
        this.totalUniqueFiles = totalUniqueFiles;
    }

    public long getTotalFileOccurrences() {
        return totalFileOccurrences;
    }

    public void setTotalFileOccurrences(long totalFileOccurrences) {
        this.totalFileOccurrences = totalFileOccurrences;
    }
}
