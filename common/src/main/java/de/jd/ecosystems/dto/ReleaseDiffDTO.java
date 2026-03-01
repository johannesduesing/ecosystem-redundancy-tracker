package de.jd.ecosystems.dto;

import java.util.List;

public class ReleaseDiffDTO {
    private String version;
    private String previousVersion;
    private int totalClasses;
    private List<ClassDiffDTO> added;
    private List<ClassDiffDTO> removed;
    private List<ClassDiffDTO> modified;

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

    public List<ClassDiffDTO> getAdded() {
        return added;
    }

    public void setAdded(List<ClassDiffDTO> added) {
        this.added = added;
    }

    public List<ClassDiffDTO> getRemoved() {
        return removed;
    }

    public void setRemoved(List<ClassDiffDTO> removed) {
        this.removed = removed;
    }

    public List<ClassDiffDTO> getModified() {
        return modified;
    }

    public void setModified(List<ClassDiffDTO> modified) {
        this.modified = modified;
    }
}
