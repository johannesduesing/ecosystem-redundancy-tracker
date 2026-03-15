package de.jd.ecosystems.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Column;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.List;

@Entity
@Table(
    name = "project_file",
    uniqueConstraints = @UniqueConstraint(name = "uq_project_file_fqn_sha512", columnNames = {"fqn", "sha512"}),
    indexes = {
        @jakarta.persistence.Index(name = "idx_project_file_release_count", columnList = "release_count"),
        @jakarta.persistence.Index(name = "idx_project_file_is_code", columnList = "is_code")
    }
)
public class ProjectFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 4096)
    private String fqn;

    @Column(name = "file_type", nullable = false)
    private String fileType;

    @Column(name = "is_code", nullable = false)
    private boolean isCode;

    @Column(nullable = false, length = 128)
    private String sha512;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "release_count", nullable = false)
    private long releaseCount = 0;

    @JsonIgnore
    @ManyToMany(mappedBy = "files")
    private List<Release> releases;

    public ProjectFile() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFqn() {
        return fqn;
    }

    public void setFqn(String fqn) {
        this.fqn = fqn;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public boolean isCode() {
        return isCode;
    }

    public void setCode(boolean code) {
        isCode = code;
    }

    public String getSha512() {
        return sha512;
    }

    public void setSha512(String sha512) {
        this.sha512 = sha512;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public long getReleaseCount() {
        return releaseCount;
    }

    public void setReleaseCount(long releaseCount) {
        this.releaseCount = releaseCount;
    }

    public List<Release> getReleases() {
        return releases;
    }

    public void setReleases(List<Release> releases) {
        this.releases = releases;
    }
}
