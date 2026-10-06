import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRepository } from '../context/RepositoryContext';
import { healthApi } from '../api/health';
import { getAnalysisRuns } from '../api/analysis';
import { getSecurityAnalyses } from '../api/security';
import { getReuseAnalyses } from '../api/reuse';
import { HealthStatus } from '../types/api';
import { AnalysisRun } from '../types/analysis';
import { SecurityAnalysis } from '../types/security';
import { ReuseAnalysis } from '../types/reuse';
import {
  ShieldCheck,
  Layers,
  Activity,
  Search,
  GitFork,
  ShieldAlert,
  Network,
  BotMessageSquare,
  ArrowRight,
  FolderGit2,
  CheckCircle2,
  Upload,
  Sparkles,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { selectedRepo, repositories, selectRepo } = useRepository();
  const navigate = useNavigate();

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Repository-specific analytics
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisRun | null>(null);
  const [latestSecurity, setLatestSecurity] = useState<SecurityAnalysis | null>(null);
  const [latestReuse, setLatestReuse] = useState<ReuseAnalysis | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await healthApi.check();
        setHealth(data);
      } catch {
        setHealthError('Backend is unreachable or starting up.');
      }
    };
    fetchHealth();
  }, []);

  useEffect(() => {
    if (!selectedRepo) {
      setLatestAnalysis(null);
      setLatestSecurity(null);
      setLatestReuse(null);
      return;
    }

    const loadRepoData = async () => {
      try {
        // Fetch latest analysis run
        const analysisRes = await getAnalysisRuns(selectedRepo.id, 0, 1);
        if (analysisRes.content.length > 0) {
          setLatestAnalysis(analysisRes.content[0]);
        } else {
          setLatestAnalysis(null);
        }

        // Fetch latest security run
        const secRes = await getSecurityAnalyses(selectedRepo.id, 0, 1);
        if (secRes.content.length > 0) {
          setLatestSecurity(secRes.content[0]);
        } else {
          setLatestSecurity(null);
        }

        // Fetch latest reuse run
        const reuseRes = await getReuseAnalyses(selectedRepo.id, 0, 1);
        if (reuseRes.content.length > 0) {
          setLatestReuse(reuseRes.content[0]);
        } else {
          setLatestReuse(null);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics for repo', err);
      }
    };

    loadRepoData();
  }, [selectedRepo]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="dashboard-page space-y-6">
      {/* Top Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Engineering Overview</h1>
          <p className="page-description">
            Welcome, <strong>{user?.email}</strong>. CodeMind AI deterministic repository understanding platform.
          </p>
        </div>
        <div className="status-indicator">
          <span className={`status-dot ${health?.status === 'UP' ? 'online' : 'checking'}`} />
          <span>{health?.status === 'UP' ? 'Core Gateway Online' : (healthError || 'Connecting to Core...')}</span>
        </div>
      </div>

      {/* Research Invariant Callout Banner */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                Core Research Invariant
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                DETERMINISTIC FIRST
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Deterministic static analysis (JavaParser AST, Halstead complexity, coupling graph, security rules) is the <strong>sole authoritative truth</strong>. Downstream LLM interpretation is strictly bounded by citation-verified evidence.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <span className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            Clean Modular Monolith
          </span>
        </div>
      </div>

      {/* Active Repository Card or Prompt */}
      {selectedRepo ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <FolderGit2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{selectedRepo.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      selectedRepo.status === 'READY'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : selectedRepo.status === 'INGESTING'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {selectedRepo.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-3 mt-1 font-mono">
                  <span>Files: {selectedRepo.fileCount}</span>
                  <span>&bull;</span>
                  <span>Size: {formatBytes(selectedRepo.totalSizeBytes)}</span>
                  <span>&bull;</span>
                  <span>Ingested: {new Date(selectedRepo.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/analysis')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Static Analysis</span>
              </button>
              <button
                onClick={() => navigate('/search')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Hybrid Search</span>
              </button>
              <button
                onClick={() => navigate('/repositories')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                <FolderGit2 className="h-3.5 w-3.5" />
                <span>Explorer</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center">
          <FolderGit2 className="h-10 w-10 text-slate-500 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-200">No Active Repository Selected</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Select an ingested repository from the dropdown in the header or upload a new repository ZIP to inspect metrics, search symbols, and evaluate reuse.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            {repositories.length > 0 ? (
              <select
                onChange={(e) => selectRepo(e.target.value)}
                defaultValue=""
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200"
              >
                <option value="" disabled>Select repository...</option>
                {repositories.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => navigate('/repositories')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Repository Archive</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Deterministic KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Code Scale */}
        <div className="card stat-card">
          <div className="card-header">
            <span className="card-label">Physical Code (LOC)</span>
            <Layers size={18} className="icon-blue" />
          </div>
          <div className="card-value">
            {latestAnalysis ? latestAnalysis.totalLoc.toLocaleString() : (selectedRepo ? `${selectedRepo.fileCount} files` : '—')}
          </div>
          <div className="card-sub">
            {latestAnalysis ? `${latestAnalysis.filesAnalyzed} files parsed via AST` : 'Run Static Analysis to parse'}
          </div>
        </div>

        {/* Metric 2: AST Symbols */}
        <div className="card stat-card">
          <div className="card-header">
            <span className="card-label">AST Symbols</span>
            <Activity size={18} className="icon-green" />
          </div>
          <div className="card-value">
            {latestAnalysis ? `${latestAnalysis.totalClasses}C / ${latestAnalysis.totalMethods}M` : '—'}
          </div>
          <div className="card-sub">Classes and Methods extracted</div>
        </div>

        {/* Metric 3: Code Health (CC & MI) */}
        <div className="card stat-card">
          <div className="card-header">
            <span className="card-label">Maintainability Index</span>
            <ShieldCheck size={18} className="icon-purple" />
          </div>
          <div className="card-value text-emerald-400">
            {latestAnalysis ? `${latestAnalysis.maintainabilityIndex} / 100` : '—'}
          </div>
          <div className="card-sub">
            Avg CC: {latestAnalysis ? latestAnalysis.averageComplexity : '—'} (McCabe points)
          </div>
        </div>

        {/* Metric 4: Security Stance */}
        <div className="card stat-card">
          <div className="card-header">
            <span className="card-label">Security Static Matches</span>
            <ShieldAlert size={18} className="icon-amber" />
          </div>
          <div className="card-value">
            {latestSecurity ? (
              <span className={latestSecurity.criticalCount > 0 ? 'text-rose-400' : 'text-slate-100'}>
                {latestSecurity.totalFindings} findings
              </span>
            ) : '—'}
          </div>
          <div className="card-sub">
            {latestSecurity ? (
              `${latestSecurity.criticalCount} Critical, ${latestSecurity.highCount} High (Risk: ${latestSecurity.riskScore.toFixed(0)})`
            ) : 'Deterministic AST scan'}
            {latestReuse && ` • ${latestReuse.decision}`}
          </div>
        </div>
      </div>

      {/* Research Workflow Stepper / Pipeline Cards */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              <span>End-to-End Research Pipeline</span>
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic verification executes before any downstream AI reasoning.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Step 1: Ingestion */}
          <div
            onClick={() => navigate('/repositories')}
            className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 hover:border-indigo-500/40 cursor-pointer transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                <span>01. INGESTION</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-sm font-bold text-white mb-1">Sandbox Storage</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Path traversal defense, ZIP bomb quotas, untrusted file isolation.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-400 font-medium">
              <span>View Sandbox</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Step 2: Static Analysis */}
          <div
            onClick={() => navigate('/analysis')}
            className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 hover:border-indigo-500/40 cursor-pointer transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                <span>02. STATIC ANALYSIS</span>
                <Activity className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="text-sm font-bold text-white mb-1">AST &amp; Metrics</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                JavaParser symbol extraction, McCabe cyclomatic complexity, Halstead volume, MI.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-400 font-medium">
              <span>Inspect AST</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Step 3: Hybrid Search */}
          <div
            onClick={() => navigate('/search')}
            className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 hover:border-indigo-500/40 cursor-pointer transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                <span>03. RETRIEVAL</span>
                <Search className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-sm font-bold text-white mb-1">Hybrid Search (RRF)</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Reciprocal Rank Fusion over lexical tokens and AST symbol evidence.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-400 font-medium">
              <span>Search Evidence</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Step 4: Reuse Advisor */}
          <div
            onClick={() => navigate('/reuse')}
            className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 hover:border-indigo-500/40 cursor-pointer transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                <span>04. REUSE ADVISOR</span>
                <GitFork className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-sm font-bold text-white mb-1">Reuse Decision Matrix</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                8-dimension evaluation, maintainability impact, hard security blocker gating.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-400 font-medium">
              <span>Evaluate Reuse</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Step 5: Security */}
          <div
            onClick={() => navigate('/security')}
            className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 hover:border-indigo-500/40 cursor-pointer transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                <span>05. SECURITY AUDIT</span>
                <ShieldAlert className="h-4 w-4 text-rose-400" />
              </div>
              <div className="text-sm font-bold text-white mb-1">Static Rule Matches</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                AST rules for injection, path traversal, weak crypto, secrets, and risk scoring.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-400 font-medium">
              <span>Security Stance</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Step 6: Architecture */}
          <div
            onClick={() => navigate('/architecture')}
            className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 hover:border-indigo-500/40 cursor-pointer transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                <span>06. ARCHITECTURE</span>
                <Network className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-sm font-bold text-white mb-1">Coupling &amp; Cycles</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Martin package metrics (Ca, Ce, I, A, D), cyclic dependency graph, smell detection.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-400 font-medium">
              <span>View Graph</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Step 7: Grounded AI */}
          <div
            onClick={() => navigate('/ai')}
            className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 hover:border-indigo-500/40 cursor-pointer transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
                <span>07. GROUNDED AI</span>
                <BotMessageSquare className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-sm font-bold text-white mb-1">Citation-Verified LLM</div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Downstream synthesis citing deterministic evidence chunks. Citations verified.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-400 font-medium">
              <span>AI Insights</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Infrastructure Stance */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">INFRASTRUCTURE</div>
              <div className="text-sm font-bold text-slate-200 mb-1">System Health</div>
              <ul className="text-xs text-slate-400 space-y-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Spring Boot 3.3.x (Java 17)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>PostgreSQL + pgvector ready</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Stateless JWT Auth active</span>
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
              Phase 1-8 Production Ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
