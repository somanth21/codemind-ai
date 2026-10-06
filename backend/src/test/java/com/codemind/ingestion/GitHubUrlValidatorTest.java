package com.codemind.ingestion;

import com.codemind.common.exception.CodeMindException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class GitHubUrlValidatorTest {

    private GitHubUrlValidator validator;

    @BeforeEach
    void setUp() {
        validator = new GitHubUrlValidator();
    }

    @Test
    @DisplayName("Valid public GitHub repository URL should parse successfully")
    void validGitHubUrls() {
        GitHubUrlValidator.ValidatedGitHubRepo repo1 = validator.validateAndParse("https://github.com/octocat/Hello-World", null);
        assertEquals("octocat", repo1.owner());
        assertEquals("Hello-World", repo1.repoName());
        assertEquals("main", repo1.defaultBranch());
        assertEquals("octocat/Hello-World", repo1.getFullName());

        GitHubUrlValidator.ValidatedGitHubRepo repo2 = validator.validateAndParse("https://github.com/spring-projects/spring-boot.git", "main");
        assertEquals("spring-projects", repo2.owner());
        assertEquals("spring-boot", repo2.repoName());
        assertEquals("main", repo2.defaultBranch());

        GitHubUrlValidator.ValidatedGitHubRepo repo3 = validator.validateAndParse("https://github.com/facebook/react/", "dev");
        assertEquals("facebook", repo3.owner());
        assertEquals("react", repo3.repoName());
        assertEquals("dev", repo3.defaultBranch());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "http://github.com/octocat/Hello-World",       // Disallow unencrypted HTTP
            "file:///etc/passwd",                          // Disallow file://
            "ftp://github.com/octocat/Hello-World",         // Disallow ftp://
            "https://localhost/octocat/Hello-World",        // Disallow localhost
            "https://127.0.0.1/octocat/Hello-World",        // Disallow 127.0.0.1
            "https://169.254.169.254/octocat/Hello-World",  // Disallow AWS metadata IP
            "https://192.168.1.1/octocat/Hello-World",      // Disallow RFC1918 private IP
            "https://evil-github.com/octocat/Hello-World",  // Disallow non-github domain
            "https://gitlab.com/octocat/Hello-World",       // Disallow gitlab.com
            "https://github.com:8443/octocat/Hello-World",  // Disallow custom ports
            "https://user:pass@github.com/octocat/repo",   // Disallow embedded credentials
            "https://github.com/../evil/repo",              // Disallow path traversal
            "https://github.com/octocat/repo/extra/path",   // Disallow arbitrary subpaths
            "",                                             // Empty
            "not-a-url"                                     // Invalid format
    })
    @DisplayName("SSRF and malicious/invalid URLs should be rejected with CodeMindException")
    void rejectInvalidAndSsrfUrls(String invalidUrl) {
        assertThrows(CodeMindException.class, () -> validator.validateAndParse(invalidUrl, null));
    }

    @Test
    @DisplayName("Branch names with path traversal or illegal characters should be rejected")
    void rejectMaliciousBranchNames() {
        assertThrows(CodeMindException.class, () ->
                validator.validateAndParse("https://github.com/octocat/Hello-World", "../../../etc/passwd")
        );
        assertThrows(CodeMindException.class, () ->
                validator.validateAndParse("https://github.com/octocat/Hello-World", "/root/branch")
        );
    }
}
