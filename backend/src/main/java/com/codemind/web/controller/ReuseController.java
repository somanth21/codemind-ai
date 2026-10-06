package com.codemind.web.controller;

import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.domain.model.ReuseAnalysisEntity;
import com.codemind.domain.model.ReuseCandidateEntity;
import com.codemind.domain.model.ReuseEvidenceEntity;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.UserRepository;
import com.codemind.reuse.ReuseService;
import com.codemind.security.model.UserPrincipal;
import com.codemind.web.dto.ReuseAnalysisRequest;
import com.codemind.web.dto.ReuseAnalysisResponse;
import com.codemind.web.dto.ReuseCandidateResponse;
import com.codemind.web.dto.ReuseEvidenceResponse;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/repositories/{repositoryId}/reuse")
public class ReuseController {

    private final ReuseService reuseService;
    private final UserRepository userRepository;

    public ReuseController(ReuseService reuseService, UserRepository userRepository) {
        this.reuseService = reuseService;
        this.userRepository = userRepository;
    }

    @PostMapping("/analyze")
    public ResponseEntity<ReuseAnalysisResponse> analyzeReuse(
            @PathVariable UUID repositoryId,
            @Valid @RequestBody ReuseAnalysisRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        ReuseService.ReuseAnalysisResult result = reuseService.analyzeReuse(
                repositoryId,
                request.getQuery(),
                requester,
                request.getLimit() != null ? request.getLimit() : 10
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ReuseAnalysisResponse.fromResult(result));
    }

    @GetMapping
    public ResponseEntity<Page<ReuseAnalysisResponse>> listReuseAnalyses(
            @PathVariable UUID repositoryId,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        Page<ReuseAnalysisEntity> analyses = reuseService.getRepositoryReuseAnalyses(repositoryId, requester, pageable);
        return ResponseEntity.ok(analyses.map(a -> ReuseAnalysisResponse.fromEntity(a, null)));
    }

    @GetMapping("/{analysisId}")
    public ResponseEntity<ReuseAnalysisResponse> getReuseAnalysis(
            @PathVariable UUID repositoryId,
            @PathVariable UUID analysisId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        ReuseAnalysisEntity analysis = reuseService.getReuseAnalysis(repositoryId, analysisId, requester);
        List<ReuseCandidateEntity> candidateEntities = reuseService.getCandidates(analysis.getId());

        List<ReuseCandidateResponse> candidateResponses = new ArrayList<>();
        for (ReuseCandidateEntity ce : candidateEntities) {
            List<ReuseEvidenceEntity> evidenceEntities = reuseService.getEvidence(ce.getId());
            List<ReuseEvidenceResponse> evidenceResponses = evidenceEntities.stream()
                    .map(ReuseEvidenceResponse::fromEntity)
                    .collect(Collectors.toList());
            candidateResponses.add(ReuseCandidateResponse.fromEntity(ce, evidenceResponses));
        }

        return ResponseEntity.ok(ReuseAnalysisResponse.fromEntity(analysis, candidateResponses));
    }

    @GetMapping("/{analysisId}/candidates")
    public ResponseEntity<List<ReuseCandidateResponse>> getCandidates(
            @PathVariable UUID repositoryId,
            @PathVariable UUID analysisId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        ReuseAnalysisEntity analysis = reuseService.getReuseAnalysis(repositoryId, analysisId, requester);
        List<ReuseCandidateEntity> candidateEntities = reuseService.getCandidates(analysis.getId());

        List<ReuseCandidateResponse> candidateResponses = new ArrayList<>();
        for (ReuseCandidateEntity ce : candidateEntities) {
            List<ReuseEvidenceEntity> evidenceEntities = reuseService.getEvidence(ce.getId());
            List<ReuseEvidenceResponse> evidenceResponses = evidenceEntities.stream()
                    .map(ReuseEvidenceResponse::fromEntity)
                    .collect(Collectors.toList());
            candidateResponses.add(ReuseCandidateResponse.fromEntity(ce, evidenceResponses));
        }

        return ResponseEntity.ok(candidateResponses);
    }

    private UserEntity getAuthenticatedUser(UserPrincipal principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));
    }
}
