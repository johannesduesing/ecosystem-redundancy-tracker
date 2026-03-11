package de.jd.ecosystems.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.JoinTable;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Column;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "release",
    uniqueConstraints = @UniqueConstraint(name = "uq_release_component_version", columnNames = {"component_id", "version"})
)
public class Release {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String version;

    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(nullable = false)
    private ProcessingStatus status = ProcessingStatus.PENDING;

    @Column(name = "last_modified")
    private LocalDateTime lastModified;

    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("releases")
    @ManyToOne(optional = false)
    @JoinColumn(name = "component_id", nullable = false)
    private Component component;

    @ManyToMany
    @JoinTable(name = "release_class_files", joinColumns = @JoinColumn(name = "release_id"), inverseJoinColumns = @JoinColumn(name = "class_file_id"))
    private List<ClassFile> classFiles;

    public Release() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
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

    public Component getComponent() {
        return component;
    }

    public void setComponent(Component component) {
        this.component = component;
    }

    public List<ClassFile> getClassFiles() {
        return classFiles;
    }

    public void setClassFiles(List<ClassFile> classFiles) {
        this.classFiles = classFiles;
    }
}
