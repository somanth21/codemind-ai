package com.codemind.ingestion;

import com.codemind.common.exception.CodeMindException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedInputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.util.List;

/**
 * Streams public repository ZIP archives directly from GitHub/codeload without shell commands.
 * Enforces connect/read timeouts, maximum downloaded bytes, and SSRF restrictions.
 */
@Service
public class GitHubIngestionService {

    private static final Logger log = LoggerFactory.getLogger(GitHubIngestionService.class);

    private static final int CONNECT_TIMEOUT_MS = 15000;
    private static final int READ_TIMEOUT_MS = 30000;
    private static final List<String> ALLOWED_REDIRECT_HOSTS = List.of("github.com", "www.github.com", "codeload.github.com");

    private final GitHubUrlValidator gitHubUrlValidator;
    private final SandboxProperties properties;

    public GitHubIngestionService(GitHubUrlValidator gitHubUrlValidator, SandboxProperties properties) {
        this.gitHubUrlValidator = gitHubUrlValidator;
        this.properties = properties;
    }

    public record DownloadedArchive(InputStream stream, long approximateBytes, String resolvedBranch) implements AutoCloseable {
        @Override
        public void close() throws Exception {
            if (stream != null) {
                stream.close();
            }
        }
    }

    /**
     * Attempts to fetch the repository archive for the given branch (or main/master fallback).
     */
    public DownloadedArchive fetchArchiveStream(GitHubUrlValidator.ValidatedGitHubRepo repo) {
        String[] branchesToTry = repo.defaultBranch().equals("main")
                ? new String[]{"main", "master"}
                : new String[]{repo.defaultBranch(), "main", "master"};

        for (String branch : branchesToTry) {
            try {
                DownloadedArchive archive = tryDownload(repo.owner(), repo.repoName(), branch);
                if (archive != null) {
                    log.info("Successfully established GitHub archive stream for {}/{} (branch: {})",
                            repo.owner(), repo.repoName(), branch);
                    return archive;
                }
            } catch (Exception e) {
                log.debug("Failed branch attempt '{}' for {}/{}: {}", branch, repo.owner(), repo.repoName(), e.getMessage());
            }
        }

        throw new CodeMindException("Could not retrieve public archive for repository " + repo.getFullName()
                + ". Ensure the repository is public and contains valid branches (main/master).");
    }

    private DownloadedArchive tryDownload(String owner, String repo, String branch) {
        String codeloadUrl = String.format("https://codeload.github.com/%s/%s/zip/refs/heads/%s", owner, repo, branch);
        try {
            HttpURLConnection connection = openConnection(codeloadUrl, 0);
            int responseCode = connection.getResponseCode();

            if (responseCode == HttpURLConnection.HTTP_OK) {
                long contentLength = connection.getContentLengthLong();
                if (contentLength > properties.getMaxArchiveSizeBytes()) {
                    connection.disconnect();
                    throw new CodeMindException("GitHub repository archive size exceeds maximum limit of "
                            + properties.getMaxArchiveSizeBytes() + " bytes");
                }

                InputStream is = new BoundedInputStream(
                        new BufferedInputStream(connection.getInputStream()),
                        properties.getMaxArchiveSizeBytes()
                );
                return new DownloadedArchive(is, contentLength > 0 ? contentLength : 0L, branch);
            } else if (responseCode == HttpURLConnection.HTTP_NOT_FOUND) {
                connection.disconnect();
                return null;
            } else {
                connection.disconnect();
                log.warn("GitHub returned HTTP {} for {}", responseCode, codeloadUrl);
                return null;
            }
        } catch (Exception e) {
            log.warn("Network error connecting to GitHub for {}/{}: {}", owner, repo, e.getMessage());
            return null;
        }
    }

    private HttpURLConnection openConnection(String targetUrl, int redirectDepth) throws Exception {
        if (redirectDepth > 3) {
            throw new CodeMindException("Too many HTTP redirects from GitHub");
        }

        URI uri = new URI(targetUrl);
        String host = uri.getHost();
        if (host == null || !ALLOWED_REDIRECT_HOSTS.contains(host.toLowerCase())) {
            throw new CodeMindException("Illegal redirect to unapproved host: " + host);
        }

        URL url = uri.toURL();
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
        conn.setReadTimeout(READ_TIMEOUT_MS);
        conn.setInstanceFollowRedirects(false); // Follow manually to validate redirect hosts
        conn.setRequestProperty("User-Agent", "CodeMind-AI-Ingestion-Engine/1.0");
        conn.setRequestProperty("Accept", "application/zip, application/octet-stream");

        int code = conn.getResponseCode();
        if (code == HttpURLConnection.HTTP_MOVED_TEMP || code == HttpURLConnection.HTTP_MOVED_PERM || code == 307 || code == 308) {
            String newLocation = conn.getHeaderField("Location");
            conn.disconnect();
            if (newLocation == null) {
                throw new CodeMindException("Empty redirect location from GitHub");
            }
            return openConnection(newLocation, redirectDepth + 1);
        }

        return conn;
    }

    /**
     * InputStream that bounds bytes read to prevent archive denial-of-service.
     */
    private static class BoundedInputStream extends InputStream {
        private final InputStream delegate;
        private final long maxBytes;
        private long bytesRead = 0;

        public BoundedInputStream(InputStream delegate, long maxBytes) {
            this.delegate = delegate;
            this.maxBytes = maxBytes;
        }

        @Override
        public int read() throws java.io.IOException {
            int b = delegate.read();
            if (b != -1) {
                bytesRead++;
                checkLimit();
            }
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws java.io.IOException {
            int count = delegate.read(b, off, len);
            if (count != -1) {
                bytesRead += count;
                checkLimit();
            }
            return count;
        }

        private void checkLimit() throws java.io.IOException {
            if (bytesRead > maxBytes) {
                throw new java.io.IOException("Stream exceeded maximum allowed archive size of " + maxBytes + " bytes");
            }
        }

        @Override
        public void close() throws java.io.IOException {
            delegate.close();
        }
    }
}
