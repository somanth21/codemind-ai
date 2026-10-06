package com.codemind.web.controller;

import com.codemind.architecture.model.ArchitectureGraph;
import com.codemind.architecture.service.ArchitectureService;
import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.domain.model.ArchitectureAnalysisEntity;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.UserRepository;
import com.codemind.security.model.UserPrincipal;
import com.codemind.web.dto.ArchitectureAnalysisRequest;
import com.codemind.web.dto.ArchitectureAnalysisResponse;
import com.codemind.web.dto.ArchitectureGraphResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/repositories/{repositoryId}/architecture")
public class ArchitectureController {

    private final ArchitectureService architectureService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ArchitectureController(
            ArchitectureService architectureService,
            UserRepository userRepository,
            ObjectMapper objectMapper
    ) {
        this.architectureService = architectureService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/analyze")
    public ResponseEntity<ArchitectureAnalysisResponse> analyzeArchitecture(
            @PathVariable UUID repositoryId,
            @RequestBody(required = false) ArchitectureAnalysisRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        UUID analysisId = request != null ? request.analysisId() : null;
        ArchitectureAnalysisEntity entity = architectureService.analyzeArchitecture(repositoryId, analysisId, requester);
        return ResponseEntity.status(HttpStatus.CREATED).body(ArchitectureAnalysisResponse.fromEntity(entity, objectMapper));
    }

    @GetMapping
    public ResponseEntity<Page<ArchitectureAnalysisResponse>> listArchitectureAnalyses(
            @PathVariable UUID repositoryId,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        Page<ArchitectureAnalysisEntity> page = architectureService.getArchitectureAnalyses(repositoryId, requester, pageable);
        return ResponseEntity.ok(page.map(e -> ArchitectureAnalysisResponse.fromEntity(e, objectMapper)));
    }

    @GetMapping("/{analysisId}")
    public ResponseEntity<ArchitectureAnalysisResponse> getArchitectureAnalysis(
            @PathVariable UUID repositoryId,
            @PathVariable UUID analysisId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        ArchitectureAnalysisEntity entity = architectureService.getArchitectureAnalysis(repositoryId, analysisId, requester);
        return ResponseEntity.ok(ArchitectureAnalysisResponse.fromEntity(entity, objectMapper));
    }

    @GetMapping("/{analysisId}/graph")
    public ResponseEntity<ArchitectureGraphResponse> getArchitectureGraph(
            @PathVariable UUID repositoryId,
            @PathVariable UUID analysisId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        ArchitectureGraph graph = architectureService.getArchitectureGraph(repositoryId, analysisId, requester);
        return ResponseEntity.ok(ArchitectureGraphResponse.fromGraph(graph));
    }

    private UserEntity getAuthenticatedUser(UserPrincipal principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));
    }
}
