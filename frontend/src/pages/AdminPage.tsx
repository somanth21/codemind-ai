import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../api/auth';
import {
  AdminOverview,
  UserAdmin,
  RepositoryAdmin,
  SecurityAdminOverview,
  AuditAdminItem,
  AiTelemetry,
  SystemHealth,
  Role,
} from '../types/auth';
import {
  Shield,
  Users,
  FolderGit2,
  Lock,
  FileText,
  Activity,
  HeartPulse,
  RefreshCw,
  Search,
  AlertTriangle,
  Cpu,
  Database,
  Clock,
} from 'lucide-react';

type TabKey = 'overview' | 'users' | 'repositories' | 'security' | 'audit' | 'ai' | 'health';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [repositories, setRepositories] = useState<RepositoryAdmin[]>([]);
  const [security, setSecurity] = useState<SecurityAdminOverview | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditAdminItem[]>([]);
  const [aiTelemetry, setAiTelemetry] = useState<AiTelemetry | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [auditEventFilter, setAuditEventFilter] = useState('');

  // Guard check
  useEffect(() => {
    if (user && user.role !== 'ROLE_ADMIN') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const loadTabData = async (tab: TabKey) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (tab === 'overview') {
        const data = await adminApi.getOverview();
        setOverview(data);
      } else if (tab === 'users') {
        const data = await adminApi.getUsers(0, 50, userSearch);
        setUsers(data.content);
      } else if (tab === 'repositories') {
        const data = await adminApi.getRepositories(0, 50);
        setRepositories(data.content);
      } else if (tab === 'security') {
        const data = await adminApi.getSecurityOverview();
        setSecurity(data);
      } else if (tab === 'audit') {
        const data = await adminApi.getAuditLogs(0, 50, auditEventFilter);
        setAuditLogs(data.content);
      } else if (tab === 'ai') {
        const data = await adminApi.getAiTelemetry();
        setAiTelemetry(data);
      } else if (tab === 'health') {
        const data = await adminApi.getSystemHealth();
        setSystemHealth(data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ROLE_ADMIN') {
      loadTabData(activeTab);
    }
  }, [activeTab, user]);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      loadTabData('users');
    } catch (err: any) {
      alert(err.problemDetail?.detail || err.message || 'Failed to update role');
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, !currentStatus);
      loadTabData('users');
    } catch (err: any) {
      alert(err.problemDetail?.detail || err.message || 'Failed to update user status');
    }
  };

  if (user?.role !== 'ROLE_ADMIN') {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                padding: '8px',
                borderRadius: '8px',
              }}
            >
              <Shield size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>System Administration</h1>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                Platform Governance, RBAC Controls &amp; Operational Telemetry
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => loadTabData(activeTab)}
          disabled={isLoading}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '8px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
          }}
        >
          <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          borderBottom: '1px solid var(--border-color)',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'overview', label: 'Overview', icon: Activity },
          { key: 'users', label: 'Users & Roles', icon: Users },
          { key: 'repositories', label: 'Repositories', icon: FolderGit2 },
          { key: 'security', label: 'Security Posture', icon: Lock },
          { key: 'audit', label: 'Audit Trail', icon: FileText },
          { key: 'ai', label: 'AI Telemetry', icon: Cpu },
          { key: 'health', label: 'System Health', icon: HeartPulse },
        ].map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabKey)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="alert-error">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && overview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div className="dashboard-metric-card" style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTAL USERS</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: 'var(--text-primary)' }}>{overview.totalUsers}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-teal)' }}>{overview.activeUsers} Active</span>
            </div>

            <div className="dashboard-metric-card" style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>REPOSITORIES</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: 'var(--accent-blue)' }}>{overview.totalRepositories}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ingested projects</span>
            </div>

            <div className="dashboard-metric-card" style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ANALYSIS RUNS</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: 'var(--text-primary)' }}>{overview.totalAnalyses}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AST executions</span>
            </div>

            <div className="dashboard-metric-card" style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SECURITY FINDINGS</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: '#f87171' }}>{overview.totalSecurityFindings}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Rules triggered</span>
            </div>

            <div className="dashboard-metric-card" style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AUDIT EVENTS</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: '#a78bfa' }}>{overview.totalAuditEvents}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Traceable actions</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search user email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadTabData('users')}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            <button
              onClick={() => loadTabData('users')}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.875rem' }}
            >
              Search
            </button>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Email</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Role</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Repositories</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Created At</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '0.8rem',
                        }}
                      >
                        <option value="ROLE_DEVELOPER">DEVELOPER</option>
                        <option value="ROLE_ADMIN">ADMIN</option>
                        <option value="ROLE_AUDITOR">AUDITOR</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: u.active ? 'rgba(20, 184, 166, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: u.active ? 'var(--accent-teal)' : '#f87171',
                        }}
                      >
                        {u.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{u.repositoryCount}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleStatusToggle(u.id, u.active)}
                        style={{
                          backgroundColor: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: u.active ? '#f87171' : 'var(--accent-teal)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        {u.active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REPOSITORIES */}
      {activeTab === 'repositories' && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Name</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Owner</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Type</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Files</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Size</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Last Analyzed</th>
              </tr>
            </thead>
            <tbody>
              {repositories.map((repo) => (
                <tr key={repo.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{repo.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{repo.ownerEmail}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{repo.sourceType}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: repo.status === 'READY' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: repo.status === 'READY' ? 'var(--accent-teal)' : 'var(--accent-blue)',
                      }}
                    >
                      {repo.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{repo.fileCount}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{(repo.totalSizeBytes / 1024).toFixed(1)} KB</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {repo.lastAnalyzedAt ? new Date(repo.lastAnalyzedAt).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: SECURITY */}
      {activeTab === 'security' && security && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTAL FINDINGS</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: 'var(--text-primary)' }}>{security.totalFindings}</div>
            </div>
            <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <span style={{ fontSize: '0.8rem', color: '#f87171' }}>CRITICAL</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: '#ef4444' }}>{security.criticalCount}</div>
            </div>
            <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
              <span style={{ fontSize: '0.8rem', color: '#fb923c' }}>HIGH</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: '#f97316' }}>{security.highCount}</div>
            </div>
            <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
              <span style={{ fontSize: '0.8rem', color: '#facc15' }}>MEDIUM</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: '#eab308' }}>{security.mediumCount}</div>
            </div>
            <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)' }}>LOW</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: 'var(--accent-blue)' }}>{security.lowCount}</div>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Category Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {Object.entries(security.categoryCounts).map(([cat, count]) => (
                <div key={cat} style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cat}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Filter by event type (e.g. LOGIN_SUCCESS, USER_ROLE_UPDATED)..."
              value={auditEventFilter}
              onChange={(e) => setAuditEventFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadTabData('audit')}
              style={{
                width: '100%',
                maxWidth: '450px',
                padding: '9px 12px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
              }}
            />
            <button onClick={() => loadTabData('audit')} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
              Filter
            </button>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Principal</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Event</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Outcome</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>IP Address</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>{log.principal}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--accent-blue)' }}>{log.eventType}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: log.outcome === 'SUCCESS' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: log.outcome === 'SUCCESS' ? 'var(--accent-teal)' : '#f87171',
                        }}
                      >
                        {log.outcome}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{log.ipAddress}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: AI */}
      {activeTab === 'ai' && aiTelemetry && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTAL AI INVOCATIONS</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: 'var(--text-primary)' }}>{aiTelemetry.totalRequests}</div>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-teal)' }}>{aiTelemetry.groundedRequests} Grounded</span>
            </div>
            <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ESTIMATED INPUT TOKENS</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: 'var(--accent-blue)' }}>{aiTelemetry.estimatedInputTokens.toLocaleString()}</div>
            </div>
            <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ESTIMATED OUTPUT TOKENS</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, margin: '6px 0', color: '#a78bfa' }}>{aiTelemetry.estimatedOutputTokens.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: HEALTH */}
      {activeTab === 'health' && systemHealth && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Database size={20} color="var(--accent-blue)" />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Database Connectivity</h3>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: systemHealth.databaseStatus === 'HEALTHY' ? 'var(--accent-teal)' : '#f87171' }}>
              {systemHealth.databaseStatus}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Latency: {systemHealth.databaseLatencyMs} ms
            </div>
          </div>

          <div style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Cpu size={20} color="#a78bfa" />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Runtime &amp; Compute</h3>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {systemHealth.activeCores} CPU Cores
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Memory: {((systemHealth.totalMemoryBytes - systemHealth.freeMemoryBytes) / (1024 * 1024)).toFixed(0)} MB / {(systemHealth.totalMemoryBytes / (1024 * 1024)).toFixed(0)} MB
            </div>
          </div>

          <div style={{ padding: '24px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Clock size={20} color="var(--accent-teal)" />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Uptime</h3>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {(systemHealth.uptimeSeconds / 60).toFixed(0)} minutes
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Overall Status: {systemHealth.status}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};