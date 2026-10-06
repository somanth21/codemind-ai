package com.codemind.ingestion;

import com.codemind.common.exception.CodeMindException;
import com.codemind.domain.model.RepositoryFileEntity;
import com.codemind.domain.repository.RepositoryFileRepository;
import com.codemind.ingestion.dto.RepositoryTreeNodeDto;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RepositoryTreeService {

    private final RepositoryFileRepository repositoryFileRepository;
    private final SandboxProperties properties;

    public RepositoryTreeService(RepositoryFileRepository repositoryFileRepository, SandboxProperties properties) {
        this.repositoryFileRepository = repositoryFileRepository;
        this.properties = properties;
    }

    public RepositoryTreeNodeDto buildTree(UUID repositoryId) {
        List<RepositoryFileEntity> files = repositoryFileRepository.findByRepositoryIdOrderByRelativePathAsc(repositoryId);

        if (files.size() > properties.getMaxTreeNodes()) {
            throw new CodeMindException("Repository contains " + files.size() + " files which exceeds tree display node limit of " + properties.getMaxTreeNodes());
        }

        RepositoryTreeNodeDto root = new RepositoryTreeNodeDto("root", "", "DIRECTORY", null, null, null);
        Map<String, RepositoryTreeNodeDto> dirMap = new HashMap<>();
        dirMap.put("", root);

        for (RepositoryFileEntity file : files) {
            String relPath = file.getRelativePath();
            String[] segments = relPath.split("/");

            if (segments.length > properties.getMaxTreeDepth()) {
                throw new CodeMindException("Repository depth (" + segments.length + ") exceeds maximum display tree depth of " + properties.getMaxTreeDepth());
            }

            // Create intermediate directories
            StringBuilder currentPath = new StringBuilder();
            RepositoryTreeNodeDto parent = root;

            for (int i = 0; i < segments.length - 1; i++) {
                if (currentPath.length() > 0) {
                    currentPath.append("/");
                }
                currentPath.append(segments[i]);
                String dirPath = currentPath.toString();

                parent = dirMap.computeIfAbsent(dirPath, path -> {
                    RepositoryTreeNodeDto dirNode = new RepositoryTreeNodeDto(
                            segments[segments.length - 2], // temporary name, will be fixed below
                            path,
                            "DIRECTORY",
                            null,
                            null,
                            null
                    );
                    return dirNode;
                });
            }

            // Re-chain parent children cleanly
        }

        // Build cleanly by inserting paths
        return constructCleanTree(files);
    }

    private RepositoryTreeNodeDto constructCleanTree(List<RepositoryFileEntity> files) {
        RepositoryTreeNodeDto root = new RepositoryTreeNodeDto("root", "", "DIRECTORY", null, null, null);

        for (RepositoryFileEntity file : files) {
            String[] segments = file.getRelativePath().split("/");
            RepositoryTreeNodeDto current = root;
            StringBuilder currentPath = new StringBuilder();

            for (int i = 0; i < segments.length; i++) {
                String segment = segments[i];
                if (currentPath.length() > 0) {
                    currentPath.append("/");
                }
                currentPath.append(segment);
                String pathStr = currentPath.toString();

                boolean isFile = (i == segments.length - 1);

                if (isFile) {
                    RepositoryTreeNodeDto fileNode = new RepositoryTreeNodeDto(
                            file.getFileName(),
                            pathStr,
                            "FILE",
                            file.getSizeBytes(),
                            file.getLanguage(),
                            file.isBinary()
                    );
                    current.getChildren().add(fileNode);
                } else {
                    // Find or create directory node
                    RepositoryTreeNodeDto dirNode = findChild(current, segment);
                    if (dirNode == null) {
                        dirNode = new RepositoryTreeNodeDto(segment, pathStr, "DIRECTORY", null, null, null);
                        current.getChildren().add(dirNode);
                    }
                    current = dirNode;
                }
            }
        }

        sortTree(root);
        return root;
    }

    private RepositoryTreeNodeDto findChild(RepositoryTreeNodeDto parent, String name) {
        for (RepositoryTreeNodeDto child : parent.getChildren()) {
            if ("DIRECTORY".equals(child.getType()) && child.getName().equals(name)) {
                return child;
            }
        }
        return null;
    }

    private void sortTree(RepositoryTreeNodeDto node) {
        if (node.getChildren() == null || node.getChildren().isEmpty()) {
            return;
        }

        node.getChildren().sort((a, b) -> {
            boolean aIsDir = "DIRECTORY".equals(a.getType());
            boolean bIsDir = "DIRECTORY".equals(b.getType());

            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.getName().compareToIgnoreCase(b.getName());
        });

        for (RepositoryTreeNodeDto child : node.getChildren()) {
            if ("DIRECTORY".equals(child.getType())) {
                sortTree(child);
            }
        }
    }
}
