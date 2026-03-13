package de.jd.ecosystems.dto;

import java.util.List;

public class ReleaseDiffDTO {
    private String version;
    private String previousVersion;
    private int totalClasses;
    private long totalSizeBytes;
    private List<ClassDiffDTO> added;
    private long addedSizeBytes;
    private List<ClassDiffDTO> removed;
    private long removedSizeBytes;
    private List<ClassDiffDTO> modified;
    private long modifiedSizeBytes;

    public ReleaseDiffDTO() {
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getPreviousVersion() {
        return previousVersion;
    }

    public void setPreviousVersion(String previousVersion) {
        this.previousVersion = previousVersion;
    }

    public int getTotalClasses() {
        return totalClasses;
    }

    public void setTotalClasses(int totalClasses) {
        this.totalClasses = totalClasses;
    }

    public long getTotalSizeBytes() {
        return totalSizeBytes;
    }

    public void setTotalSizeBytes(long totalSizeBytes) {
        this.totalSizeBytes = totalSizeBytes;
    }

    public List<ClassDiffDTO> getAdded() {
        return added;
    }

    public void setAdded(List<ClassDiffDTO> added) {
        this.added = added;
    }

    public long getAddedSizeBytes() {
        return addedSizeBytes;
    }

    public void setAddedSizeBytes(long addedSizeBytes) {
        this.addedSizeBytes = addedSizeBytes;
    }

    public List<ClassDiffDTO> getRemoved() {
        return removed;
    }

    public void setRemoved(List<ClassDiffDTO> removed) {
        this.removed = removed;
    }

    public long getRemovedSizeBytes() {
        return removedSizeBytes;
    }

    public void setRemovedSizeBytes(long removedSizeBytes) {
        this.removedSizeBytes = removedSizeBytes;
    }

    public List<ClassDiffDTO> getModified() {
        return modified;
    }

    public void setModified(List<ClassDiffDTO> modified) {
        this.modified = modified;
    }

    public long getModifiedSizeBytes() {
        return modifiedSizeBytes;
    }

    public void setModifiedSizeBytes(long modifiedSizeBytes) {
        this.modifiedSizeBytes = modifiedSizeBytes;
    }
}
