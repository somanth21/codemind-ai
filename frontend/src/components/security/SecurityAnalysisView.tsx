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
  Lock,
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400 border border-red-300 dark:border-red-800">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-400 border border-orange-300 dark:border-orange-800">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-300 dark:border-blue-800">
            <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            LOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deterministic Repository Security Analysis</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Rule-based AST scanning for secrets, command execution, path traversal, injection, and weak crypto
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning Repository...' : 'Run Security Scan'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {history.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
          <span className="text-slate-500 font-medium shrink-0">Scan History:</span>
          {history.map((run) => (
            <button
              key={run.id}
              onClick={() => {
                setCurrentAnalysis(run);
                loadFindings(run.id, severityFilter || undefined, categoryFilter || undefined);
              }}
              className={`px-2.5 py-1 rounded text-xs transition ${
                currentAnalysis?.id === run.id
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {new Date(run.createdAt).toLocaleTimeString()} ({run.totalFindings} findings)
            </button>
          ))}
        </div>
      )}

      {/* Summary KPI Cards */}
      {currentAnalysis && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Findings</span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{currentAnalysis.totalFindings}</div>
            <div className="text-xs text-slate-400 mt-1">Status: {currentAnalysis.status}</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-red-200 dark:border-red-900/40 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Critical</span>
            <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{currentAnalysis.criticalCount}</div>
            <div className="text-xs text-red-400/80 mt-1">Zero-tolerance gate</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-orange-200 dark:border-orange-900/40 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">High</span>
            <div className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">{currentAnalysis.highCount}</div>
            <div className="text-xs text-orange-400/80 mt-1">Severe vulnerability</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Medium</span>
            <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{currentAnalysis.mediumCount}</div>
            <div className="text-xs text-amber-400/80 mt-1">Caution required</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Low / Info</span>
            <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{currentAnalysis.lowCount + currentAnalysis.infoCount}</div>
            <div className="text-xs text-blue-400/80 mt-1">Hardening hints</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Risk Score</span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{currentAnalysis.riskScore.toFixed(1)}</div>
            <div className="text-xs text-slate-400 mt-1">Scale: 0.0 - 100.0</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
        </div>

        <select
          value={severityFilter}
          onChange={(e) => handleFilterChange(e.target.value as Severity | '', categoryFilter)}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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

        <div className="ml-auto text-xs text-slate-500">
          Showing {findings.length} findings
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {findings.length === 0 && !loading && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Zero Security Vulnerabilities Detected</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              No matching security findings detected for the selected filters.
            </p>
          </div>
        )}

        {findings.map((finding) => {
          const isExpanded = expandedFindingId === finding.id;
          return (
            <div
              key={finding.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
            >
              <div
                onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
                className="p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 flex items-start gap-4"
              >
                <div className="mt-0.5">{getSeverityBadge(finding.severity)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">{finding.message}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      {finding.ruleId}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-medium">
                      {finding.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-medium border border-slate-300 dark:border-slate-700">
                      Static rule match
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{finding.filePath}</span>
                    {finding.lineNumber && (
                      <span>:line {finding.lineNumber}{finding.endLineNumber && finding.endLineNumber !== finding.lineNumber ? `-${finding.endLineNumber}` : ''}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 bg-slate-50/75 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  {finding.evidenceSnippet && (
                    <div>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        Source Evidence Snippet:
                      </div>
                      <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
                        {finding.evidenceSnippet}
                      </pre>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Deterministic Remediation Advice:
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300 text-xs leading-relaxed">
                      {finding.remediation}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
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
