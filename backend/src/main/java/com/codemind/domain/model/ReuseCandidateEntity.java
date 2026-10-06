package com.codemind.domain.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "reuse_candidates")
public class ReuseCandidateEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "reuse_analysis_id", nullable = false)
    private UUID reuseAnalysisId;

    @Column(name = "symbol_id")
    private UUID symbolId;

    @Column(name = "file_path", nullable = false, length = 1000)
    private String filePath;

    @Column(name = "symbol_name", nullable = false, length = 255)
    private String symbolName;

    @Column(name = "symbol_kind", nullable = false, length = 50)
    private String symbolKind;

    @Column(length = 1000)
    private String signature;

    @Column(name = "start_line", nullable = false)
    private int startLine;

    @Column(name = "end_line", nullable = false)
    private int endLine;

    @Enumerated(EnumType.STRING)
    @Column(name = "candidate_type", nullable = false, length = 50)
    private CandidateType candidateType = CandidateType.ADAPT;

    @Column(name = "overall_score", nullable = false)
    private double overallScore = 0.0;

    @Column(name = "functional_relevance", nullable = false)
    private double functionalRelevance = 0.0;

    @Column(name = "structural_similarity", nullable = false)
    private double structuralSimilarity = 0.0;

    @Column(name = "maintainability_score", nullable = false)
    private double maintainabilityScore = 0.0;

    @Column(name = "complexity_penalty", nullable = false)
    private double complexityPenalty = 0.0;

    @Column(name = "security_score", nullable = false)
    private double securityScore = 0.0;

    @Column(name = "modification_effort", nullable = false)
    private double modificationEffort = 0.0;

    @Column(name = "dependency_impact", nullable = false)
    private double dependencyImpact = 0.0;

    @Column(name = "duplication_risk", nullable = false)
    private double duplicationRisk = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "security_gate", nullable = false, length = 50)
    private SecurityGateStatus securityGate = SecurityGateStatus.SAFE;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ReuseCandidateEntity() {
    }

    public ReuseCandidateEntity(
            UUID id,
            UUID reuseAnalysisId,
            UUID symbolId,
            String filePath,
            String symbolName,
            String symbolKind,
            String signature,
            int startLine,
            int endLine,
            CandidateType candidateType,
            double overallScore,
            double functionalRelevance,
            double structuralSimilarity,
            double maintainabilityScore,
            double complexityPenalty,
            double securityScore,
            double modificationEffort,
            double dependencyImpact,
            double duplicationRisk,
            SecurityGateStatus securityGate,
            String explanation
    ) {
        this.id = id != null ? id : UUID.randomUUID();
        this.reuseAnalysisId = reuseAnalysisId;
        this.symbolId = symbolId;
        this.filePath = filePath;
        this.symbolName = symbolName;
        this.symbolKind = symbolKind;
        this.signature = signature;
        this.startLine = startLine;
        this.endLine = endLine;
        this.candidateType = candidateType != null ? candidateType : CandidateType.ADAPT;
        this.overallScore = overallScore;
        this.functionalRelevance = functionalRelevance;
        this.structuralSimilarity = structuralSimilarity;
        this.maintainabilityScore = maintainabilityScore;
        this.complexityPenalty = complexityPenalty;
        this.securityScore = securityScore;
        this.modificationEffort = modificationEffort;
        this.dependencyImpact = dependencyImpact;
        this.duplicationRisk = duplicationRisk;
        this.securityGate = securityGate != null ? securityGate : SecurityGateStatus.SAFE;
        this.explanation = explanation;
        this.createdAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getReuseAnalysisId() {
        return reuseAnalysisId;
    }

    public void setReuseAnalysisId(UUID reuseAnalysisId) {
        this.reuseAnalysisId = reuseAnalysisId;
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

    public CandidateType getCandidateType() {
        return candidateType;
    }

    public void setCandidateType(CandidateType candidateType) {
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

    public SecurityGateStatus getSecurityGate() {
        return securityGate;
    }

    public void setSecurityGate(SecurityGateStatus securityGate) {
        this.securityGate = securityGate;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ReuseCandidateEntity that = (ReuseCandidateEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
