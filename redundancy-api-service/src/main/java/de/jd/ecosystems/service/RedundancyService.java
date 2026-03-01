package de.jd.ecosystems.service;

import de.jd.ecosystems.messages.ComponentAnalysisRequest;
import de.jd.ecosystems.messages.ReleaseAnalysisRequest;
import de.jd.ecosystems.model.Component;
import de.jd.ecosystems.model.ProcessingStatus;
import de.jd.ecosystems.model.Release;
import de.jd.ecosystems.model.ClassFile;
import de.jd.ecosystems.repository.ComponentRepository;
import de.jd.ecosystems.repository.ReleaseRepository;
import de.jd.ecosystems.repository.ClassFileRepository;
import de.jd.ecosystems.dto.ClassDiffDTO;
import de.jd.ecosystems.dto.ReleaseDiffDTO;
import de.jd.ecosystems.util.VersionUtils;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class RedundancyService {

    private final ComponentRepository componentRepository;
    private final ReleaseRepository releaseRepository;
    private final ClassFileRepository classFileRepository;
    private final RabbitTemplate rabbitTemplate;
    private final org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    public RedundancyService(ComponentRepository componentRepository,
            ReleaseRepository releaseRepository,
            ClassFileRepository classFileRepository,
            RabbitTemplate rabbitTemplate,
            org.springframework.transaction.support.TransactionTemplate transactionTemplate) {
        this.componentRepository = componentRepository;
        this.releaseRepository = releaseRepository;
        this.classFileRepository = classFileRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.transactionTemplate = transactionTemplate;
    }

    public ProcessingStatus getComponentRedundancyStatus(String groupId, String artifactId) {
        boolean needsQueue = false;
        Optional<Component> componentOpt = componentRepository.findByGroupIdAndArtifactId(groupId, artifactId);

        if (componentOpt.isEmpty()) {
            transactionTemplate.executeWithoutResult(status -> createInitialComponent(groupId, artifactId));
            needsQueue = true;
        } else {
            Component component = componentOpt.get();
            if (component.getStatus() == ProcessingStatus.FAILED
                    || component.getStatus() == ProcessingStatus.NOT_FOUND) {
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                if (component.getLastModified() == null || component.getLastModified().isBefore(now.minusHours(24))) {
                    transactionTemplate.executeWithoutResult(status -> retryComponent(groupId, artifactId));
                    needsQueue = true;
                }
            }
        }

        if (needsQueue) {
            queueComponentAnalysisTask(groupId, artifactId);
        }

        return componentRepository.findByGroupIdAndArtifactId(groupId, artifactId)
                .map(Component::getStatus)
                .orElse(ProcessingStatus.PENDING);
    }

    private void createInitialComponent(String groupId, String artifactId) {
        Component component = new Component();
        component.setGroupId(groupId);
        component.setArtifactId(artifactId);
        component.setStatus(ProcessingStatus.PENDING);
        component.setLastModified(java.time.LocalDateTime.now());
        componentRepository.save(component);
    }

    private void retryComponent(String groupId, String artifactId) {
        componentRepository.findByGroupIdAndArtifactId(groupId, artifactId).ifPresent(c -> {
            c.setStatus(ProcessingStatus.PENDING);
            c.setLastModified(java.time.LocalDateTime.now());
            componentRepository.save(c);
        });
    }

    @Transactional(readOnly = true)
    public Optional<Component> getComponent(String groupId, String artifactId) {
        return componentRepository.findByGroupIdAndArtifactId(groupId, artifactId);
    }

    @Transactional(readOnly = true)
    public Page<Component> getComponents(Optional<List<ProcessingStatus>> statuses, Pageable pageable) {
        // Enforce max page size of 50
        int pageSize = Math.min(pageable.getPageSize(), 50);
        Pageable cappedPageable = PageRequest.of(pageable.getPageNumber(), pageSize, pageable.getSort());

        if (statuses.isPresent() && !statuses.get().isEmpty()) {
            List<ProcessingStatus> statusList = statuses.get();
            if (statusList.size() == 1) {
                return componentRepository.findByStatus(statusList.get(0), cappedPageable);
            }
            return componentRepository.findByStatusIn(statusList, cappedPageable);
        }
        return componentRepository.findAll(cappedPageable);
    }

    public ProcessingStatus getReleaseChangesStatus(String groupId, String artifactId, String version) {
        // Ensure component exists
        ProcessingStatus componentStatus = getComponentRedundancyStatus(groupId, artifactId);
        if (componentStatus == ProcessingStatus.PENDING) {
            return ProcessingStatus.PENDING;
        }

        boolean needsQueue = false;
        Component component = componentRepository.findByGroupIdAndArtifactId(groupId, artifactId).orElseThrow();
        Optional<Release> releaseOpt = releaseRepository.findByComponentAndVersion(component, version);

        if (releaseOpt.isEmpty()) {
            transactionTemplate.executeWithoutResult(status -> createInitialRelease(groupId, artifactId, version));
            needsQueue = true;
        } else {
            Release release = releaseOpt.get();
            if (release.getStatus() == ProcessingStatus.FAILED || release.getStatus() == ProcessingStatus.NOT_FOUND) {
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                if (release.getLastModified() == null || release.getLastModified().isBefore(now.minusHours(24))) {
                    transactionTemplate.executeWithoutResult(status -> retryRelease(groupId, artifactId, version));
                    needsQueue = true;
                }
            }
        }

        if (needsQueue) {
            queueReleaseAnalysisTask(groupId, artifactId, version);
        }

        return releaseRepository.findByComponentAndVersion(component, version)
                .map(Release::getStatus)
                .orElse(ProcessingStatus.PENDING);
    }

    private void createInitialRelease(String groupId, String artifactId, String version) {
        Component component = componentRepository.findByGroupIdAndArtifactId(groupId, artifactId).orElseThrow();
        Release release = new Release();
        release.setComponent(component);
        release.setVersion(version);
        release.setStatus(ProcessingStatus.PENDING);
        release.setLastModified(java.time.LocalDateTime.now());
        releaseRepository.save(release);
    }

    private void retryRelease(String groupId, String artifactId, String version) {
        Component component = componentRepository.findByGroupIdAndArtifactId(groupId, artifactId).orElseThrow();
        releaseRepository.findByComponentAndVersion(component, version).ifPresent(r -> {
            r.setStatus(ProcessingStatus.PENDING);
            r.setLastModified(java.time.LocalDateTime.now());
            releaseRepository.save(r);
        });
    }

    @Transactional(readOnly = true)
    public Optional<Release> getRelease(String groupId, String artifactId, String version) {
        Optional<Component> component = componentRepository.findByGroupIdAndArtifactId(groupId, artifactId);
        if (component.isEmpty())
            return Optional.empty();
        return releaseRepository.findByComponentAndVersion(component.get(), version);
    }

    @Transactional(readOnly = true)
    public Page<Release> getReleasesForClass(Long classFileId, Pageable pageable) {
        return releaseRepository.findByClassFilesId(classFileId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Release> getClassOccurrences(String fqn) {
        Optional<ClassFile> classFile = classFileRepository.findByFqn(fqn);
        if (classFile.isEmpty()) {
            return List.of();
        }
        return classFile.get().getReleases();
    }

    @Transactional(readOnly = true)
    public ReleaseDiffDTO getReleaseDiff(String groupId, String artifactId, String version) {
        Component component = componentRepository.findByGroupIdAndArtifactId(groupId, artifactId)
                .orElseThrow(() -> new IllegalArgumentException("Component not found"));

        List<Release> allReleases = releaseRepository.findByComponent(component);
        List<String> sortedVersions = VersionUtils.sortVersions(
                allReleases.stream().map(Release::getVersion).collect(Collectors.toList()));

        int currentIndex = sortedVersions.indexOf(version);
        if (currentIndex < 0) {
            throw new IllegalArgumentException("Version not found for component");
        }

        Release currentRelease = allReleases.stream()
                .filter(r -> r.getVersion().equals(version)).findFirst().get();

        String previousVersion = (currentIndex > 0) ? sortedVersions.get(currentIndex - 1) : null;
        Release previousRelease = (previousVersion != null) ? allReleases.stream()
                .filter(r -> r.getVersion().equals(previousVersion)).findFirst().orElse(null) : null;

        ReleaseDiffDTO diff = new ReleaseDiffDTO();
        diff.setVersion(version);
        diff.setPreviousVersion(previousVersion);
        diff.setTotalClasses(currentRelease.getClassFiles().size());
        diff.setAdded(new ArrayList<>());
        diff.setRemoved(new ArrayList<>());
        diff.setModified(new ArrayList<>());

        Map<String, ClassFile> currentClasses = currentRelease.getClassFiles().stream()
                .collect(Collectors.toMap(ClassFile::getFqn, cf -> cf));

        if (previousRelease == null) {
            // All classes are "added" if it's the first release
            currentClasses.forEach((fqn, cf) -> diff.getAdded().add(new ClassDiffDTO(cf.getId(), fqn, cf.getSha512())));
        } else {
            Map<String, ClassFile> previousClasses = previousRelease.getClassFiles().stream()
                    .collect(Collectors.toMap(ClassFile::getFqn, cf -> cf));

            // Added: In current, not in previous
            currentClasses.forEach((fqn, cf) -> {
                if (!previousClasses.containsKey(fqn)) {
                    diff.getAdded().add(new ClassDiffDTO(cf.getId(), fqn, cf.getSha512()));
                } else if (!previousClasses.get(fqn).getSha512().equals(cf.getSha512())) {
                    // Modified: In both, but different hash
                    diff.getModified().add(new ClassDiffDTO(cf.getId(), fqn, cf.getSha512()));
                }
            });

            // Removed: In previous, not in current
            previousClasses.forEach((fqn, cf) -> {
                if (!currentClasses.containsKey(fqn)) {
                    diff.getRemoved().add(new ClassDiffDTO(cf.getId(), fqn, cf.getSha512()));
                }
            });
        }

        return diff;
    }

    private void queueComponentAnalysisTask(String groupId, String artifactId) {
        ComponentAnalysisRequest request = new ComponentAnalysisRequest(groupId, artifactId);
        rabbitTemplate.convertAndSend("maven-central-component-analysis", request);
    }

    private void queueReleaseAnalysisTask(String groupId, String artifactId, String version) {
        ReleaseAnalysisRequest request = new ReleaseAnalysisRequest(groupId, artifactId, version);
        rabbitTemplate.convertAndSend("maven-central-release-analysis", request);
    }

    @Transactional(readOnly = true)
    public List<ClassFile> getTopClassFiles() {
        return classFileRepository.findTop10ByReleaseCount(PageRequest.of(0, 10));
    }
}
