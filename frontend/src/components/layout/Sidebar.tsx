import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
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
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  name: string;
  to: string;
  icon: React.ReactNode;
  badge?: string;
  badgeType?: 'ai' | 'upcoming';
  tooltip?: string;
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

  const { isCollapsed, toggleSidebar } = useSidebar();

  const workspaceItems: NavItem[] = [
    { name: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={16} /> },
    { name: 'Repositories', to: '/repositories', icon: <FolderGit2 size={16} /> },
    { name: 'Search', to: '/search', icon: <Search size={16} /> },
  ];

  const intelligenceItems: NavItem[] = [
    { name: 'Analysis', to: '/analysis', icon: <Activity size={16} /> },
    { name: 'Reuse Advisor', to: '/reuse', icon: <GitFork size={16} /> },
    { name: 'Architecture', to: '/architecture', icon: <Network size={16} /> },
  ];

  const securityItems: NavItem[] = [
    { name: 'Security', to: '/security', icon: <ShieldAlert size={16} /> },
  ];

  const aiItems: NavItem[] = [
    { name: 'Grounded AI', to: '/ai', icon: <BotMessageSquare size={16} />, badge: 'AI', badgeType: 'ai' },
    {
      name: 'Ponytail',
      to: '/ponytail',
      icon: <Sparkles size={16} />,
      badge: 'UPCOMING',
      badgeType: 'upcoming',
      tooltip: 'Ponytail — Upcoming Feature',
    },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} data-testid="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand-header">
        <div className="sidebar-brand-content">
          <div className="sidebar-brand-badge" title="CodeMind AI" style={{ padding: '2px', overflow: 'hidden', background: 'transparent' }}>
            <img src="/logo.png" alt="CodeMind AI" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-title">CODEMIND AI</div>
            <div className="sidebar-brand-subtitle">Engineering Intelligence</div>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {/* WORKSPACE */}
        <div className="sidebar-section-title">WORKSPACE</div>
        {workspaceItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={isCollapsed ? item.name : undefined}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-text">{item.name}</span>
            {isCollapsed && <span className="sidebar-floating-tooltip">{item.name}</span>}
          </NavLink>
        ))}

        {/* INTELLIGENCE */}
        <div className="sidebar-section-title">INTELLIGENCE</div>
        {intelligenceItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={isCollapsed ? item.name : undefined}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-text">{item.name}</span>
            {isCollapsed && <span className="sidebar-floating-tooltip">{item.name}</span>}
          </NavLink>
        ))}

        {/* SECURITY */}
        <div className="sidebar-section-title">SECURITY</div>
        {securityItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={isCollapsed ? item.name : undefined}
          >
            <span className="sidebar-link-icon" style={{ color: 'var(--accent-red)' }}>{item.icon}</span>
            <span className="sidebar-link-text">{item.name}</span>
            {isCollapsed && <span className="sidebar-floating-tooltip">{item.name}</span>}
          </NavLink>
        ))}

        {/* AI */}
        <div className="sidebar-section-title">AI</div>
        {aiItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={isCollapsed ? (item.tooltip || item.name) : undefined}
          >
            <span
              className="sidebar-link-icon"
              style={{
                color: item.badgeType === 'upcoming' ? 'var(--accent-amber)' : 'var(--accent-indigo)',
              }}
            >
              {item.icon}
            </span>
            <span className="sidebar-link-text">{item.name}</span>
            {item.badge && (
              <span
                className={`sidebar-link-badge ${
                  item.badgeType === 'upcoming'
                    ? 'cm-tag-pill cm-tag-pill-amber'
                    : 'cm-status-pill cm-status-pill-ai'
                }`}
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.55rem',
                  padding: '1px 6px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                {item.badge}
              </span>
            )}
            {isCollapsed && (
              <span className="sidebar-floating-tooltip">{item.tooltip || item.name}</span>
            )}
          </NavLink>
        ))}

        {user?.role === 'ROLE_ADMIN' && (
          <>
            <div className="sidebar-section-title">ADMINISTRATION</div>
            <NavLink
              to="/admin"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title={isCollapsed ? 'Admin Console' : undefined}
            >
              <span className="sidebar-link-icon"><Settings size={16} color="var(--accent-red)" /></span>
              <span className="sidebar-link-text">Admin Console</span>
              {isCollapsed && <span className="sidebar-floating-tooltip">Admin Console</span>}
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
          <span className="system-version">CodeMind</span>
          <span
            style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-green)', display: 'inline-block' }}
            title="Core Engine Online"
          />
        </div>
        <p className="security-tag" style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.68rem' }}>AI-powered engineering intelligence</p>
      </div>
    </aside>
  );
};

export default Sidebar;
