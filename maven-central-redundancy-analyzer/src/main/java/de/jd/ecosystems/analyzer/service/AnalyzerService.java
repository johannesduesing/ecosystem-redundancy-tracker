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
import de.jd.ecosystems.util.DatabaseSizeGuard;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class AnalyzerService {

    private final MavenCentralClient mavenClient;
    private final ComponentRepository componentRepository;
    private final ReleaseRepository releaseRepository;
    private final ClassFileRepository classFileRepository;
    private final DatabaseSizeGuard sizeGuard;

    private static final long DB_SIZE_LIMIT = 25 * 1024 * 1024 * 1024L; // 25 GB

    public AnalyzerService(MavenCentralClient mavenClient,
            ComponentRepository componentRepository,
            ReleaseRepository releaseRepository,
            ClassFileRepository classFileRepository,
            DatabaseSizeGuard sizeGuard) {
        this.mavenClient = mavenClient;
        this.componentRepository = componentRepository;
        this.releaseRepository = releaseRepository;
        this.classFileRepository = classFileRepository;
        this.sizeGuard = sizeGuard;
    }

    @RabbitListener(queues = "maven-central-release-analysis")
    @Transactional
    public void processRelease(ReleaseAnalysisRequest request) {
        if (sizeGuard.isLimitExceeded(DB_SIZE_LIMIT)) {
            System.err.println("Skipping release analysis due to DB size limit: " + request.getGroupId() + ":" + request.getArtifactId() + ":" + request.getVersion());
            return;
        }

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

            // --- Step 1: Collect all (fqn -> sha512, size) pairs from the JAR in memory ---
            // This avoids issuing any DB query inside the hot loop.
            List<ClassFileInfo> fileInfos = new ArrayList<>();
            ZipEntry entry;
            while ((entry = zipStream.getNextEntry()) != null) {
                if (!entry.isDirectory() && entry.getName().endsWith(".class")) {
                    byte[] content = zipStream.readAllBytes();
                    fileInfos.add(new ClassFileInfo(entry.getName(), computeSha512(content), content.length));
                }
            }

            // --- Step 2: One bulk SELECT for all already-known class files ---
            List<ClassFile> classFiles = batchFindOrCreate(fileInfos);
            classFileRepository.incrementReleaseCounts(classFiles);

            release.setClassFiles(classFiles);
            release.setStatus(ProcessingStatus.READY);
            release.setLastModified(LocalDateTime.now());
            releaseRepository.save(release);
            System.out.println("Successfully analyzed " + groupId + ":" + artifactId + ":" + version);

        } catch (FileNotFoundException e) {
            System.err.println("Artifact not found: " + groupId + ":" + artifactId + ":" + version);
            Release rel = releaseOpt.get();
            rel.setStatus(ProcessingStatus.NOT_FOUND);
            rel.setLastModified(LocalDateTime.now());
            releaseRepository.save(rel);
        } catch (Exception e) {
            e.printStackTrace();
            Release rel = releaseOpt.get();
            rel.setStatus(ProcessingStatus.FAILED);
            rel.setLastModified(LocalDateTime.now());
            releaseRepository.save(rel);
        }
    }

    /**
     * Fetches all already-known ClassFile rows matching the provided (fqn, sha512)
     * pairs in a SINGLE bulk SELECT, then inserts the genuinely new ones via
     * saveAll() (which Hibernate batches into groups based on jdbc.batch_size).
     *
     * Before this change: N individual SELECTs per JAR (one per .class entry).
     * After this change: 1 SELECT + at most 1 batched INSERT statement group.
     */
    private List<ClassFile> batchFindOrCreate(List<ClassFileInfo> fileInfos) {
        if (fileInfos.isEmpty()) {
            return new ArrayList<>();
        }

        String[] fqns = fileInfos.stream().map(ClassFileInfo::fqn).toArray(String[]::new);
        String[] sha512s = fileInfos.stream().map(ClassFileInfo::sha512).toArray(String[]::new);

        // One bulk SELECT — uses the uq_class_file_fqn_sha512 index
        List<ClassFile> existing = classFileRepository.findAllByFqnAndSha512Pairs(fqns, sha512s);

        // Build a lookup key so we can detect which entries are already persisted
        Map<String, ClassFile> existingByKey = existing.stream()
                .collect(Collectors.toMap(
                        cf -> cf.getFqn() + "|" + cf.getSha512(),
                        Function.identity()));

        // Determine genuinely new class files
        List<ClassFile> toInsert = new ArrayList<>();
        for (ClassFileInfo info : fileInfos) {
            String key = info.fqn() + "|" + info.sha512();
            if (!existingByKey.containsKey(key)) {
                ClassFile cf = new ClassFile();
                cf.setFqn(info.fqn());
                cf.setSha512(info.sha512());
                cf.setSizeBytes(info.size());
                toInsert.add(cf);
            }
        }

        // Batched INSERT — Hibernate groups these per jdbc.batch_size
        List<ClassFile> inserted = classFileRepository.saveAll(toInsert);

        // Combine existing + newly inserted for the full result
        List<ClassFile> all = new ArrayList<>(existing);
        all.addAll(inserted);
        return all;
    }

    private record ClassFileInfo(String fqn, String sha512, long size) {}

    private String computeSha512(byte[] content) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-512");
        byte[] hash = digest.digest(content);
        return HexFormat.of().formatHex(hash);
    }
}
