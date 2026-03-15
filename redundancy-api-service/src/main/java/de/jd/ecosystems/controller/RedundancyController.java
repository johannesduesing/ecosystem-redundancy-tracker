package de.jd.ecosystems.controller;

import de.jd.ecosystems.model.ProcessingStatus;
import de.jd.ecosystems.service.RedundancyService;
import de.jd.ecosystems.dto.ReleaseDiffDTO;
import org.springframework.http.ResponseEntity;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/v1")
public class RedundancyController {

    private final RedundancyService service;

    public RedundancyController(RedundancyService service) {
        this.service = service;
    }

    @GetMapping("/components")
    public ResponseEntity<?> getComponents(
            @RequestParam(required = false) List<ProcessingStatus> status,
            Pageable pageable) {
        return ResponseEntity.ok(service.getComponents(Optional.ofNullable(status), pageable));
    }

    @GetMapping("/components/{groupId}/{artifactId}/exists")
    public ResponseEntity<Boolean> checkComponentExists(@PathVariable("groupId") String groupId,
            @PathVariable("artifactId") String artifactId) {
        boolean exists = service.checkComponentExistsOnMavenCentral(groupId, artifactId);
        return ResponseEntity.ok(exists);
    }

    @GetMapping("/top-classes")
    public ResponseEntity<List<de.jd.ecosystems.model.ClassFile>> getTopClasses() {
        return ResponseEntity.ok(service.getTopClassFiles());
    }

    @GetMapping("/redundancy/{groupId}/{artifactId}")
    public ResponseEntity<?> getComponentRedundancy(@PathVariable("groupId") String groupId,
            @PathVariable("artifactId") String artifactId) {
        ProcessingStatus status = service.getComponentRedundancyStatus(groupId, artifactId);

        if (status == ProcessingStatus.PENDING) {
            return ResponseEntity.accepted().body("Analysis pending for " + groupId + ":" + artifactId);
        } else if (status == ProcessingStatus.FAILED) {
            return ResponseEntity.internalServerError().body("Analysis failed for " + groupId + ":" + artifactId);
        }

        return ResponseEntity.ok(service.getComponent(groupId, artifactId).orElseThrow());
    }

    @GetMapping("/releases/{groupId}/{artifactId}/{version}/changes")
    public ResponseEntity<?> getReleaseChanges(@PathVariable("groupId") String groupId,
            @PathVariable("artifactId") String artifactId,
            @PathVariable("version") String version) {
        ProcessingStatus status = service.getReleaseChangesStatus(groupId, artifactId, version);

        if (status == ProcessingStatus.PENDING) {
            return ResponseEntity.accepted().body("Analysis pending for " + groupId + ":" + artifactId + ":" + version);
        } else if (status == ProcessingStatus.FAILED) {
            return ResponseEntity.internalServerError().body("Analysis failed.");
        }

        return ResponseEntity.ok(service.getRelease(groupId, artifactId, version).orElseThrow());
    }

    @GetMapping("/classes/{fqn:.+}/occurrences")
    public ResponseEntity<?> getClassOccurrences(@PathVariable("fqn") String fqn) {
        // This is a direct lookup. If the class exists, we return occurrences.
        // We might want to "search" for it if not found, but for now let's assume valid
        // lookup.
        return ResponseEntity.ok(service.getClassOccurrences(fqn));
    }

    @GetMapping("/releases/{groupId}/{artifactId}/{version}/diff")
    public ResponseEntity<ReleaseDiffDTO> getReleaseDiff(@PathVariable("groupId") String groupId,
            @PathVariable("artifactId") String artifactId,
            @PathVariable("version") String version,
            @RequestParam(required = false) String baseVersion) {
        return ResponseEntity.ok(service.getReleaseDiff(groupId, artifactId, version, baseVersion));
    }

    @GetMapping("/classes/revisions")
    public ResponseEntity<?> getClassRevisions(@RequestParam("fqn") String fqn, Pageable pageable) {
        return ResponseEntity.ok(service.getClassRevisions(fqn, pageable));
    }

    @GetMapping("/classes/{id}/releases")
    public ResponseEntity<?> getReleasesByClassId(@PathVariable("id") Long id, Pageable pageable) {
        return ResponseEntity.ok(service.getReleasesForClass(id, pageable));
    }

    @GetMapping("/classes/{id}")
    public ResponseEntity<de.jd.ecosystems.model.ClassFile> getClassFile(@PathVariable("id") Long id) {
        return service.getClassFileById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
