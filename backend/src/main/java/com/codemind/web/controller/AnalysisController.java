package com.codemind.web.controller;

import com.codemind.analyzer.AnalysisPipelineService;
import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.domain.model.*;
import com.codemind.domain.repository.UserRepository;
import com.codemind.security.model.UserPrincipal;
import com.codemind.web.dto.*;
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
@RequestMapping("/api/v1/repositories/{repositoryId}")
public class AnalysisController {

    private final AnalysisPipelineService analysisPipelineService;
    private final UserRepository userRepository;

    public AnalysisController(AnalysisPipelineService analysisPipelineService, UserRepository userRepository) {
        this.analysisPipelineService = analysisPipelineService;
        this.userRepository = userRepository;
    }

    @PostMapping("/analyze")
    public ResponseEntity<AnalysisRunResponse> triggerAnalysis(
            @PathVariable UUID repositoryId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        AnalysisRunEntity run = analysisPipelineService.triggerAnalysis(repositoryId, requester);
        return ResponseEntity.status(HttpStatus.CREATED).body(AnalysisRunResponse.fromEntity(run));
    }

    @GetMapping("/analyses")
    public ResponseEntity<Page<AnalysisRunResponse>> getAnalysisRuns(
            @PathVariable UUID repositoryId,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 20, sort = "startedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        Page<AnalysisRunEntity> runs = analysisPipelineService.getAnalysisRuns(repositoryId, requester, pageable);
        return ResponseEntity.ok(runs.map(AnalysisRunResponse::fromEntity));
    }

    @GetMapping("/analyses/{analysisId}")
    public ResponseEntity<AnalysisRunResponse> getAnalysisRun(
            @PathVariable UUID repositoryId,
            @PathVariable UUID analysisId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        AnalysisRunEntity run = analysisPipelineService.getAnalysisRun(repositoryId, analysisId, requester);
        return ResponseEntity.ok(AnalysisRunResponse.fromEntity(run));
    }

    @GetMapping("/analyses/{analysisId}/symbols")
    public ResponseEntity<Page<SymbolResponse>> getSymbols(
            @PathVariable UUID repositoryId,
            @PathVariable UUID analysisId,
            @RequestParam(value = "kind", required = false) SymbolKind kind,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 50, sort = "filePath", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        Page<SymbolEntity> symbols = analysisPipelineService.getSymbols(repositoryId, analysisId, kind, requester, pageable);
        return ResponseEntity.ok(symbols.map(SymbolResponse::fromEntity));
    }

    @GetMapping("/analyses/{analysisId}/relationships")
    public ResponseEntity<Page<RelationshipResponse>> getRelationships(
            @PathVariable UUID repositoryId,
            @PathVariable UUID analysisId,
            @RequestParam(value = "type", required = false) RelationshipType type,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 50, sort = "lineNumber", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        Page<RelationshipEntity> relationships = analysisPipelineService.getRelationships(repositoryId, analysisId, type, requester, pageable);
        return ResponseEntity.ok(relationships.map(RelationshipResponse::fromEntity));
    }

    @GetMapping("/analyses/{analysisId}/metrics")
    public ResponseEntity<Page<FileMetricsResponse>> getFileMetrics(
            @PathVariable UUID repositoryId,
            @PathVariable UUID analysisId,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 50, sort = "filePath", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        Page<FileMetricsEntity> metrics = analysisPipelineService.getFileMetrics(repositoryId, analysisId, requester, pageable);
        return ResponseEntity.ok(metrics.map(FileMetricsResponse::fromEntity));
    }

    @GetMapping("/analyses/{analysisId}/findings")
    public ResponseEntity<Page<QualityFindingResponse>> getQualityFindings(
            @PathVariable UUID repositoryId,
            @PathVariable UUID analysisId,
            @RequestParam(value = "severity", required = false) Severity severity,
            @RequestParam(value = "ruleId", required = false) String ruleId,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 50, sort = "lineNumber", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        Page<QualityFindingEntity> findings = analysisPipelineService.getQualityFindings(repositoryId, analysisId, severity, ruleId, requester, pageable);
        return ResponseEntity.ok(findings.map(QualityFindingResponse::fromEntity));
    }

    @GetMapping("/analyses/{analysisId}/secrets")
    public ResponseEntity<Page<SecretFindingResponse>> getSecretFindings(
            @PathVariable UUID repositoryId,
            @PathVariable UUID analysisId,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 50, sort = "lineNumber", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        Page<SecretFindingEntity> secrets = analysisPipelineService.getSecretFindings(repositoryId, analysisId, requester, pageable);
        return ResponseEntity.ok(secrets.map(SecretFindingResponse::fromEntity));
    }

    private UserEntity getAuthenticatedUser(UserPrincipal principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));
    }
}
