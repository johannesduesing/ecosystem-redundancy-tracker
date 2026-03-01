package de.jd.ecosystems.producer.client;

import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import de.jd.ecosystems.producer.client.model.MavenMetadata;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Collections;
import java.util.List;

@Component
public class MavenMetadataClient {

    private final HttpClient httpClient;
    private final String baseUrl;
    private final XmlMapper xmlMapper;

    public MavenMetadataClient(@Value("${maven.central.url:https://repo1.maven.org/maven2}") String baseUrl) {
        this.httpClient = HttpClient.newBuilder().version(HttpClient.Version.HTTP_2).build();
        this.baseUrl = baseUrl;
        this.xmlMapper = new XmlMapper();
        // Ignore unknown properties (like lastUpdated, etc)
        this.xmlMapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                false);
    }

    public List<String> getVersions(String groupId, String artifactId) throws IOException, InterruptedException {
        String groupPath = groupId.replace('.', '/');
        // Standard metadata URL
        String url = String.format("%s/%s/%s/maven-metadata.xml", baseUrl, groupPath, artifactId);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());

        if (response.statusCode() == 404) {
            throw new FileNotFoundException("Metadata not found at " + url);
        }

        if (response.statusCode() != 200) {
            throw new IOException("Failed to fetch metadata from " + url + ". Status code: " + response.statusCode());
        }

        MavenMetadata metadata = xmlMapper.readValue(response.body(), MavenMetadata.class);
        if (metadata != null && metadata.getVersioning() != null && metadata.getVersioning().getVersions() != null) {
            return metadata.getVersioning().getVersions();
        }

        return Collections.emptyList();
    }
}
