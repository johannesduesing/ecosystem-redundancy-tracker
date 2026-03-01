package de.jd.ecosystems.producer.service;

import de.jd.ecosystems.messages.ComponentAnalysisRequest;
import de.jd.ecosystems.messages.ReleaseAnalysisRequest;
import de.jd.ecosystems.model.Component;
import de.jd.ecosystems.model.ProcessingStatus;
import de.jd.ecosystems.model.Release;
import de.jd.ecosystems.producer.client.MavenMetadataClient;
import de.jd.ecosystems.producer.repository.ComponentRepository;
import de.jd.ecosystems.producer.repository.ReleaseRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.FileNotFoundException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ProducerService {

    private final MavenMetadataClient metadataClient;
    private final ComponentRepository componentRepository;
    private final ReleaseRepository releaseRepository;
    private final RabbitTemplate rabbitTemplate;
    private final org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    public ProducerService(MavenMetadataClient metadataClient,
            ComponentRepository componentRepository,
            ReleaseRepository releaseRepository,
            RabbitTemplate rabbitTemplate,
            org.springframework.transaction.support.TransactionTemplate transactionTemplate) {
        this.metadataClient = metadataClient;
        this.componentRepository = componentRepository;
        this.releaseRepository = releaseRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.transactionTemplate = transactionTemplate;
    }

    @RabbitListener(queues = "maven-central-component-analysis")
    public void processComponent(ComponentAnalysisRequest request) {
        String groupId = request.getGroupId();
        String artifactId = request.getArtifactId();

        Optional<Component> componentOpt = componentRepository.findByGroupIdAndArtifactId(groupId, artifactId);

        // Safety: If not found, wait a bit and retry (handles DB sync lag from API)
        if (componentOpt.isEmpty()) {
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            componentOpt = componentRepository.findByGroupIdAndArtifactId(groupId, artifactId);
        }

        if (componentOpt.isEmpty()) {
            System.err.println("Component not found for analysis after retry: " + groupId + ":" + artifactId);
            return;
        }

        try {
            List<String> versions = metadataClient.getVersions(groupId, artifactId);
            List<String> versionsToAnalyze = transactionTemplate
                    .execute(status -> createReleasesIfMissing(groupId, artifactId, versions));

            for (String version : versionsToAnalyze) {
                queueReleaseAnalysisTask(groupId, artifactId, version);
            }

            System.out.println(
                    "Processed component " + groupId + ":" + artifactId + ". Triggered analysis for "
                            + versionsToAnalyze.size() + " new versions.");

        } catch (FileNotFoundException e) {
            System.err.println("Metadata not found: " + groupId + ":" + artifactId);
            transactionTemplate.executeWithoutResult(
                    status -> updateComponentStatus(groupId, artifactId, ProcessingStatus.NOT_FOUND));
        } catch (Exception e) {
            e.printStackTrace();
            transactionTemplate.executeWithoutResult(
                    status -> updateComponentStatus(groupId, artifactId, ProcessingStatus.FAILED));
        }
    }

    private List<String> createReleasesIfMissing(String groupId, String artifactId, List<String> versions) {
        Component component = componentRepository.findByGroupIdAndArtifactId(groupId, artifactId)
                .orElseThrow(() -> new RuntimeException("Component not found: " + groupId + ":" + artifactId));

        List<String> newVersions = new java.util.ArrayList<>();
        for (String version : versions) {
            Optional<Release> releaseOpt = releaseRepository.findByComponentAndVersion(component, version);
            if (releaseOpt.isEmpty()) {
                Release release = new Release();
                release.setComponent(component);
                release.setVersion(version);
                release.setStatus(ProcessingStatus.PENDING);
                releaseRepository.save(release);
                newVersions.add(version);
            }
        }

        component.setStatus(ProcessingStatus.READY);
        component.setLastModified(LocalDateTime.now());
        componentRepository.save(component);

        return newVersions;
    }

    private void updateComponentStatus(String groupId, String artifactId, ProcessingStatus status) {
        componentRepository.findByGroupIdAndArtifactId(groupId, artifactId).ifPresent(c -> {
            c.setStatus(status);
            c.setLastModified(LocalDateTime.now());
            componentRepository.save(c);
        });
    }

    private void queueReleaseAnalysisTask(String groupId, String artifactId, String version) {
        ReleaseAnalysisRequest request = new ReleaseAnalysisRequest(groupId, artifactId, version);
        rabbitTemplate.convertAndSend("maven-central-release-analysis", request);
    }
}
