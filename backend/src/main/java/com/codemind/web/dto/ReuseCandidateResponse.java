package com.codemind.web.dto;

import com.codemind.domain.model.ReuseCandidateEntity;
import com.codemind.reuse.ReuseService;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public class ReuseCandidateResponse {

    private UUID id;
    private UUID symbolId;
    private String filePath;
    private String symbolName;
    private String symbolKind;
    private String signature;
    private int startLine;
    private int endLine;
    private String candidateType;
    private double overallScore;
    private double functionalRelevance;
    private double structuralSimilarity;
    private double maintainabilityScore;
    private double complexityPenalty;
    private double securityScore;
    private double modificationEffort;
    private double dependencyImpact;
    private double duplicationRisk;
    private String securityGate;
    private String explanation;
    private List<ReuseEvidenceResponse> evidence;
    private List<String> positiveSignals;
    private List<String> negativeSignals;

    public ReuseCandidateResponse() {
    }

    public static ReuseCandidateResponse fromEntity(ReuseCandidateEntity entity, List<ReuseEvidenceResponse> evidence) {
        ReuseCandidateResponse res = new ReuseCandidateResponse();
        res.id = entity.getId();
        res.symbolId = entity.getSymbolId();
        res.filePath = entity.getFilePath();
        res.symbolName = entity.getSymbolName();
        res.symbolKind = entity.getSymbolKind();
        res.signature = entity.getSignature();
        res.startLine = entity.getStartLine();
        res.endLine = entity.getEndLine();
        res.candidateType = entity.getCandidateType() != null ? entity.getCandidateType().name() : null;
        res.overallScore = entity.getOverallScore();
        res.functionalRelevance = entity.getFunctionalRelevance();
        res.structuralSimilarity = entity.getStructuralSimilarity();
        res.maintainabilityScore = entity.getMaintainabilityScore();
        res.complexityPenalty = entity.getComplexityPenalty();
        res.securityScore = entity.getSecurityScore();
        res.modificationEffort = entity.getModificationEffort();
        res.dependencyImpact = entity.getDependencyImpact();
        res.duplicationRisk = entity.getDuplicationRisk();
        res.securityGate = entity.getSecurityGate() != null ? entity.getSecurityGate().name() : null;
        res.explanation = entity.getExplanation();
        res.evidence = evidence != null ? evidence : Collections.emptyList();
        res.positiveSignals = Collections.emptyList();
        res.negativeSignals = Collections.emptyList();
        return res;
    }

    public static ReuseCandidateResponse fromCandidateWithEvidence(ReuseService.CandidateWithEvidence cwe) {
        ReuseCandidateEntity entity = cwe.candidate();
        ReuseCandidateResponse res = fromEntity(
                entity,
                cwe.evidence().stream().map(ReuseEvidenceResponse::fromEntity).collect(Collectors.toList())
        );
        res.positiveSignals = cwe.positiveSignals() != null ? cwe.positiveSignals() : Collections.emptyList();
        res.negativeSignals = cwe.negativeSignals() != null ? cwe.negativeSignals() : Collections.emptyList();
        return res;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getSymbolId() {
        return symbolId;
    }

    public void setSymbolId(UUID symbolId) {
        this.symbolId = symbolId;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getSymbolName() {
        return symbolName;
    }

    public void setSymbolName(String symbolName) {
        this.symbolName = symbolName;
    }

    public String getSymbolKind() {
        return symbolKind;
    }

    public void setSymbolKind(String symbolKind) {
        this.symbolKind = symbolKind;
    }

    public String getSignature() {
        return signature;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public int getStartLine() {
        return startLine;
    }

    public void setStartLine(int startLine) {
        this.startLine = startLine;
    }

    public int getEndLine() {
        return endLine;
    }

    public void setEndLine(int endLine) {
        this.endLine = endLine;
    }

    public String getCandidateType() {
        return candidateType;
    }

    public void setCandidateType(String candidateType) {
        this.candidateType = candidateType;
    }

    public double getOverallScore() {
        return overallScore;
    }

    public void setOverallScore(double overallScore) {
        this.overallScore = overallScore;
    }

    public double getFunctionalRelevance() {
        return functionalRelevance;
    }

    public void setFunctionalRelevance(double functionalRelevance) {
        this.functionalRelevance = functionalRelevance;
    }

    public double getStructuralSimilarity() {
        return structuralSimilarity;
    }

    public void setStructuralSimilarity(double structuralSimilarity) {
        this.structuralSimilarity = structuralSimilarity;
    }

    public double getMaintainabilityScore() {
        return maintainabilityScore;
    }

    public void setMaintainabilityScore(double maintainabilityScore) {
        this.maintainabilityScore = maintainabilityScore;
    }

    public double getComplexityPenalty() {
        return complexityPenalty;
    }

    public void setComplexityPenalty(double complexityPenalty) {
        this.complexityPenalty = complexityPenalty;
    }

    public double getSecurityScore() {
        return securityScore;
    }

    public void setSecurityScore(double securityScore) {
        this.securityScore = securityScore;
    }

    public double getModificationEffort() {
        return modificationEffort;
    }

    public void setModificationEffort(double modificationEffort) {
        this.modificationEffort = modificationEffort;
    }

    public double getDependencyImpact() {
        return dependencyImpact;
    }

    public void setDependencyImpact(double dependencyImpact) {
        this.dependencyImpact = dependencyImpact;
    }

    public double getDuplicationRisk() {
        return duplicationRisk;
    }

    public void setDuplicationRisk(double duplicationRisk) {
        this.duplicationRisk = duplicationRisk;
    }

    public String getSecurityGate() {
        return securityGate;
    }

    public void setSecurityGate(String securityGate) {
        this.securityGate = securityGate;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public List<ReuseEvidenceResponse> getEvidence() {
        return evidence;
    }

    public void setEvidence(List<ReuseEvidenceResponse> evidence) {
        this.evidence = evidence;
    }

    public List<String> getPositiveSignals() {
        return positiveSignals;
    }

    public void setPositiveSignals(List<String> positiveSignals) {
        this.positiveSignals = positiveSignals;
    }

    public List<String> getNegativeSignals() {
        return negativeSignals;
    }

    public void setNegativeSignals(List<String> negativeSignals) {
        this.negativeSignals = negativeSignals;
    }
}
