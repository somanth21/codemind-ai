package com.codemind.web.controller;

import com.codemind.common.exception.CodeMindException;
import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.domain.model.RepositoryEntity;
import com.codemind.domain.model.RepositoryFileEntity;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.UserRepository;
import com.codemind.ingestion.RepositoryIngestionService;
import com.codemind.ingestion.dto.RepositoryTreeNodeDto;
import com.codemind.security.model.UserPrincipal;
import com.codemind.web.dto.FileContentResponse;
import com.codemind.web.dto.RepositoryDetailResponse;
import com.codemind.web.dto.RepositoryFileResponse;
import com.codemind.web.dto.RepositorySummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/repositories")
public class RepositoryController {

    private final RepositoryIngestionService ingestionService;
    private final UserRepository userRepository;

    public RepositoryController(RepositoryIngestionService ingestionService, UserRepository userRepository) {
        this.ingestionService = ingestionService;
        this.userRepository = userRepository;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<RepositoryDetailResponse> uploadRepository(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "name", required = false) String name,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (file == null || file.isEmpty()) {
            throw new CodeMindException("Uploaded file cannot be empty");
        }

        String repoName = (name != null && !name.trim().isEmpty())
                ? name.trim()
                : cleanFileName(file.getOriginalFilename());

        UserEntity user = getAuthenticatedUser(principal);

        try {
            RepositoryEntity entity = ingestionService.registerAndIngest(
                    repoName,
                    file.getInputStream(),
                    file.getSize(),
                    user
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(RepositoryDetailResponse.fromEntity(entity));
        } catch (IOException e) {
            throw new CodeMindException("Failed to read uploaded archive stream: " + e.getMessage(), e);
        }
    }

    @PostMapping(value = "/github", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<RepositoryDetailResponse> connectGitHub(
            @jakarta.validation.Valid @RequestBody com.codemind.web.dto.ConnectGitHubRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity user = getAuthenticatedUser(principal);
        RepositoryEntity entity = ingestionService.ingestFromGitHub(request.url(), request.branch(), user);
        return ResponseEntity.status(HttpStatus.CREATED).body(RepositoryDetailResponse.fromEntity(entity));
    }

    @GetMapping
    public ResponseEntity<List<RepositorySummaryResponse>> listRepositories(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity user = getAuthenticatedUser(principal);
        List<RepositoryEntity> list = ingestionService.listRepositories(user);
        List<RepositorySummaryResponse> response = list.stream()
                .map(RepositorySummaryResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RepositoryDetailResponse> getRepository(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity user = getAuthenticatedUser(principal);
        RepositoryEntity repo = ingestionService.getRepository(id, user);
        return ResponseEntity.ok(RepositoryDetailResponse.fromEntity(repo));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRepository(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity user = getAuthenticatedUser(principal);
        ingestionService.deleteRepository(id, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/tree")
    public ResponseEntity<RepositoryTreeNodeDto> getRepositoryTree(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity user = getAuthenticatedUser(principal);
        RepositoryTreeNodeDto tree = ingestionService.getRepositoryTree(id, user);
        return ResponseEntity.ok(tree);
    }

    @GetMapping("/{id}/files")
    public ResponseEntity<Page<RepositoryFileResponse>> getRepositoryFiles(
            @PathVariable UUID id,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String extension,
            @RequestParam(required = false) Boolean binary,
            @RequestParam(required = false) String pathPrefix,
            @PageableDefault(size = 50, sort = "relativePath", direction = Sort.Direction.ASC) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity user = getAuthenticatedUser(principal);
        Page<RepositoryFileEntity> files = ingestionService.getRepositoryFiles(
                id, language, extension, binary, pathPrefix, pageable, user
        );
        return ResponseEntity.ok(files.map(RepositoryFileResponse::fromEntity));
    }

    @GetMapping("/{id}/files/content")
    public ResponseEntity<FileContentResponse> getFileContent(
            @PathVariable UUID id,
            @RequestParam("path") String path,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity user = getAuthenticatedUser(principal);
        String content = ingestionService.getFileContent(id, path, user);
        return ResponseEntity.ok(new FileContentResponse(path, content, (long) content.length()));
    }

    private UserEntity getAuthenticatedUser(UserPrincipal principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));
    }

    private String cleanFileName(String originalFilename) {
        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            return "unnamed-repository";
        }
        String cleaned = originalFilename.replaceAll("(?i)\\.zip$", "").trim();
        return cleaned.isEmpty() ? "unnamed-repository" : cleaned;
    }
}
