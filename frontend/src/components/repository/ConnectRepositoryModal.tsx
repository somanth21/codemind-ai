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

    let t1: any = null;
    let t2: any = null;
    let t3: any = null;

    try {
      t1 = setTimeout(() => setPipelineState('DOWNLOADING'), 400);
      t2 = setTimeout(() => setPipelineState('VALIDATING'), 900);
      t3 = setTimeout(() => setPipelineState('INGESTING'), 1400);

      const repo = await repositoryApi.connectGitHub(githubUrl, githubBranch);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setPipelineState('READY');
      onSuccess(repo.name);
      setTimeout(() => {
        onClose();
        setPipelineState('IDLE');
        setGithubUrl('');
        setGithubBranch('');
      }, 800);
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setPipelineState('IDLE');
      if (err instanceof ApiError) {
        if (err.problemDetail.status === 401) {
          setErrorMsg('Your session has expired or is unauthenticated. Please sign in again.');
        } else {
          setErrorMsg(err.problemDetail.detail || err.problemDetail.title || 'GitHub ingestion failed');
        }
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
        if (err.problemDetail.status === 401) {
          setErrorMsg('Your session has expired or is unauthenticated. Please sign in again.');
        } else {
          setErrorMsg(err.problemDetail.detail || err.problemDetail.title || 'ZIP ingestion failed');
        }
      } else {
        setErrorMsg(err.message || 'Failed to ingest ZIP archive');
      }
    }
  };

  return (
    <div className="explorer-modal-overlay" style={{ zIndex: 1200 }}>
      <div className="cm-clay-card" style={{ width: '560px', maxWidth: '95vw', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="cm-icon-tile" style={{ width: '34px', height: '34px' }}>
              <FolderGit2 size={18} />
            </span>
            <div>
              <div className="cm-eyebrow" style={{ marginBottom: '2px', fontSize: '0.65rem' }}>INGESTION PIPELINE</div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>Connect Repository</h3>
            </div>
          </div>
          <button onClick={onClose} className="cm-circle-btn" aria-label="Close modal" style={{ width: '32px', height: '32px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Segmented Control Pill Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div className="cm-pill-nav" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'GITHUB'}
                className={`cm-pill-tab ${activeTab === 'GITHUB' ? 'active' : ''}`}
                onClick={() => { setActiveTab('GITHUB'); setErrorMsg(null); }}
              >
                <FolderGit2 size={15} />
                <span>GitHub (Primary)</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ZIP'}
                className={`cm-pill-tab ${activeTab === 'ZIP' ? 'active' : ''}`}
                onClick={() => { setActiveTab('ZIP'); setErrorMsg(null); }}
              >
                <Upload size={15} />
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
            <div style={{ marginBottom: '20px', padding: '14px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Ingestion Pipeline</span>
                <span className={`cm-tag-pill ${pipelineState === 'READY' ? 'cm-tag-pill-green' : 'cm-tag-pill-cyan'}`}>
                  {pipelineState}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>
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
                <label htmlFor="gh-url" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>Public GitHub Repository URL</label>
                <div className="cm-input-wrapper">
                  <FolderGit2 size={16} className="cm-input-icon" />
                  <input
                    id="gh-url"
                    type="url"
                    required
                    className="cm-input-dev"
                    style={{ borderRadius: '10px' }}
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    disabled={pipelineState !== 'IDLE'}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                  Supports public GitHub repositories. Only HTTPS github.com links accepted.
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="gh-branch" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>Branch (optional, defaults to main/master)</label>
                <input
                  id="gh-branch"
                  type="text"
                  className="cm-input-dev"
                  style={{ paddingLeft: '14px', borderRadius: '10px' }}
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  placeholder="main"
                  disabled={pipelineState !== 'IDLE'}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.15)', fontSize: '0.78rem', color: '#94a3b8' }}>
                <Lock size={14} color="#38bdf8" />
                <span>Private repositories require GitHub OAuth integration and are not yet connected.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={onClose} className="cm-arrow-pill" disabled={pipelineState !== 'IDLE'}>
                  <span>Cancel</span>
                </button>
                <button type="submit" className="cm-arrow-pill cm-arrow-pill-primary" disabled={pipelineState !== 'IDLE'}>
                  <span>Analyze Repository</span>
                  <span className="cm-cta-dot" style={{ width: '24px', height: '24px' }}>
                    <ArrowRight size={13} />
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleZipSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="zip-file" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>Select ZIP Archive</label>
                <input
                  id="zip-file"
                  type="file"
                  accept=".zip"
                  required
                  className="file-input"
                  style={{ borderRadius: '10px' }}
                  onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                  disabled={pipelineState !== 'IDLE'}
                />
              </div>

              <div className="form-group">
                <label htmlFor="zip-name" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>Repository Name (optional)</label>
                <input
                  id="zip-name"
                  type="text"
                  className="cm-input-dev"
                  style={{ paddingLeft: '14px', borderRadius: '10px' }}
                  value={zipName}
                  onChange={(e) => setZipName(e.target.value)}
                  placeholder="e.g. petclinic-local"
                  disabled={pipelineState !== 'IDLE'}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={onClose} className="cm-arrow-pill" disabled={pipelineState !== 'IDLE'}>
                  <span>Cancel</span>
                </button>
                <button type="submit" className="cm-arrow-pill cm-arrow-pill-primary" disabled={pipelineState !== 'IDLE' || !zipFile}>
                  <span>Ingest ZIP Archive</span>
                  <span className="cm-cta-dot" style={{ width: '24px', height: '24px' }}>
                    <Upload size={13} />
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
