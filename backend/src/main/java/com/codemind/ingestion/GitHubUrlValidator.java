package com.codemind.ingestion;

import com.codemind.common.exception.CodeMindException;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Validates GitHub repository URLs and protects against SSRF attacks.
 * Strictly accepts public repositories in the format https://github.com/{owner}/{repository}.
 */
@Component
public class GitHubUrlValidator {

    private static final Pattern GITHUB_URL_PATTERN =
            Pattern.compile("^https://github\\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)(?:/)?(?:\\.git)?$");

    public record ValidatedGitHubRepo(String owner, String repoName, String defaultBranch) {
        public String getFullName() {
            return owner + "/" + repoName;
        }
    }

    /**
     * Validates and parses a GitHub repository URL.
     * Rejects non-HTTPS schemes, IP addresses, localhost, internal network domains,
     * credentials in URI authority, and malformed repo names.
     */
    public ValidatedGitHubRepo validateAndParse(String url, String requestedBranch) {
        if (url == null || url.trim().isEmpty()) {
            throw new CodeMindException("GitHub repository URL cannot be empty");
        }

        String cleanedUrl = url.trim();

        // 1. URI Parsing
        URI uri;
        try {
            uri = new URI(cleanedUrl);
        } catch (URISyntaxException e) {
            throw new CodeMindException("Invalid GitHub URL format: " + e.getMessage());
        }

        // 2. Protocol Check (HTTPS only)
        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            throw new CodeMindException("Only HTTPS GitHub URLs are supported");
        }

        // 3. User Info Check (No embedded credentials like http://user:pass@github.com)
        if (uri.getUserInfo() != null) {
            throw new CodeMindException("Embedded credentials in GitHub URL are strictly forbidden");
        }

        // 4. Host Validation (SSRF defense: Strictly github.com or www.github.com)
        String host = uri.getHost();
        if (host == null || (!host.equalsIgnoreCase("github.com") && !host.equalsIgnoreCase("www.github.com"))) {
            throw new CodeMindException("Invalid host. Only github.com is supported for GitHub ingestion: " + host);
        }

        // 5. Port Validation (Only standard HTTPS port 443 or default -1)
        if (uri.getPort() != -1 && uri.getPort() != 443) {
            throw new CodeMindException("Custom ports are not allowed for GitHub repository ingestion");
        }

        // 6. Regex Path Match
        Matcher matcher = GITHUB_URL_PATTERN.matcher(cleanedUrl);
        if (!matcher.matches()) {
            throw new CodeMindException("Invalid GitHub repository URL pattern. Expected: https://github.com/{owner}/{repository}");
        }

        String owner = matcher.group(1);
        String repo = matcher.group(2);

        // Sanitize .git suffix if captured
        if (repo.endsWith(".git")) {
            repo = repo.substring(0, repo.length() - 4);
        }

        // Validate owner and repo names (prevent path traversal characters)
        if (owner.contains("..") || repo.contains("..") || owner.contains("/") || repo.contains("/")) {
            throw new CodeMindException("Invalid characters detected in repository coordinates");
        }

        String branch = (requestedBranch != null && !requestedBranch.trim().isEmpty())
                ? sanitizeBranch(requestedBranch.trim())
                : "main";

        return new ValidatedGitHubRepo(owner, repo, branch);
    }

    private String sanitizeBranch(String branch) {
        // Prevent path traversal in branch parameter
        if (branch.contains("..") || branch.startsWith("/") || branch.contains("\\")) {
            throw new CodeMindException("Invalid branch name format");
        }
        return branch;
    }
}
