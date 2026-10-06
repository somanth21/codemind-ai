import React, { useEffect, useState } from 'react';
import { repositoryApi } from '../api/repositories';
import { RepositorySummary, RepositoryTreeNode } from '../types/repository';
import { RepositoryTreeViewer } from '../components/repository/RepositoryTreeViewer';
import { ConnectRepositoryModal } from '../components/repository/ConnectRepositoryModal';
import { ApiError } from '../api/client';
import {
  Upload,
  FolderGit2,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  FileCode,
  X,
  Activity,
  Plus,
} from 'lucide-react';
import { AnalysisDashboard } from '../components/analysis/AnalysisDashboard';

export const RepositoriesPage: React.FC = () => {
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ingestion Modal State
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Legacy Upload state (for existing tests compatibility)
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [repoName, setRepoName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Tree & Explorer state
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [selectedRepoName, setSelectedRepoName] = useState<string>('');
  const [treeData, setTreeData] = useState<RepositoryTreeNode | null>(null);
  const [treeLoading, setTreeLoading] = useState<boolean>(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileContentLoading, setFileContentLoading] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Analysis state
  const [analysisRepoId, setAnalysisRepoId] = useState<string | null>(null);
  const [analysisRepoName, setAnalysisRepoName] = useState<string>('');

  const fetchRepositories = async () => {
    try {
      setErrorMsg(null);
      const list = await repositoryApi.list();
      setRepositories(list);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.problemDetail.detail || 'Failed to load repositories');
      } else {
        setErrorMsg('Error connecting to repository service.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setErrorMsg('Please select a .zip repository archive to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setUploadSuccess(null);

    try {
      const created = await repositoryApi.upload(uploadFile, repoName);
      setUploadSuccess(`Repository "${created.name}" ingested successfully with ${created.fileCount} files.`);
      setUploadFile(null);
      setRepoName('');
      const fileInput = document.getElementById('repo-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await fetchRepositories();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.problemDetail.detail || err.problemDetail.title || 'Ingestion failed');
      } else {
        setErrorMsg('Ingestion failed: connection error.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete repository "${name}"? This removes sandbox files and database metadata.`)) {
      return;
    }

    try {
      await repositoryApi.delete(id);
      if (selectedRepoId === id) {
        closeExplorer();
      }
      await fetchRepositories();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.problemDetail.detail || 'Failed to delete repository');
      }
    }
  };

  const handleOpenExplorer = async (repo: RepositorySummary) => {
    setSelectedRepoId(repo.id);
    setSelectedRepoName(repo.name);
    setTreeLoading(true);
    setSelectedFilePath(null);
    setFileContent(null);
    setFileError(null);

    try {
      const tree = await repositoryApi.getTree(repo.id);
      setTreeData(tree);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.problemDetail.detail || 'Failed to load repository tree');
      }
    } finally {
      setTreeLoading(false);
    }
  };

  const handleSelectFile = async (path: string) => {
    if (!selectedRepoId) return;
    setSelectedFilePath(path);
    setFileContentLoading(true);
    setFileError(null);

    try {
      const res = await repositoryApi.getFileContent(selectedRepoId, path);
      setFileContent(res.content);
    } catch (err) {
      if (err instanceof ApiError) {
        setFileError(err.problemDetail.detail || 'Could not display file content');
      } else {
        setFileError('Failed to load file content.');
      }
      setFileContent(null);
    } finally {
      setFileContentLoading(false);
    }
  };

  const closeExplorer = () => {
    setSelectedRepoId(null);
    setTreeData(null);
    setSelectedFilePath(null);
    setFileContent(null);
    setFileError(null);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="repos-page" style={{ maxWidth: '1350px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800 }}>Repository Management</h1>
          <p className="page-description">GitHub Ingestion Pipeline &amp; Secure Isolated Workspaces</p>
        </div>

        <button
          onClick={() => setIsConnectModalOpen(true)}
          className="cm-btn cm-btn-primary"
        >
          <Plus size={16} />
          <span>Connect Repository</span>
        </button>
      </div>

      {errorMsg && (
        <div className="alert-error" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="alert-success" role="alert" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={18} />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* GitHub & ZIP Quick Ingestion Card */}
      <div className="cm-card" style={{ marginBottom: '28px' }}>
        <div className="cm-card-corner-accent" style={{ opacity: 1 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderGit2 size={20} color="var(--accent-blue)" />
            <span>Connect a Repository</span>
          </h2>
          <span className="cm-status-pill cm-status-pill-deterministic">Phase 11A.2</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {/* GitHub Action Banner */}
          <div
            onClick={() => setIsConnectModalOpen(true)}
            className="cm-card cm-card-interactive"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-prominent)', padding: '20px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <FolderGit2 size={24} color="var(--accent-blue)" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>GitHub Ingestion (Primary)</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Public repository streaming via HTTPS</span>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
              Directly stream any public repository by URL (e.g. <code>https://github.com/owner/repo</code>).
            </p>
            <button type="button" className="cm-btn cm-btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              Connect GitHub URL &rarr;
            </button>
          </div>

          {/* Quick ZIP Upload (Accessible for tests and fallback) */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Upload size={20} color="var(--accent-cyan)" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Select ZIP Archive</h3>
            </div>
            <form onSubmit={handleUpload}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  id="repo-file-input"
                  type="file"
                  accept=".zip"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="file-input"
                />
                <input
                  id="repo-name-input"
                  type="text"
                  placeholder="Optional Name (e.g. spring-petclinic)"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  className="cm-input-dev"
                  style={{ paddingLeft: '12px' }}
                />
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="cm-btn cm-btn-secondary"
                  style={{ padding: '8px 16px', alignSelf: 'flex-start' }}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="spinner" />
                      <span>Ingesting...</span>
                    </>
                  ) : (
                    <span>Upload &amp; Ingest ZIP</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Repositories Table */}
      <div className="cm-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderGit2 size={18} color="var(--accent-blue)" />
            <span>Ingested Repositories ({repositories.length})</span>
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Sandbox Isolation Active
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '24px 0', color: 'var(--text-muted)' }}>
            <div className="cm-loader-orbit" style={{ width: '18px', height: '18px' }}>
              <div className="cm-loader-orbit-ring" />
              <div className="cm-loader-orbit-ring" />
            </div>
            <span>Loading repositories...</span>
          </div>
        ) : repositories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <FolderGit2 size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>No repositories connected yet.</p>
            <p style={{ margin: '6px 0 16px 0', fontSize: '0.85rem' }}>Connect a public GitHub repository or upload a local archive to start analysis.</p>
            <button onClick={() => setIsConnectModalOpen(true)} className="cm-btn cm-btn-primary">
              Connect Repository
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="repos-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Files</th>
                  <th>Total Size</th>
                  <th>Ingested At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {repositories.map((repo) => (
                  <tr key={repo.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{repo.name}</td>
                    <td>
                      <span className="cm-status-pill cm-status-pill-deterministic" style={{ fontSize: '0.65rem' }}>
                        {repo.sourceType || 'LOCAL_ZIP'}
                      </span>
                    </td>
                    <td>
                      <span className={`cm-status-pill ${
                        repo.status === 'READY' ? 'cm-status-pill-ready' :
                        repo.status === 'INGESTING' ? 'cm-status-pill-ingesting' :
                        'cm-status-pill-failed'
                      }`}>
                        {repo.status === 'READY' && <CheckCircle2 size={12} />}
                        {repo.status === 'INGESTING' && <Clock size={12} />}
                        {repo.status === 'FAILED' && <XCircle size={12} />}
                        <span>{repo.status}</span>
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{repo.fileCount}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{formatBytes(repo.totalSizeBytes)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(repo.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {repo.status === 'READY' && (
                          <>
                            <button
                              onClick={() => {
                                setAnalysisRepoId(repo.id);
                                setAnalysisRepoName(repo.name);
                              }}
                              className="btn-action view"
                              title="Deterministic Static Analysis"
                              style={{ borderColor: 'rgba(99, 102, 241, 0.4)', color: '#818cf8' }}
                            >
                              <Activity size={14} />
                              <span>Analysis</span>
                            </button>
                            <button
                              onClick={() => handleOpenExplorer(repo)}
                              className="btn-action view"
                              title="Explore Tree & Files"
                            >
                              <Eye size={14} />
                              <span>Explorer</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(repo.id, repo.name)}
                          className="btn-action delete"
                          title="Delete Repository"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Connect Repository Modal */}
      <ConnectRepositoryModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSuccess={async (name) => {
          setUploadSuccess(`Repository "${name}" connected successfully.`);
          await fetchRepositories();
        }}
      />

      {/* Explorer Modal Viewer */}
      {selectedRepoId && (
        <div className="explorer-modal-overlay">
          <div className="explorer-modal-card cm-card" style={{ padding: 0 }}>
            <div className="explorer-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderGit2 size={20} className="icon-blue" />
                <h3 style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>{selectedRepoName} &mdash; File Explorer</h3>
              </div>
              <button onClick={closeExplorer} className="btn-close" title="Close Explorer">
                <X size={18} />
              </button>
            </div>

            <div className="explorer-modal-body">
              <div className="explorer-sidebar">
                {treeLoading ? (
                  <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <div className="cm-loader-orbit" style={{ width: '16px', height: '16px' }}>
                      <div className="cm-loader-orbit-ring" />
                      <div className="cm-loader-orbit-ring" />
                    </div>
                    <span>Loading directory tree...</span>
                  </div>
                ) : treeData ? (
                  <RepositoryTreeViewer
                    tree={treeData}
                    onSelectFile={handleSelectFile}
                    selectedPath={selectedFilePath || undefined}
                  />
                ) : (
                  <p style={{ padding: '16px', color: 'var(--text-muted)' }}>No tree available.</p>
                )}
              </div>

              <div className="explorer-editor">
                {fileContentLoading ? (
                  <div className="code-viewer-placeholder">
                    <div className="cm-loader-orbit" style={{ width: '24px', height: '24px', marginBottom: '8px' }}>
                      <div className="cm-loader-orbit-ring" />
                      <div className="cm-loader-orbit-ring" />
                    </div>
                    <span>Streaming file content...</span>
                  </div>
                ) : fileError ? (
                  <div className="code-viewer-placeholder" style={{ color: 'var(--accent-red)' }}>
                    <AlertCircle size={24} style={{ marginBottom: '8px' }} />
                    <span>{fileError}</span>
                  </div>
                ) : selectedFilePath && fileContent !== null ? (
                  <div className="code-viewer-container">
                    <div className="code-viewer-header">
                      <FileCode size={16} />
                      <span>{selectedFilePath}</span>
                    </div>
                    <pre className="code-viewer-pre">
                      <code>{fileContent}</code>
                    </pre>
                  </div>
                ) : (
                  <div className="code-viewer-placeholder">
                    <FileCode size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
                    <p>Select a file from the repository tree to inspect source code</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Dashboard Modal */}
      {analysisRepoId && (
        <AnalysisDashboard
          repositoryId={analysisRepoId}
          repositoryName={analysisRepoName}
          onClose={() => {
            setAnalysisRepoId(null);
            setAnalysisRepoName('');
          }}
        />
      )}
    </div>
  );
};
