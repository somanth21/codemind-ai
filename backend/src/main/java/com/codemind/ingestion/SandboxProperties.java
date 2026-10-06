package com.codemind.ingestion;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.nio.file.Paths;

@Component
@ConfigurationProperties(prefix = "codemind.sandbox")
public class SandboxProperties {

    private String root = "./codemind-sandbox";
    private long maxArchiveSizeBytes = 104857600L; // 100 MB
    private long maxExtractedSizeBytes = 524288000L; // 500 MB
    private int maxFileCount = 20000;
    private int maxDirectoryCount = 5000;
    private long maxSingleFileSizeBytes = 104857600L; // 100 MB
    private int maxPathLength = 500;
    private int maxFilenameLength = 255;
    private int maxTreeDepth = 20;
    private int maxTreeNodes = 10000;
    private long maxContentReadBytes = 1048576L; // 1 MB

    public String getRoot() {
        return root;
    }

    public void setRoot(String root) {
        this.root = root;
    }

    public Path getRootPath() {
        return Paths.get(root).toAbsolutePath().normalize();
    }

    public long getMaxArchiveSizeBytes() {
        return maxArchiveSizeBytes;
    }

    public void setMaxArchiveSizeBytes(long maxArchiveSizeBytes) {
        this.maxArchiveSizeBytes = maxArchiveSizeBytes;
    }

    public long getMaxExtractedSizeBytes() {
        return maxExtractedSizeBytes;
    }

    public void setMaxExtractedSizeBytes(long maxExtractedSizeBytes) {
        this.maxExtractedSizeBytes = maxExtractedSizeBytes;
    }

    public int getMaxFileCount() {
        return maxFileCount;
    }

    public void setMaxFileCount(int maxFileCount) {
        this.maxFileCount = maxFileCount;
    }

    public int getMaxDirectoryCount() {
        return maxDirectoryCount;
    }

    public void setMaxDirectoryCount(int maxDirectoryCount) {
        this.maxDirectoryCount = maxDirectoryCount;
    }

    public long getMaxSingleFileSizeBytes() {
        return maxSingleFileSizeBytes;
    }

    public void setMaxSingleFileSizeBytes(long maxSingleFileSizeBytes) {
        this.maxSingleFileSizeBytes = maxSingleFileSizeBytes;
    }

    public int getMaxPathLength() {
        return maxPathLength;
    }

    public void setMaxPathLength(int maxPathLength) {
        this.maxPathLength = maxPathLength;
    }

    public int getMaxFilenameLength() {
        return maxFilenameLength;
    }

    public void setMaxFilenameLength(int maxFilenameLength) {
        this.maxFilenameLength = maxFilenameLength;
    }

    public int getMaxTreeDepth() {
        return maxTreeDepth;
    }

    public void setMaxTreeDepth(int maxTreeDepth) {
        this.maxTreeDepth = maxTreeDepth;
    }

    public int getMaxTreeNodes() {
        return maxTreeNodes;
    }

    public void setMaxTreeNodes(int maxTreeNodes) {
        this.maxTreeNodes = maxTreeNodes;
    }

    public long getMaxContentReadBytes() {
        return maxContentReadBytes;
    }

    public void setMaxContentReadBytes(long maxContentReadBytes) {
        this.maxContentReadBytes = maxContentReadBytes;
    }
}
