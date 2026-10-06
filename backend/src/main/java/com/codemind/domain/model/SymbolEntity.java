package com.codemind.domain.model;

import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "symbols")
public class SymbolEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "repository_id", nullable = false)
    private UUID repositoryId;

    @Column(name = "analysis_id", nullable = false)
    private UUID analysisId;

    @Column(name = "file_path", nullable = false, length = 1000)
    private String filePath;

    @Column(length = 1000)
    private String fqn;

    @Column(nullable = false, length = 255)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SymbolKind kind;

    @Column(name = "parent_symbol_id")
    private UUID parentSymbolId;

    @Column(name = "start_line")
    private Integer startLine;

    @Column(name = "end_line")
    private Integer endLine;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private SymbolVisibility visibility;

    @Column(name = "is_static")
    private boolean isStatic = false;

    @Column(name = "is_final")
    private boolean isFinal = false;

    @Column(name = "is_abstract")
    private boolean isAbstract = false;

    @Column(length = 1000)
    private String signature;

    @Column(name = "return_type", length = 255)
    private String returnType;

    @Column(name = "parameter_count")
    private int parameterCount = 0;

    public SymbolEntity() {
    }

    public SymbolEntity(
            UUID id,
            UUID repositoryId,
            UUID analysisId,
            String filePath,
            String fqn,
            String name,
            SymbolKind kind,
            UUID parentSymbolId,
            Integer startLine,
            Integer endLine,
            SymbolVisibility visibility,
            boolean isStatic,
            boolean isFinal,
            boolean isAbstract,
            String signature,
            String returnType,
            int parameterCount
    ) {
        this.id = id != null ? id : UUID.randomUUID();
        this.repositoryId = repositoryId;
        this.analysisId = analysisId;
        this.filePath = filePath;
        this.fqn = fqn;
        this.name = name;
        this.kind = kind;
        this.parentSymbolId = parentSymbolId;
        this.startLine = startLine;
        this.endLine = endLine;
        this.visibility = visibility;
        this.isStatic = isStatic;
        this.isFinal = isFinal;
        this.isAbstract = isAbstract;
        this.signature = signature;
        this.returnType = returnType;
        this.parameterCount = parameterCount;
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getRepositoryId() {
        return repositoryId;
    }

    public void setRepositoryId(UUID repositoryId) {
        this.repositoryId = repositoryId;
    }

    public UUID getAnalysisId() {
        return analysisId;
    }

    public void setAnalysisId(UUID analysisId) {
        this.analysisId = analysisId;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getFqn() {
        return fqn;
    }

    public void setFqn(String fqn) {
        this.fqn = fqn;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public SymbolKind getKind() {
        return kind;
    }

    public void setKind(SymbolKind kind) {
        this.kind = kind;
    }

    public UUID getParentSymbolId() {
        return parentSymbolId;
    }

    public void setParentSymbolId(UUID parentSymbolId) {
        this.parentSymbolId = parentSymbolId;
    }

    public Integer getStartLine() {
        return startLine;
    }

    public void setStartLine(Integer startLine) {
        this.startLine = startLine;
    }

    public Integer getEndLine() {
        return endLine;
    }

    public void setEndLine(Integer endLine) {
        this.endLine = endLine;
    }

    public SymbolVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(SymbolVisibility visibility) {
        this.visibility = visibility;
    }

    public boolean isStatic() {
        return isStatic;
    }

    public void setStatic(boolean aStatic) {
        isStatic = aStatic;
    }

    public boolean isFinal() {
        return isFinal;
    }

    public void setFinal(boolean aFinal) {
        isFinal = aFinal;
    }

    public boolean isAbstract() {
        return isAbstract;
    }

    public void setAbstract(boolean anAbstract) {
        isAbstract = anAbstract;
    }

    public String getSignature() {
        return signature;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public String getReturnType() {
        return returnType;
    }

    public void setReturnType(String returnType) {
        this.returnType = returnType;
    }

    public int getParameterCount() {
        return parameterCount;
    }

    public void setParameterCount(int parameterCount) {
        this.parameterCount = parameterCount;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SymbolEntity that = (SymbolEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
