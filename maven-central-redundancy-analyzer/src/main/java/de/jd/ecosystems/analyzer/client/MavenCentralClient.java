package de.jd.ecosystems.analyzer.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Component
public class MavenCentralClient {

    private final HttpClient httpClient;
    private final String baseUrl;

    public MavenCentralClient(@Value("${maven.central.url:https://repo1.maven.org/maven2}") String baseUrl) {
        this.httpClient = HttpClient.newBuilder().version(HttpClient.Version.HTTP_2).build();
        this.baseUrl = baseUrl;
    }

    public InputStream downloadJar(String groupId, String artifactId, String version)
            throws IOException, InterruptedException {
        String groupPath = groupId.replace('.', '/');
        String fileName = artifactId + "-" + version + ".jar";
        String url = String.format("%s/%s/%s/%s/%s", baseUrl, groupPath, artifactId, version, fileName);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .build();

        HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());

        if (response.statusCode() == 404) {
            throw new FileNotFoundException("Artifact not found at " + url);
        }

        if (response.statusCode() != 200) {
            throw new IOException("Failed to download JAR from " + url + ". Status code: " + response.statusCode());
        }

        return response.body();
    }
}
