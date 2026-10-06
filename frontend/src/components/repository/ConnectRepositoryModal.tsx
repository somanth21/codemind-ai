import React, { useState } from 'react';
import { repositoryApi } from '../../api/repositories';
import { ApiError } from '../../api/client';
import {
  FolderGit2,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface ConnectRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (repoName: string) => void;
}

type TabType = 'GITHUB' | 'ZIP';
type PipelineState = 'IDLE' | 'CONNECTING' | 'DOWNLOADING' | 'VALIDATING' | 'INGESTING' | 'READY';

export const ConnectRepositoryModal: React.FC<ConnectRepositoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('GITHUB');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipName, setZipName] = useState('');
  const [pipelineState, setPipelineState] = useState<PipelineState>('IDLE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGitHubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;

    setErrorMsg(null);
    setPipelineState('CONNECTING');

    try {
      // Simulate stepper progress for UX feedback
      setTimeout(() => setPipelineState('DOWNLOADING'), 400);
      setTimeout(() => setPipelineState('VALIDATING'), 900);
      setTimeout(() => setPipelineState('INGESTING'), 1400);

      const repo = await repositoryApi.connectGitHub(githubUrl, githubBranch);
      setPipelineState('READY');
      onSuccess(repo.name);
      setTimeout(() => {
        onClose();
        setPipelineState('IDLE');
        setGithubUrl('');
        setGithubBranch('');
      }, 800);
    } catch (err: any) {
      setPipelineState('IDLE');
      if (err instanceof ApiError) {
        setErrorMsg(err.problemDetail.detail || err.problemDetail.title || 'GitHub ingestion failed');
      } else {
        setErrorMsg(err.message || 'Failed to ingest repository from GitHub');
      }
    }
  };

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipFile) {
      setErrorMsg('Please select a .zip archive');
      return;
    }

    setErrorMsg(null);
    setPipelineState('INGESTING');

    try {
      const repo = await repositoryApi.upload(zipFile, zipName);
      setPipelineState('READY');
      onSuccess(repo.name);
      setTimeout(() => {
        onClose();
        setPipelineState('IDLE');
        setZipFile(null);
        setZipName('');
      }, 800);
    } catch (err: any) {
      setPipelineState('IDLE');
      if (err instanceof ApiError) {
        setErrorMsg(err.problemDetail.detail || err.problemDetail.title || 'ZIP ingestion failed');
      } else {
        setErrorMsg(err.message || 'Failed to ingest ZIP archive');
      }
    }
  };

  return (
    <div className="explorer-modal-overlay" style={{ zIndex: 1200 }}>
      <div className="cm-card" style={{ width: '560px', maxWidth: '95vw', padding: 0, overflow: 'hidden' }}>
        <div className="cm-card-corner-accent" style={{ opacity: 1 }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderGit2 size={20} color="var(--accent-blue)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Connect Repository</h3>
          </div>
          <button onClick={onClose} className="btn-close" aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Segmented Control (Uiverse Dual Mode) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div className="cm-segmented-control" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'GITHUB'}
                className={`cm-segment-btn ${activeTab === 'GITHUB' ? 'active' : ''}`}
                onClick={() => { setActiveTab('GITHUB'); setErrorMsg(null); }}
              >
                <FolderGit2 size={16} />
                <span>GitHub (Primary)</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ZIP'}
                className={`cm-segment-btn ${activeTab === 'ZIP' ? 'active' : ''}`}
                onClick={() => { setActiveTab('ZIP'); setErrorMsg(null); }}
              >
                <Upload size={16} />
                <span>Upload ZIP</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="alert-error" role="alert" style={{ marginBottom: '18px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Stepper progress if active */}
          {pipelineState !== 'IDLE' && (
            <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Ingestion Pipeline</span>
                <span className={`cm-status-pill ${pipelineState === 'READY' ? 'cm-status-pill-ready' : 'cm-status-pill-ingesting'}`}>
                  {pipelineState}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {pipelineState !== 'READY' ? (
                  <div className="cm-loader-orbit" style={{ width: '16px', height: '16px' }}>
                    <div className="cm-loader-orbit-ring" />
                    <div className="cm-loader-orbit-ring" />
                  </div>
                ) : (
                  <CheckCircle2 size={16} color="var(--accent-green)" />
                )}
                <span>Streaming, extracting sandbox, and parsing AST symbols...</span>
              </div>
            </div>
          )}

          {activeTab === 'GITHUB' ? (
            <form onSubmit={handleGitHubSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="gh-url">Public GitHub Repository URL</label>
                <div className="cm-input-wrapper">
                  <FolderGit2 size={16} className="cm-input-icon" />
                  <input
                    id="gh-url"
                    type="url"
                    required
                    className="cm-input-dev"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    disabled={pipelineState !== 'IDLE'}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Supports public GitHub repositories. Only HTTPS github.com links accepted.
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="gh-branch">Branch (optional, defaults to main/master)</label>
                <input
                  id="gh-branch"
                  type="text"
                  className="cm-input-dev"
                  style={{ paddingLeft: '14px' }}
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  placeholder="main"
                  disabled={pipelineState !== 'IDLE'}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.15)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <Lock size={14} color="var(--accent-blue)" />
                <span>Private repositories require GitHub OAuth integration and are not yet connected.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={onClose} className="cm-btn cm-btn-secondary" disabled={pipelineState !== 'IDLE'}>
                  Cancel
                </button>
                <button type="submit" className="cm-btn cm-btn-primary" disabled={pipelineState !== 'IDLE'}>
                  <span>Analyze Repository</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleZipSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="zip-file">Select ZIP Archive</label>
                <input
                  id="zip-file"
                  type="file"
                  accept=".zip"
                  required
                  className="file-input"
                  onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                  disabled={pipelineState !== 'IDLE'}
                />
              </div>

              <div className="form-group">
                <label htmlFor="zip-name">Repository Name (optional)</label>
                <input
                  id="zip-name"
                  type="text"
                  className="cm-input-dev"
                  style={{ paddingLeft: '14px' }}
                  value={zipName}
                  onChange={(e) => setZipName(e.target.value)}
                  placeholder="e.g. petclinic-local"
                  disabled={pipelineState !== 'IDLE'}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={onClose} className="cm-btn cm-btn-secondary" disabled={pipelineState !== 'IDLE'}>
                  Cancel
                </button>
                <button type="submit" className="cm-btn cm-btn-primary" disabled={pipelineState !== 'IDLE'}>
                  <span>Ingest ZIP Archive</span>
                  <Upload size={16} />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
