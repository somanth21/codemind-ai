import React, { useState } from 'react';
import { RepositoryTreeNode } from '../../types/repository';
import { Folder, FolderOpen, FileCode, FileText, ChevronRight, ChevronDown, Lock } from 'lucide-react';

interface TreeItemProps {
  node: RepositoryTreeNode;
  onSelectFile: (path: string) => void;
  selectedPath?: string;
  depth?: number;
}

const TreeItem: React.FC<TreeItemProps> = ({ node, onSelectFile, selectedPath, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(depth < 2);

  if (node.type === 'DIRECTORY') {
    return (
      <div className="tree-node-dir">
        <div
          className="tree-node-header"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {isOpen ? <FolderOpen size={16} className="icon-dir-open" /> : <Folder size={16} className="icon-dir" />}
          <span className="tree-node-name">{node.name}</span>
        </div>
        {isOpen && node.children && (
          <div className="tree-node-children">
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                onSelectFile={onSelectFile}
                selectedPath={selectedPath}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedPath === node.path;
  const isBinary = node.binary;

  return (
    <div
      className={`tree-node-file ${isSelected ? 'selected' : ''} ${isBinary ? 'binary' : ''}`}
      style={{ paddingLeft: `${depth * 16 + 22}px` }}
      onClick={() => !isBinary && onSelectFile(node.path)}
      title={isBinary ? 'Binary file (text view disabled)' : `View ${node.path}`}
    >
      {isBinary ? <Lock size={14} className="icon-binary" /> : node.language !== 'UNKNOWN' ? <FileCode size={14} className="icon-code" /> : <FileText size={14} />}
      <span className="tree-node-name">{node.name}</span>
      {node.language && node.language !== 'UNKNOWN' && (
        <span className="lang-tag">{node.language}</span>
      )}
      {node.sizeBytes !== undefined && (
        <span className="file-size-tag">{(node.sizeBytes / 1024).toFixed(1)} KB</span>
      )}
    </div>
  );
};

export const RepositoryTreeViewer: React.FC<{
  rootNode?: RepositoryTreeNode;
  tree?: RepositoryTreeNode;
  onSelectFile: (path: string) => void;
  selectedPath?: string;
}> = ({ rootNode, tree, onSelectFile, selectedPath }) => {
  const actualRoot = rootNode || tree;
  if (!actualRoot) return null;
  return (
    <div className="tree-viewer-container">
      <div className="tree-viewer-header">Repository Files</div>
      <div className="tree-viewer-content">
        {actualRoot.children && actualRoot.children.length > 0 ? (
          actualRoot.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              onSelectFile={onSelectFile}
              selectedPath={selectedPath}
            />
          ))
        ) : (
          <p className="tree-empty">No files in repository</p>
        )}
      </div>
    </div>
  );
};
