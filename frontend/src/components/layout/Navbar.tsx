import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRepository } from '../../context/RepositoryContext';
import {
  Shield,
  LogOut,
  User as UserIcon,
  FolderGit2,
  ChevronDown,
  Settings,
  Search,
  GitBranch,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { repositories, selectedRepoId, selectRepo, selectedRepo } = useRepository();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="navbar" style={{ height: '60px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div className="navbar-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield className="brand-icon" size={22} color="var(--accent-blue)" />
          <span className="brand-title" style={{ fontSize: '1.15rem', fontWeight: 800 }}>CodeMind AI</span>
          <span className="cm-status-pill cm-status-pill-deterministic" style={{ fontSize: '0.65rem' }}>
            v0.9.0
          </span>
        </div>

        {/* Global Repository & Branch Selector */}
        <div className="navbar-repo-selector" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '12px' }}>
          <FolderGit2 size={16} color="var(--accent-blue)" />
          {repositories.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select
                  value={selectedRepoId || ''}
                  onChange={(e) => selectRepo(e.target.value || null)}
                  aria-label="Select Active Repository"
                  className="cm-input-dev"
                  style={{
                    padding: '5px 28px 5px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    appearance: 'none',
                    cursor: 'pointer',
                    maxWidth: '220px',
                    backgroundColor: 'var(--bg-tertiary)',
                  }}
                >
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.name} ({repo.status})
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    pointerEvents: 'none',
                    color: 'var(--text-muted)',
                  }}
                />
              </div>

              {selectedRepo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.72rem', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
                  <GitBranch size={12} />
                  <span>main</span>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/repositories')}
              className="cm-btn cm-btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              + Ingest Repository
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Global Search Shortcut (Uiverse Monospace input pill) */}
        <div
          onClick={() => navigate('/search')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
          title="Jump to Hybrid Symbol Search"
        >
          <Search size={14} />
          <span>Search symbols, methods, files...</span>
          <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>
            Ctrl+K
          </span>
        </div>

        {/* System Health / Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-green)' }} />
          <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>ONLINE</span>
        </div>

        {/* User Menu Dropdown */}
        <div className="navbar-user" ref={menuRef} style={{ position: 'relative' }}>
          {user && (
            <>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="user-email" style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{user.email}</span>
                  <span className="cm-status-pill cm-status-pill-deterministic" style={{ fontSize: '0.65rem' }}>
                    {user.role.replace('ROLE_', '')}
                  </span>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              {menuOpen && (
                <div
                  className="cm-card"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '200px',
                    padding: '6px 0',
                    zIndex: 100,
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      fontSize: '0.85rem',
                    }}
                  >
                    <UserIcon size={15} color="var(--accent-blue)" />
                    <span>User Profile</span>
                  </Link>

                  {user.role === 'ROLE_ADMIN' && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                      }}
                    >
                      <Settings size={15} color="#f87171" />
                      <span>Admin Console</span>
                    </Link>
                  )}

                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '6px 0' }} />

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-red)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};