package de.jd.ecosystems.dto;

import de.jd.ecosystems.model.Component;
import de.jd.ecosystems.model.ProcessingStatus;

import java.time.LocalDateTime;

public class ComponentListDTO {
    private Long id;
    private String groupId;
    private String artifactId;
    private ProcessingStatus status;
    private LocalDateTime lastModified;

    public ComponentListDTO() {
    }

    public ComponentListDTO(Component component) {
        this.id = component.getId();
        this.groupId = component.getGroupId();
        this.artifactId = component.getArtifactId();
        this.status = component.getStatus();
        this.lastModified = component.getLastModified();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getGroupId() {
        return groupId;
    }

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public String getArtifactId() {
        return artifactId;
    }

    public void setArtifactId(String artifactId) {
        this.artifactId = artifactId;
    }

    public ProcessingStatus getStatus() {
        return status;
    }

    public void setStatus(ProcessingStatus status) {
        this.status = status;
    }

    public LocalDateTime getLastModified() {
        return lastModified;
    }

    public void setLastModified(LocalDateTime lastModified) {
        this.lastModified = lastModified;
    }
}
