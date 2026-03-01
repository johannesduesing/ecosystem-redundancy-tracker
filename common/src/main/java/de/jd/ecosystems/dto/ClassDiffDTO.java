package de.jd.ecosystems.dto;

public class ClassDiffDTO {
    private Long id;
    private String fqn;
    private String sha512;

    public ClassDiffDTO() {
    }

    public ClassDiffDTO(Long id, String fqn, String sha512) {
        this.id = id;
        this.fqn = fqn;
        this.sha512 = sha512;
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

    public String getSha512() {
        return sha512;
    }

    public void setSha512(String sha512) {
        this.sha512 = sha512;
    }
}
