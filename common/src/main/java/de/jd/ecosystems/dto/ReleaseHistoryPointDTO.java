package de.jd.ecosystems.dto;

public class ReleaseHistoryPointDTO {
    private String version;
    private int addedCount;
    private int removedCount;
    private int modifiedCount;
    private int totalCount;

    public ReleaseHistoryPointDTO() {
    }

    public ReleaseHistoryPointDTO(String version, int addedCount, int removedCount, int modifiedCount, int totalCount) {
        this.version = version;
        this.addedCount = addedCount;
        this.removedCount = removedCount;
        this.modifiedCount = modifiedCount;
        this.totalCount = totalCount;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public int getAddedCount() {
        return addedCount;
    }

    public void setAddedCount(int addedCount) {
        this.addedCount = addedCount;
    }

    public int getRemovedCount() {
        return removedCount;
    }

    public void setRemovedCount(int removedCount) {
        this.removedCount = removedCount;
    }

    public int getModifiedCount() {
        return modifiedCount;
    }

    public void setModifiedCount(int modifiedCount) {
        this.modifiedCount = modifiedCount;
    }

    public int getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(int totalCount) {
        this.totalCount = totalCount;
    }
}
