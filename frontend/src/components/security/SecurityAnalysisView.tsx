import React, { useState, useEffect } from 'react';
import {
  analyzeSecurity,
  getSecurityAnalyses,
  getSecurityFindings,
} from '../../api/security';
import {
  SecurityAnalysis,
  SecurityFinding,
  Severity,
  SecurityCategory,
} from '../../types/security';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  FileCode,
  Terminal,
  RefreshCw,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface SecurityAnalysisViewProps {
  repositoryId: string;
}

export const SecurityAnalysisView: React.FC<SecurityAnalysisViewProps> = ({ repositoryId }) => {
  const [currentAnalysis, setCurrentAnalysis] = useState<SecurityAnalysis | null>(null);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [history, setHistory] = useState<SecurityAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<SecurityCategory | ''>('');
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSecurityAnalyses(repositoryId, 0, 10);
      setHistory(res.content);
      if (res.content.length > 0) {
        const latest = res.content[0];
        setCurrentAnalysis(latest);
        await loadFindings(latest.id, severityFilter || undefined, categoryFilter || undefined);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load security analyses');
    } finally {
      setLoading(false);
    }
  };

  const loadFindings = async (analysisId: string, sev?: Severity, cat?: SecurityCategory) => {
    try {
      const res = await getSecurityFindings(repositoryId, analysisId, sev, cat, 0, 100);
      setFindings(res.content);
    } catch (err: any) {
      console.error('Failed to load findings', err);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, [repositoryId]);

  const handleFilterChange = (sev: Severity | '', cat: SecurityCategory | '') => {
    setSeverityFilter(sev);
    setCategoryFilter(cat);
    if (currentAnalysis) {
      loadFindings(currentAnalysis.id, sev || undefined, cat || undefined);
    }
  };

  const handleRunScan = async () => {
    try {
      setScanning(true);
      setError(null);
      const result = await analyzeSecurity(repositoryId);
      setCurrentAnalysis(result);
      await loadFindings(result.id, severityFilter || undefined, categoryFilter || undefined);
      await fetchAnalyses();
    } catch (err: any) {
      setError(err?.message || 'Security scan failed');
    } finally {
      setScanning(false);
    }
  };

  const getSeverityBadge = (sev: Severity) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="cm-tag-pill red font-mono">
            <ShieldAlert className="w-3.5 h-3.5" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="cm-tag-pill amber font-mono">
            <AlertTriangle className="w-3.5 h-3.5" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="cm-tag-pill amber font-mono" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' }}>
            <AlertCircle className="w-3.5 h-3.5" />
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="cm-tag-pill blue font-mono">
            <Info className="w-3.5 h-3.5" />
            LOW
          </span>
        );
      default:
        return (
          <span className="cm-tag-pill cyan font-mono">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="cm-clay-card p-6 relative overflow-hidden">
        <div className="cm-ambient-glow" style={{ top: -40, right: 0, opacity: 0.4 }} />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="cm-eyebrow mb-2">
              SECURITY AUDIT
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-white">Deterministic Repository Security Analysis</h2>
              <span className="cm-tag-pill cyan font-mono">
                Rule-Based AST Gating
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Rule-based AST scanning for secrets, command execution, path traversal, injection, and weak crypto
            </p>
          </div>

          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="cm-arrow-pill"
          >
            <span className="cm-cta-dot" style={{ backgroundColor: '#f59e0b' }} />
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning Repository...' : 'Run Security Scan'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {history.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
          <span className="text-slate-400 font-mono text-[11px] shrink-0">Scan History:</span>
          <div className="cm-pill-nav" style={{ padding: '3px' }}>
            {history.map((run) => (
              <button
                key={run.id}
                onClick={() => {
                  setCurrentAnalysis(run);
                  loadFindings(run.id, severityFilter || undefined, categoryFilter || undefined);
                }}
                className={`cm-pill-tab ${currentAnalysis?.id === run.id ? 'active' : ''}`}
                style={{ fontSize: '0.72rem' }}
              >
                {new Date(run.createdAt).toLocaleTimeString()} ({run.totalFindings} findings)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      {currentAnalysis && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="cm-clay-card p-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">Total Findings</span>
            <div className="mt-1 text-2xl font-bold text-white font-mono">{currentAnalysis.totalFindings}</div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">Status: {currentAnalysis.status}</div>
          </div>

          <div className="cm-clay-card p-4" style={currentAnalysis.criticalCount > 0 ? { borderColor: 'rgba(244, 63, 94, 0.4)', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(20, 24, 38, 0.95) 100%)' } : {}}>
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-medium">Critical</span>
            <div className="mt-1 text-2xl font-bold text-rose-400 font-mono">{currentAnalysis.criticalCount}</div>
            <div className="text-[11px] text-rose-400/70 mt-1">Zero-tolerance gate</div>
          </div>

          <div className="cm-clay-card p-4" style={currentAnalysis.highCount > 0 ? { borderColor: 'rgba(249, 115, 22, 0.4)', background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(20, 24, 38, 0.95) 100%)' } : {}}>
            <span className="text-[11px] font-mono uppercase tracking-wider text-orange-400 font-medium">High</span>
            <div className="mt-1 text-2xl font-bold text-orange-400 font-mono">{currentAnalysis.highCount}</div>
            <div className="text-[11px] text-orange-400/70 mt-1">Severe vulnerability</div>
          </div>

          <div className="cm-clay-card p-4" style={currentAnalysis.mediumCount > 0 ? { borderColor: 'rgba(245, 158, 11, 0.4)', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(20, 24, 38, 0.95) 100%)' } : {}}>
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-medium">Medium</span>
            <div className="mt-1 text-2xl font-bold text-amber-400 font-mono">{currentAnalysis.mediumCount}</div>
            <div className="text-[11px] text-amber-400/70 mt-1">Caution required</div>
          </div>

          <div className="cm-clay-card p-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-medium">Low / Info</span>
            <div className="mt-1 text-2xl font-bold text-blue-400 font-mono">{currentAnalysis.lowCount + currentAnalysis.infoCount}</div>
            <div className="text-[11px] text-blue-400/70 mt-1">Hardening hints</div>
          </div>

          <div className="cm-clay-card p-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-medium">Risk Score</span>
            <div className="mt-1 text-2xl font-bold text-white font-mono">{currentAnalysis.riskScore.toFixed(1)}</div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">Scale: 0.0 - 100.0</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="cm-clay-card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          <span>Filters:</span>
        </div>

        <select
          value={severityFilter}
          onChange={(e) => handleFilterChange(e.target.value as Severity | '', categoryFilter)}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-slate-900/80 text-white focus:outline-none focus:border-amber-500/60 font-mono"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="INFO">Info</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => handleFilterChange(severityFilter, e.target.value as SecurityCategory | '')}
          className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-slate-900/80 text-white focus:outline-none focus:border-amber-500/60 font-mono"
        >
          <option value="">All Categories</option>
          <option value="SECRETS">Secrets</option>
          <option value="INJECTION">Injection</option>
          <option value="AUTHENTICATION">Authentication</option>
          <option value="AUTHORIZATION">Authorization</option>
          <option value="CRYPTOGRAPHY">Cryptography</option>
          <option value="FILE_ACCESS">File Access / Traversal</option>
          <option value="DESERIALIZATION">Deserialization</option>
          <option value="ERROR_HANDLING">Error / Logging</option>
          <option value="DEPENDENCY">Dependency</option>
          <option value="CONFIGURATION">Configuration</option>
        </select>

        <div className="ml-auto text-xs font-mono text-slate-400">
          Showing {findings.length} findings
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {findings.length === 0 && !loading && (
          <div className="cm-clay-card p-12 text-center">
            <div className="cm-icon-tile mx-auto mb-3" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Zero Security Vulnerabilities Detected</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              No matching security findings detected for the selected filters.
            </p>
          </div>
        )}

        {findings.map((finding) => {
          const isExpanded = expandedFindingId === finding.id;
          return (
            <div
              key={finding.id}
              className="cm-clay-card overflow-hidden transition-all hover:border-white/20"
            >
              <div
                onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
                className="p-4 sm:p-5 cursor-pointer flex items-start gap-4"
              >
                <div className="mt-0.5">{getSeverityBadge(finding.severity)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{finding.message}</span>
                    <span className="cm-tag-pill cyan font-mono">
                      {finding.ruleId}
                    </span>
                    <span className="cm-tag-pill amber font-mono">
                      {finding.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-400 font-mono border border-white/[0.08]">
                      Static rule match
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    <span>{finding.filePath}</span>
                    {finding.lineNumber && (
                      <span className="text-slate-500">:line {finding.lineNumber}{finding.endLineNumber && finding.endLineNumber !== finding.lineNumber ? `-${finding.endLineNumber}` : ''}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 ml-2">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-5 bg-black/40 border-t border-white/[0.08] space-y-4">
                  {finding.evidenceSnippet && (
                    <div>
                      <div className="text-[11px] font-mono font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                        <Terminal className="w-3.5 h-3.5 text-amber-400" />
                        Source Evidence Snippet:
                      </div>
                      <pre className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed">
                        {finding.evidenceSnippet}
                      </pre>
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] font-mono font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Deterministic Remediation Advice:
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
                      {finding.remediation}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-1">
                    <span>Confidence: {finding.confidence}</span>
                    <span>Status: {finding.status}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

