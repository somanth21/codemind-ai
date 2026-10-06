import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FolderGit2,
  Activity,
  Search,
  GitFork,
  ShieldAlert,
  Network,
  BotMessageSquare,
  Settings,
} from 'lucide-react';

interface NavItem {
  name: string;
  to: string;
  icon: React.ReactNode;
  badge?: string;
  adminOnly?: boolean;
}

export const Sidebar: React.FC = () => {
  let user = null;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch {
    // Graceful fallback if rendered in isolation tests without AuthProvider
  }

  const navItems: NavItem[] = [
    { name: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Repositories', to: '/repositories', icon: <FolderGit2 size={18} /> },
    { name: 'Static Analysis', to: '/analysis', icon: <Activity size={18} /> },
    { name: 'Hybrid Search', to: '/search', icon: <Search size={18} /> },
    { name: 'Reuse Advisor', to: '/reuse', icon: <GitFork size={18} /> },
    { name: 'Security Analysis', to: '/security', icon: <ShieldAlert size={18} /> },
    { name: 'Architecture', to: '/architecture', icon: <Network size={18} /> },
    { name: 'Grounded AI', to: '/ai', icon: <BotMessageSquare size={18} />, badge: 'AI' },
  ];

  return (
    <aside className="sidebar" style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', width: '250px' }}>
      <div className="sidebar-section-title" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em' }}>
        RESEARCH PIPELINE
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-text">{item.name}</span>
            {item.badge && (
              <span className="cm-status-pill cm-status-pill-ai" style={{ marginLeft: 'auto', fontSize: '0.6rem', padding: '1px 6px' }}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        {user?.role === 'ROLE_ADMIN' && (
          <>
            <div className="sidebar-section-title" style={{ marginTop: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em' }}>
              ADMINISTRATION
            </div>
            <NavLink
              to="/admin"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-link-icon"><Settings size={18} color="var(--accent-red)" /></span>
              <span className="sidebar-link-text">Admin Console</span>
              <span className="cm-status-pill cm-status-pill-failed" style={{ marginLeft: 'auto', fontSize: '0.6rem', padding: '1px 6px' }}>
                ADMIN
              </span>
            </NavLink>
          </>
        )}
      </nav>
      <div className="sidebar-footer">
        <p className="system-version" style={{ fontFamily: 'var(--font-mono)' }}>CodeMind Core v0.9.0</p>
        <p className="security-tag" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Deterministic Monolith</p>
      </div>
    </aside>
  );
};
