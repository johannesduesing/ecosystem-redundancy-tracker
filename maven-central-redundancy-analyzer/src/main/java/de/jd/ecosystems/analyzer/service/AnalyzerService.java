package de.jd.ecosystems.analyzer.service;

import de.jd.ecosystems.analyzer.client.MavenCentralClient;
import de.jd.ecosystems.analyzer.repository.ProjectFileRepository;
import de.jd.ecosystems.analyzer.repository.ComponentRepository;
import de.jd.ecosystems.analyzer.repository.ReleaseRepository;
import de.jd.ecosystems.messages.ReleaseAnalysisRequest;
import de.jd.ecosystems.model.ProjectFile;
import de.jd.ecosystems.model.Component;
import de.jd.ecosystems.model.ProcessingStatus;
import de.jd.ecosystems.model.Release;
import de.jd.ecosystems.util.DatabaseSizeGuard;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.FileNotFoundException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
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
    private final ProjectFileRepository projectFileRepository;
    private final DatabaseSizeGuard sizeGuard;

    private static final long DB_SIZE_LIMIT = 25 * 1024 * 1024 * 1024L; // 25 GB

    public AnalyzerService(MavenCentralClient mavenClient,
            ComponentRepository componentRepository,
            ReleaseRepository releaseRepository,
            ProjectFileRepository projectFileRepository,
            DatabaseSizeGuard sizeGuard) {
        this.mavenClient = mavenClient;
        this.componentRepository = componentRepository;
        this.releaseRepository = releaseRepository;
        this.projectFileRepository = projectFileRepository;
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
        // Clear existing files if re-processing
        release.setFiles(new ArrayList<>());

        try (InputStream jarStream = mavenClient.downloadJar(groupId, artifactId, version);
                ZipInputStream zipStream = new ZipInputStream(jarStream)) {

            // --- Step 1: Collect all (fqn -> sha512, size) pairs from the JAR in memory ---
            List<FileInfo> fileInfos = new ArrayList<>();
            ZipEntry entry;
            while ((entry = zipStream.getNextEntry()) != null) {
                if (!entry.isDirectory()) {
                    String name = entry.getName();
                    byte[] content = zipStream.readAllBytes();
                    
                    String extension = "";
                    int lastDot = name.lastIndexOf('.');
                    if (lastDot > 0) {
                        extension = name.substring(lastDot + 1).toLowerCase();
                    }
                    
                    boolean isCode = extension.equals("class");
                    
                    fileInfos.add(new FileInfo(name, computeSha512(content), content.length, extension, isCode));
                }
            }

            // --- Step 2: One bulk SELECT for all already-known files ---
            List<ProjectFile> files = batchFindOrCreate(fileInfos);
            projectFileRepository.incrementReleaseCounts(files);

            release.setFiles(files);
            release.setStatus(ProcessingStatus.READY);
            release.setLastModified(LocalDateTime.now());
            releaseRepository.save(release);
            System.out.println("Successfully analyzed " + groupId + ":" + artifactId + ":" + version + " (" + files.size() + " files)");

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
    private List<ProjectFile> batchFindOrCreate(List<FileInfo> fileInfos) {
        if (fileInfos.isEmpty()) {
            return new ArrayList<>();
        }

        String[] fqns = fileInfos.stream().map(FileInfo::fqn).toArray(String[]::new);
        String[] sha512s = fileInfos.stream().map(FileInfo::sha512).toArray(String[]::new);

        // One bulk SELECT — uses the uq_project_file_fqn_sha512 index
        List<ProjectFile> existing = projectFileRepository.findAllByFqnAndSha512Pairs(fqns, sha512s);

        // Build a lookup key so we can detect which entries are already persisted
        Map<String, ProjectFile> existingByKey = existing.stream()
                .collect(Collectors.toMap(
                        pf -> pf.getFqn() + "|" + pf.getSha512(),
                        Function.identity()));

        // Determine genuinely new files
        List<ProjectFile> toInsert = new ArrayList<>();
        for (FileInfo info : fileInfos) {
            String key = info.fqn() + "|" + info.sha512();
            if (!existingByKey.containsKey(key)) {
                ProjectFile pf = new ProjectFile();
                pf.setFqn(info.fqn());
                pf.setSha512(info.sha512());
                pf.setSizeBytes(info.size());
                pf.setFileType(info.fileType());
                pf.setCode(info.isCode());
                toInsert.add(pf);
            }
        }

        // Batched INSERT
        List<ProjectFile> inserted = projectFileRepository.saveAll(toInsert);

        // Combine existing + newly inserted for the full result
        List<ProjectFile> all = new ArrayList<>(existing);
        all.addAll(inserted);
        return all;
    }

    private record FileInfo(String fqn, String sha512, long size, String fileType, boolean isCode) {}

    private String computeSha512(byte[] content) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-512");
        byte[] hash = digest.digest(content);
        return HexFormat.of().formatHex(hash);
    }
}
