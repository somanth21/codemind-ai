package com.codemind.ingestion.dto;

import java.util.ArrayList;
import java.util.List;

public class RepositoryTreeNodeDto {
    private String name;
    private String path;
    private String type; // "DIRECTORY" or "FILE"
    private Long sizeBytes;
    private String language;
    private Boolean binary;
    private List<RepositoryTreeNodeDto> children = new ArrayList<>();

    public RepositoryTreeNodeDto() {}

    public RepositoryTreeNodeDto(String name, String path, String type, Long sizeBytes, String language, Boolean binary) {
        this.name = name;
        this.path = path;
        this.type = type;
        this.sizeBytes = sizeBytes;
        this.language = language;
        this.binary = binary;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(Long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public Boolean getBinary() {
        return binary;
    }

    public void setBinary(Boolean binary) {
        this.binary = binary;
    }

    public List<RepositoryTreeNodeDto> getChildren() {
        return children;
    }

    public void setChildren(List<RepositoryTreeNodeDto> children) {
        this.children = children;
    }
}
