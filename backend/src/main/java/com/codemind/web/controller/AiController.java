package com.codemind.web.controller;

import com.codemind.ai.service.AiReasoningService;
import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.UserRepository;
import com.codemind.security.model.UserPrincipal;
import com.codemind.web.dto.AiReasoningDto;
import com.codemind.web.dto.ExplainEvidenceRequest;
import com.codemind.web.dto.ExplainReuseRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST Controller for Grounded AI Reasoning Layer.
 * Exposes endpoints for explaining deterministic code reuse and repository evidence with source citations.
 */
@RestController
@RequestMapping("/api/v1/repositories/{repositoryId}/ai")
public class AiController {

    private final AiReasoningService aiReasoningService;
    private final UserRepository userRepository;

    public AiController(AiReasoningService aiReasoningService, UserRepository userRepository) {
        this.aiReasoningService = aiReasoningService;
        this.userRepository = userRepository;
    }

    @PostMapping("/explain-reuse")
    public ResponseEntity<AiReasoningDto> explainReuse(
            @PathVariable UUID repositoryId,
            @RequestBody(required = false) ExplainReuseRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        AiReasoningDto response = aiReasoningService.explainReuse(repositoryId, request, requester);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/explain-evidence")
    public ResponseEntity<AiReasoningDto> explainEvidence(
            @PathVariable UUID repositoryId,
            @Valid @RequestBody ExplainEvidenceRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        AiReasoningDto response = aiReasoningService.explainEvidence(repositoryId, request, requester);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    public ResponseEntity<Page<AiReasoningDto>> getHistory(
            @PathVariable UUID repositoryId,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        Page<AiReasoningDto> history = aiReasoningService.getHistory(repositoryId, requester, pageable);
        return ResponseEntity.ok(history);
    }

    @GetMapping("/requests/{requestId}")
    public ResponseEntity<AiReasoningDto> getRequestById(
            @PathVariable UUID repositoryId,
            @PathVariable UUID requestId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        UserEntity requester = getAuthenticatedUser(principal);
        AiReasoningDto response = aiReasoningService.getRequestById(repositoryId, requestId, requester);
        return ResponseEntity.ok(response);
    }

    private UserEntity getAuthenticatedUser(UserPrincipal principal) {
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));
    }
}
