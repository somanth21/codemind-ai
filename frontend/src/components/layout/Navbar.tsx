import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRepository } from '../../context/RepositoryContext';
import {
  LogOut,
  User as UserIcon,
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
    <header className="navbar" style={{ height: '54px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Breadcrumb Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <div
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}
          >
            <img src="/logo.png" alt="CodeMind AI Logo" style={{ width: '22px', height: '22px', borderRadius: '5px', objectFit: 'contain' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>CodeMind</span>
          </div>
          <span style={{ color: 'var(--border-prominent)' }}>/</span>

          {/* Active Repository Context */}
          {selectedRepo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select
                  value={selectedRepoId || ''}
                  onChange={(e) => selectRepo(e.target.value || null)}
                  aria-label="Select Active Repository"
                  className="cm-input-dev"
                  style={{
                    padding: '4px 24px 4px 8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    appearance: 'none',
                    cursor: 'pointer',
                    maxWidth: '200px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                  }}
                >
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id} style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                      {repo.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    pointerEvents: 'none',
                    color: 'var(--text-muted)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.7rem', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
                <GitBranch size={11} />
                <span>main</span>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Workspace</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Command Palette Search Box (Raycast style) */}
        <div
          onClick={() => navigate('/search')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '5px 12px',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            minWidth: '260px',
            transition: 'all 0.15s ease',
          }}
          title="Jump to Hybrid Symbol Search"
        >
          <Search size={13} color="var(--text-muted)" />
          <span style={{ flex: 1 }}>Search symbols, methods, files...</span>
          <kbd style={{ fontSize: '0.62rem', backgroundColor: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
            ⌘K
          </kbd>
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
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="user-email" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {user.email.split('@')[0]}
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