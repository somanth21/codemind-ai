package com.codemind.web.controller;

import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.domain.model.SecurityAnalysisEntity;
import com.codemind.domain.model.SecurityCategory;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.UserRepository;
import com.codemind.security.analysis.SecurityAnalysisService;
import com.codemind.security.model.UserPrincipal;
import com.codemind.web.dto.SecurityAnalysisRequest;
import com.codemind.web.dto.SecurityAnalysisResponse;
import com.codemind.web.dto.SecurityFindingResponse;
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
@RequestMapping("/api/v1/repositories/{repositoryId}/security")
public class SecurityAnalysisController {

    private final SecurityAnalysisService securityAnalysisService;
    private final UserRepository userRepository;

    public SecurityAnalysisController(SecurityAnalysisService securityAnalysisService, UserRepository userRepository) {
        this.securityAnalysisService = securityAnalysisService;
        this.userRepository = userRepository;
    }

    @PostMapping("/analyze")
    public ResponseEntity<SecurityAnalysisResponse> analyzeSecurity(
            @PathVariable UUID repositoryId,
            @RequestBody(required = false) SecurityAnalysisRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        UUID analysisId = request != null ? request.analysisId() : null;
        SecurityAnalysisEntity analysis = securityAnalysisService.analyzeSecurity(repositoryId, analysisId, requester);
        return ResponseEntity.status(HttpStatus.CREATED).body(SecurityAnalysisResponse.fromEntity(analysis));
    }

    @GetMapping
    public ResponseEntity<Page<SecurityAnalysisResponse>> listSecurityAnalyses(
            @PathVariable UUID repositoryId,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        Page<SecurityAnalysisEntity> page = securityAnalysisService.getSecurityAnalyses(repositoryId, requester, pageable);
        return ResponseEntity.ok(page.map(SecurityAnalysisResponse::fromEntity));
    }

    @GetMapping("/latest")
    public ResponseEntity<SecurityAnalysisResponse> getLatestSecurityAnalysis(
            @PathVariable UUID repositoryId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        return securityAnalysisService.getLatestSecurityAnalysis(repositoryId, requester)
                .map(SecurityAnalysisResponse::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/{analysisId}")
    public ResponseEntity<SecurityAnalysisResponse> getSecurityAnalysis(
            @PathVariable UUID repositoryId,
            @PathVariable UUID analysisId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        SecurityAnalysisEntity entity = securityAnalysisService.getSecurityAnalysis(repositoryId, analysisId, requester);
        return ResponseEntity.ok(SecurityAnalysisResponse.fromEntity(entity));
    }

    @GetMapping("/{analysisId}/findings")
    public ResponseEntity<Page<SecurityFindingResponse>> getFindings(
            @PathVariable UUID repositoryId,
            @PathVariable UUID analysisId,
            @RequestParam(required = false) Severity severity,
            @RequestParam(required = false) SecurityCategory category,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        Page<SecurityFindingEntity> findings = securityAnalysisService.getFindings(
                repositoryId, analysisId, severity, category, requester, pageable
        );
        return ResponseEntity.ok(findings.map(SecurityFindingResponse::fromEntity));
    }

    private UserEntity getAuthenticatedUser(UserPrincipal principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));
    }
}
