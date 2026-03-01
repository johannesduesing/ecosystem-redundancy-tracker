package de.jd.ecosystems.analyzer.service;

import de.jd.ecosystems.analyzer.client.MavenCentralClient;
import de.jd.ecosystems.analyzer.repository.ClassFileRepository;
import de.jd.ecosystems.analyzer.repository.ComponentRepository;
import de.jd.ecosystems.analyzer.repository.ReleaseRepository;
import de.jd.ecosystems.messages.ReleaseAnalysisRequest;
import de.jd.ecosystems.model.ClassFile;
import de.jd.ecosystems.model.Component;
import de.jd.ecosystems.model.ProcessingStatus;
import de.jd.ecosystems.model.Release;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class AnalyzerService {

    private final MavenCentralClient mavenClient;
    private final ComponentRepository componentRepository;
    private final ReleaseRepository releaseRepository;
    private final ClassFileRepository classFileRepository;

    public AnalyzerService(MavenCentralClient mavenClient,
            ComponentRepository componentRepository,
            ReleaseRepository releaseRepository,
            ClassFileRepository classFileRepository) {
        this.mavenClient = mavenClient;
        this.componentRepository = componentRepository;
        this.releaseRepository = releaseRepository;
        this.classFileRepository = classFileRepository;
    }

    @RabbitListener(queues = "maven-central-release-analysis")
    @Transactional
    public void processRelease(ReleaseAnalysisRequest request) {
        String groupId = request.getGroupId();
        String artifactId = request.getArtifactId();
        String version = request.getVersion();

        Optional<Component> componentOpt = componentRepository.findByGroupIdAndArtifactId(groupId, artifactId);
        if (componentOpt.isEmpty()) {
            System.err.println("Component not found for analysis: " + groupId + ":" + artifactId);
            return;
        }

        Optional<Release> releaseOpt = releaseRepository.findByComponentAndVersion(componentOpt.get(), version);

        // Safety: If not found, wait a bit and retry (handles DB sync lag)
        if (releaseOpt.isEmpty()) {
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            releaseOpt = releaseRepository.findByComponentAndVersion(componentOpt.get(), version);
        }

        if (releaseOpt.isEmpty()) {
            System.err.println(
                    "Release not found for analysis after retry: " + groupId + ":" + artifactId + ":" + version);
            return;
        }

        Release release = releaseOpt.get();
        // Clear existing class files if re-processing
        release.setClassFiles(new ArrayList<>());

        try (InputStream jarStream = mavenClient.downloadJar(groupId, artifactId, version);
                ZipInputStream zipStream = new ZipInputStream(jarStream)) {

            List<ClassFile> classFiles = new ArrayList<>();
            ZipEntry entry;
            while ((entry = zipStream.getNextEntry()) != null) {
                if (!entry.isDirectory() && entry.getName().endsWith(".class")) {
                    byte[] content = zipStream.readAllBytes();
                    String sha512 = computeSha512(content);
                    String fqn = entry.getName();

                    ClassFile classFile = findOrCreateClassFile(fqn, sha512);
                    classFiles.add(classFile);
                }
            }

            release.setClassFiles(classFiles);
            release.setStatus(ProcessingStatus.READY);
            release.setLastModified(LocalDateTime.now());
            releaseRepository.save(release);
            System.out.println("Successfully analyzed " + groupId + ":" + artifactId + ":" + version);

        } catch (FileNotFoundException e) {
            System.err.println("Artifact not found: " + groupId + ":" + artifactId + ":" + version);
            release.setStatus(ProcessingStatus.NOT_FOUND);
            release.setLastModified(LocalDateTime.now());
            releaseRepository.save(release);
        } catch (Exception e) {
            e.printStackTrace();
            release.setStatus(ProcessingStatus.FAILED);
            release.setLastModified(LocalDateTime.now());
            releaseRepository.save(release);
        }
    }

    private ClassFile findOrCreateClassFile(String fqn, String sha512) {
        return classFileRepository.findByFqnAndSha512(fqn, sha512)
                .orElseGet(() -> {
                    ClassFile cf = new ClassFile();
                    cf.setFqn(fqn);
                    cf.setSha512(sha512);
                    return classFileRepository.save(cf);
                });
    }

    private String computeSha512(byte[] content) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-512");
        byte[] hash = digest.digest(content);
        return HexFormat.of().formatHex(hash);
    }
}
