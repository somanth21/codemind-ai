import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepository } from '../../context/RepositoryContext';
import { FolderGit2, ArrowUpRight, Upload, Sparkles } from 'lucide-react';

interface NoRepoSelectedProps {
  moduleName?: string;
  description?: string;
}

export const NoRepoSelected: React.FC<NoRepoSelectedProps> = ({
  moduleName = 'Feature Workspace',
  description = 'Connect or select an active repository to inspect symbols, architecture graphs, and security findings.',
}) => {
  const navigate = useNavigate();
  const { repositories, selectRepo } = useRepository();

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '40px auto',
        padding: '60px 32px',
        borderRadius: '24px',
        backgroundColor: '#0d1220',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 30px 60px -20px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background glow */}
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232, 90, 43, 0.15), transparent 70%)',
          top: '-150px',
          left: '50%',
          transform: 'translateX(-50%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            backgroundColor: 'rgba(232, 90, 43, 0.12)',
            border: '1px solid rgba(232, 90, 43, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ref-orange-3)',
            marginBottom: '20px',
            boxShadow: '0 12px 24px -6px rgba(217, 53, 31, 0.25)',
          }}
        >
          <FolderGit2 size={28} />
        </div>

        <div className="ref-hero-eyebrow" style={{ marginBottom: '10px' }}>
          <span className="dot" />
          <span>REPOSITORY CONTEXT REQUIRED</span>
        </div>

        <h2
          style={{
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            margin: '0 0 12px 0',
          }}
        >
          Connect a repository to use {moduleName}
        </h2>

        <p
          style={{
            fontSize: '0.92rem',
            color: 'var(--ref-ink-soft)',
            maxWidth: '560px',
            lineHeight: 1.6,
            margin: '0 0 32px 0',
          }}
        >
          {description}
        </p>

        {/* Existing repositories selector if any */}
        {repositories.length > 0 && (
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              marginBottom: '28px',
              padding: '16px 20px',
              borderRadius: '14px',
              backgroundColor: '#070a12',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ref-mute)', textTransform: 'uppercase', marginBottom: '8px', textAlign: 'left' }}>
              Select Active Ingested Repository:
            </div>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  selectRepo(e.target.value);
                }
              }}
              defaultValue=""
              aria-label="Select Ingested Repository"
              className="cm-input-dev"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '0.85rem',
                backgroundColor: '#121829',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <option value="" disabled>Choose an ingested repository...</option>
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.name} ({repo.fileCount} files) - {repo.status}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* CTA Buttons with rotating arrow badge */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/repositories')}
            className="ref-arrow-pill"
          >
            <span>Connect GitHub</span>
            <span className="ref-ar">
              <ArrowUpRight size={14} />
            </span>
          </button>

          <button
            onClick={() => navigate('/repositories')}
            className="ref-arrow-pill"
            style={{ background: 'rgba(232, 90, 43, 0.12)', borderColor: 'rgba(232, 90, 43, 0.4)' }}
          >
            <Upload size={14} style={{ color: 'var(--ref-orange-3)' }} />
            <span>Upload Repository Archive</span>
            <span className="ref-ar">
              <ArrowUpRight size={14} />
            </span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '30px', fontSize: '0.78rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>
          <Sparkles size={13} style={{ color: 'var(--ref-orange-3)' }} />
          <span>Deterministic Indexing &bull; 100% Static Provenance &bull; Zero Hallucination</span>
        </div>
      </div>
    </div>
  );
};
