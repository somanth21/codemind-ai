import React, { useState, useEffect } from 'react';
import {
  analyzeReuse,
  getReuseAnalyses,
  getReuseAnalysis,
} from '../../api/reuse';
import {
  ReuseAnalysis,
  ReuseDecision,
  SecurityGateStatus,
} from '../../types/reuse';
import { AiExplanationPanel } from './AiExplanationPanel';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Layers,
  ArrowRight,
  FileCode,
  Sparkles,
  GitMerge,
  PlusCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  Target,
  Zap,
  Scale,
  GitFork,
  Activity,
  Code2,
  Cpu,
  RefreshCw,
} from 'lucide-react';

interface ReuseAnalysisViewProps {
  repositoryId: string;
}

export const ReuseAnalysisView: React.FC<ReuseAnalysisViewProps> = ({ repositoryId }) => {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<ReuseAnalysis | null>(null);
  const [history, setHistory] = useState<ReuseAnalysis[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await getReuseAnalyses(repositoryId, 0, 10);
      setHistory(res.content);
      if (res.content.length > 0 && !currentAnalysis) {
        // Load the most recent one with full details
        loadFullAnalysis(res.content[0].id);
      }
    } catch (e: any) {
      console.error('Failed to load reuse history', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadFullAnalysis = async (analysisId: string) => {
    try {
      setLoading(true);
      setError(null);
      const full = await getReuseAnalysis(repositoryId, analysisId);
      setCurrentAnalysis(full);
      if (full.query) {
        setQuery(full.query);
      }
      if (full.candidates && full.candidates.length > 0) {
        setExpandedCandidateId(full.candidates[0].id);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load analysis details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [repositoryId]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const result = await analyzeReuse(repositoryId, { query: query.trim(), limit });
      setCurrentAnalysis(result);
      if (result.candidates && result.candidates.length > 0) {
        setExpandedCandidateId(result.candidates[0].id);
      }
      fetchHistory();
    } catch (e: any) {
      setError(e.message || 'Reuse analysis failed. Ensure static analysis has been completed.');
    } finally {
      setLoading(false);
    }
  };

  const getDecisionBadge = (decision: ReuseDecision) => {
    switch (decision) {
      case 'REUSE_DIRECTLY':
        return {
          label: 'REUSE DIRECTLY',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        };
      case 'REUSE_WITH_ADAPTATION':
        return {
          label: 'REUSE WITH ADAPTATION',
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          icon: <ArrowRight className="w-5 h-5 text-blue-400" />,
        };
      case 'COMPOSE_EXISTING_COMPONENTS':
        return {
          label: 'COMPOSE COMPONENTS',
          color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          icon: <Layers className="w-5 h-5 text-purple-400" />,
        };
      case 'EXTEND_EXISTING_COMPONENT':
        return {
          label: 'EXTEND COMPONENT',
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icon: <GitMerge className="w-5 h-5 text-amber-400" />,
        };
      case 'CREATE_NEW':
      default:
        return {
          label: 'CREATE NEW',
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          icon: <PlusCircle className="w-5 h-5 text-rose-400" />,
        };
    }
  };

  const getSecurityGateBadge = (gate: SecurityGateStatus) => {
    switch (gate) {
      case 'SAFE':
        return {
          label: 'GATE: SAFE',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400 mr-1" />,
        };
      case 'CAUTION':
        return {
          label: 'GATE: CAUTION',
          color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
          icon: <ShieldAlert className="w-4 h-4 text-yellow-400 mr-1" />,
        };
      case 'BLOCKED':
      default:
        return {
          label: 'GATE: BLOCKED',
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          icon: <ShieldAlert className="w-4 h-4 text-rose-400 mr-1" />,
        };
    }
  };

  const quickIntents = [
    'calculate greatest common divisor',
    'hash password digest with SHA-256',
    'parse JSON payload with validation',
    'JWT authentication token filter',
    'database connection pool manager',
  ];

  const handleQuickIntent = async (intent: string) => {
    setQuery(intent);
    try {
      setLoading(true);
      setError(null);
      const result = await analyzeReuse(repositoryId, { query: intent, limit });
      setCurrentAnalysis(result);
      if (result.candidates && result.candidates.length > 0) {
        setExpandedCandidateId(result.candidates[0].id);
      }
      fetchHistory();
    } catch (e: any) {
      setError(e.message || 'Reuse analysis failed. Ensure static analysis has been completed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Query Input Card */}
      <div className="cm-clay-card p-6 relative overflow-hidden">
        {/* Top ambient highlight */}
        <div
          className="absolute top-0 right-0 w-80 h-32 pointer-events-none opacity-20"
          style={{
            background: 'radial-gradient(ellipse at top right, rgba(245, 158, 11, 0.4), transparent 70%)',
          }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
          <div>
            <div className="cm-eyebrow" style={{ marginBottom: '4px', color: '#f59e0b' }}>
              REUSE-FIRST EVALUATION &bull; AST DISCOVERY
            </div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Deterministic Reuse-First Engine
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Evaluates existing repository assets across functional intent, AST structural similarity, maintainability impact, and zero-tolerance security blocker gates before proposing new code.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="cm-tag-pill cm-tag-pill-amber">
              v1.0-deterministic
            </span>
            <span className="cm-tag-pill cm-tag-pill-green flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Zero-Tolerance Gate
            </span>
          </div>
        </div>

        {/* Tactile Search Capsule Form */}
        <form onSubmit={handleAnalyze} className="relative z-10">
          <div
            className="flex flex-col md:flex-row items-stretch md:items-center gap-2 p-1.5 md:p-2 bg-black/60 border border-white/10 rounded-2xl md:rounded-full shadow-inner focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all"
            style={{
              boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.6), 0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div className="flex items-center flex-1 min-w-0 px-3">
              <Search className="w-4 h-4 text-amber-400 shrink-0 mr-2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter intended functionality (e.g. calculate hash digest, parse json payload)..."
                className="w-full bg-transparent border-none py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                disabled={loading}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-200 transition-colors ml-1"
                  title="Clear input"
                >
                  <span className="text-xs font-mono">&times;</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-2 pb-1 md:pb-0">
              <div className="h-5 w-px bg-white/10 hidden md:block shrink-0" />
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="px-3 py-1.5 bg-white/[0.04] border border-white/10 rounded-full text-xs text-slate-300 focus:outline-none focus:border-amber-500/60 cursor-pointer"
                disabled={loading}
                title="Candidate result limit"
              >
                <option value={5} className="bg-slate-900 text-slate-200">Top 5 Candidates</option>
                <option value={10} className="bg-slate-900 text-slate-200">Top 10 Candidates</option>
                <option value={20} className="bg-slate-900 text-slate-200">Top 20 Candidates</option>
              </select>

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="cm-arrow-pill cm-arrow-pill-primary shrink-0"
                style={{
                  padding: '6px 8px 6px 18px',
                  background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                }}
              >
                <span>{loading ? 'Analyzing AST...' : 'Analyze Reuse'}</span>
                <span className="cm-cta-dot" style={{ width: '26px', height: '26px' }}>
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                </span>
              </button>
            </div>
          </div>
        </form>

        {/* Quick Intent Starters */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
          <span className="font-mono text-[11px] text-slate-500 shrink-0 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Quick Intent Starters:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickIntents.map((intent, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickIntent(intent)}
                disabled={loading}
                className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03] text-slate-300 text-[11px] hover:border-amber-500/40 hover:text-amber-300 hover:bg-amber-500/10 transition-all cursor-pointer font-mono"
              >
                + {intent}
              </button>
            ))}
          </div>
        </div>

        {historyLoading && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading recent analyses...
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-[11px] text-slate-500">Recent:</span>
            <div className="flex flex-wrap gap-1.5">
              {history.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => loadFullAnalysis(h.id)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-colors ${
                    currentAnalysis?.id === h.id
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-black/30 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
                  }`}
                >
                  "{h.query.length > 28 ? h.query.slice(0, 28) + '...' : h.query}"
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Main Analysis Display */}
      {currentAnalysis && (
        <div className="space-y-6">
          {/* Decision Summary Card */}
          {(() => {
            const badge = getDecisionBadge(currentAnalysis.decision);
            const gateBadge = getSecurityGateBadge(currentAnalysis.securityStatus);
            return (
              <div className="cm-clay-card p-6 relative overflow-hidden">
                <div
                  className="absolute top-0 right-0 w-96 h-36 pointer-events-none opacity-20"
                  style={{
                    background:
                      currentAnalysis.decision === 'REUSE_DIRECTLY'
                        ? 'radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.4), transparent 70%)'
                        : 'radial-gradient(ellipse at top right, rgba(245, 158, 11, 0.4), transparent 70%)',
                  }}
                />

                {/* Visual Distinction Banner */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <span className="cm-tag-pill cm-tag-pill-amber">
                      DETERMINISTIC ANALYSIS
                    </span>
                    <span className="text-xs text-slate-400">Authoritative Multi-Criteria Decision</span>
                  </div>
                  <span className="cm-tag-pill cm-tag-pill-cyan">
                    AI INTERPRETATION SEPARATED
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
                  <div className="flex items-center gap-4">
                    <div className="cm-icon-tile" style={{ width: '52px', height: '52px', borderRadius: '16px' }}>
                      {badge.icon}
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                        Reuse-First Recommendation
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                        <span className={`px-3.5 py-1.5 rounded-xl text-sm font-bold border shadow-sm ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center shadow-sm ${gateBadge.color}`}>
                          {gateBadge.icon}
                          {gateBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Composite Score</div>
                      <div className="text-2xl font-bold text-white font-mono mt-0.5">
                        {(currentAnalysis.overallScore * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 font-medium">Confidence</div>
                      <div className="text-2xl font-bold text-amber-400 font-mono mt-0.5">
                        {(currentAnalysis.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider font-mono">
                    Architectural Justification:
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed bg-black/40 p-4 rounded-xl border border-white/[0.08]">
                    {currentAnalysis.explanation}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Grounded AI Reasoning Layer */}
          <AiExplanationPanel
            repositoryId={repositoryId}
            reuseAnalysisId={currentAnalysis.id}
          />

          {/* Candidates List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Discovered Candidates ({currentAnalysis.candidates.length})</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">Ranked by deterministic multi-criteria score</span>
            </div>

            {currentAnalysis.candidates.length === 0 ? (
              <div className="cm-clay-card p-10 text-center text-slate-400 text-sm">
                No matching candidate components found. Recommending clean implementation (CREATE_NEW).
              </div>
            ) : (
              currentAnalysis.candidates.map((cand) => {
                const isExpanded = expandedCandidateId === cand.id;
                const candGate = getSecurityGateBadge(cand.securityGate);

                return (
                  <div
                    key={cand.id}
                    className="cm-clay-card transition-all"
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      onClick={() => setExpandedCandidateId(isExpanded ? null : cand.id)}
                      className="p-4 sm:p-5 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="cm-icon-tile" style={{ width: '42px', height: '42px', borderRadius: '12px' }}>
                          <FileCode className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-white text-sm truncate">{cand.symbolName}</span>
                            <span className="cm-tag-pill cm-tag-pill-blue">
                              {cand.symbolKind}
                            </span>
                            <span className="cm-tag-pill cm-tag-pill-amber">
                              {cand.candidateType}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-1">
                            {`${cand.filePath}:${cand.startLine}-${cand.endLine}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 ml-4">
                        <span className={`text-xs px-2.5 py-1 rounded-lg border hidden sm:flex items-center ${candGate.color}`}>
                          {candGate.icon}
                          {candGate.label}
                        </span>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Score</span>
                          <span className="text-sm font-bold text-white font-mono">
                            {(cand.overallScore * 100).toFixed(1)}%
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-3 border-t border-white/[0.08] bg-black/30 space-y-5">
                        {/* Score Breakdown Metrics */}
                        <div>
                          <div className="text-[11px] font-mono font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">
                            Multi-Criteria Score Breakdown
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.08]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Functional Rel.</span>
                                <span className="text-sm font-semibold text-amber-400 font-mono">
                                  {(cand.functionalRelevance * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                  className="h-full bg-amber-400 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, cand.functionalRelevance * 100))}%` }}
                                />
                              </div>
                            </div>
                            <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.08]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Structural Sim.</span>
                                <span className="text-sm font-semibold text-amber-400 font-mono">
                                  {(cand.structuralSimilarity * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                  className="h-full bg-amber-400 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, cand.structuralSimilarity * 100))}%` }}
                                />
                              </div>
                            </div>
                            <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.08]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Maintainability</span>
                                <span className="text-sm font-semibold text-emerald-400 font-mono">
                                  {(cand.maintainabilityScore * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                  className="h-full bg-emerald-400 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, cand.maintainabilityScore * 100))}%` }}
                                />
                              </div>
                            </div>
                            <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.08]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Complexity Pen.</span>
                                <span className="text-sm font-semibold text-orange-400 font-mono">
                                  {(cand.complexityPenalty * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                  className="h-full bg-orange-400 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, cand.complexityPenalty * 100))}%` }}
                                />
                              </div>
                            </div>
                            <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.08]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Security Score</span>
                                <span className="text-sm font-semibold text-emerald-400 font-mono">
                                  {(cand.securityScore * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                  className="h-full bg-emerald-400 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, cand.securityScore * 100))}%` }}
                                />
                              </div>
                            </div>
                            <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.08]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Mod. Effort</span>
                                <span className="text-sm font-semibold text-slate-300 font-mono">
                                  {(cand.modificationEffort * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                  className="h-full bg-slate-400 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, cand.modificationEffort * 100))}%` }}
                                />
                              </div>
                            </div>
                            <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.08]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Dependency Impact</span>
                                <span className="text-sm font-semibold text-slate-300 font-mono">
                                  {(cand.dependencyImpact * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                  className="h-full bg-slate-400 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, cand.dependencyImpact * 100))}%` }}
                                />
                              </div>
                            </div>
                            <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.08]">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Duplication Risk</span>
                                <span className="text-sm font-semibold text-rose-400 font-mono">
                                  {(cand.duplicationRisk * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                                <div
                                  className="h-full bg-rose-400 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, cand.duplicationRisk * 100))}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Signals */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {cand.positiveSignals && cand.positiveSignals.length > 0 && (
                            <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl p-3.5">
                              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Positive Indicators
                              </span>
                              <ul className="space-y-1 text-xs text-emerald-200/90 list-disc list-inside">
                                {cand.positiveSignals.map((sig, i) => (
                                  <li key={i}>{sig}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {cand.negativeSignals && cand.negativeSignals.length > 0 && (
                            <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-3.5">
                              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-2">
                                <AlertTriangle className="w-3.5 h-3.5" /> Caveats & Warnings
                              </span>
                              <ul className="space-y-1 text-xs text-amber-200/90 list-disc list-inside">
                                {cand.negativeSignals.map((sig, i) => (
                                  <li key={i}>{sig}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Evidence & Provenance */}
                        {cand.evidence && cand.evidence.length > 0 && (
                          <div>
                            <span className="text-[11px] font-mono font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
                              Deterministic Evidence & Provenance
                            </span>
                            <div className="space-y-2">
                              {cand.evidence.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="text-xs bg-black/40 p-2.5 rounded-lg border border-white/[0.06] flex items-start justify-between"
                                >
                                  <div>
                                    <span className="font-mono text-amber-400 mr-2">{`[${ev.evidenceType}]`}</span>
                                    <span className="text-slate-300">{ev.description}</span>
                                  </div>
                                  {ev.sourceFile && (
                                    <span className="text-slate-400 font-mono flex-shrink-0 ml-3">
                                      {`${ev.sourceFile}:${ev.startLine}-${ev.endLine}`}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Empty State: Deterministic Architecture & 8-Dimension Evaluation Matrix */}
      {!currentAnalysis && !loading && (
        <div className="space-y-6">
          {/* Decision Pathway Card */}
          <div className="cm-clay-card p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="cm-eyebrow" style={{ color: '#f59e0b', marginBottom: '2px' }}>
                  DECISION PATHWAY
                </div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-amber-400" />
                  Deterministic Decision Hierarchy
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                5-tier automated evaluation outcome
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Before allowing any developer or AI to write new code, CodeMind runs your intended functionality against every indexed AST symbol in the repository. The engine evaluates 8 objective dimensions and assigns one of 5 strict architectural outcomes:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    REUSE DIRECTLY
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Score &ge; 80% with Gate SAFE. Reuses existing symbol as-is without any modifications.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-center">
                  Zero Technical Debt
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/[0.05] relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs mb-1.5">
                    <ArrowRight className="w-3.5 h-3.5" />
                    REUSE WITH ADAPTATION
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Score 60-79%. Wrap or adapt existing component with minor parameter or type conversion.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono text-blue-400/80 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 text-center">
                  Minimal Refactoring
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/[0.05] relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs mb-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    COMPOSE COMPONENTS
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Combine 2+ existing AST symbols in a pipeline instead of introducing a redundant service.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono text-purple-400/80 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 text-center">
                  Pipeline Assembly
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.05] relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-1.5">
                    <GitMerge className="w-3.5 h-3.5" />
                    EXTEND COMPONENT
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Extend existing class or add an overloaded signature to preserve architectural coherence.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-center">
                  Polymorphic Growth
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/[0.05] relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs mb-1.5">
                    <PlusCircle className="w-3.5 h-3.5" />
                    CREATE NEW
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Permitted ONLY when no candidate scores &ge; 50% or if existing candidates are Security-Blocked.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono text-rose-400/80 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 text-center">
                  Gated Greenfield
                </div>
              </div>
            </div>
          </div>

          {/* 8-Dimension Multi-Criteria Evaluation Matrix */}
          <div className="cm-clay-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="cm-eyebrow" style={{ color: '#38bdf8', marginBottom: '2px' }}>
                  EVALUATION MATRIX
                </div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-sky-400" />
                  8-Dimension Multi-Criteria Scoring Model
                </h3>
              </div>
              <span className="cm-tag-pill cm-tag-pill-cyan">
                Pure Mathematical Rigor &bull; Zero Hallucinations
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Every candidate symbol is graded by an authoritative composite formula combining lexical TF-IDF, structural AST tree analysis, maintainability index metrics, and AST-level security scans.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white/[0.02] border border-white/[0.08] hover:border-amber-500/30 rounded-xl p-4 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="cm-icon-tile" style={{ width: '32px', height: '32px' }}>
                    <Target className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    Weight: 25%
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">Functional Intent</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Calculates lexical token match and identifier semantic relevance against query intent.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.08] hover:border-amber-500/30 rounded-xl p-4 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="cm-icon-tile" style={{ width: '32px', height: '32px' }}>
                    <Code2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    Weight: 20%
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">Structural Similarity</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Compares AST parameter types, return signatures, and method arity against target signature.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.08] hover:border-emerald-500/30 rounded-xl p-4 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="cm-icon-tile" style={{ width: '32px', height: '32px' }}>
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    Weight: 15%
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">Maintainability Index</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Halstead volume & cyclomatic density metrics. High maintainability components score highest.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.08] hover:border-orange-500/30 rounded-xl p-4 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="cm-icon-tile" style={{ width: '32px', height: '32px' }}>
                    <Zap className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-[10px] font-mono text-orange-400 font-semibold px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                    Penalty: -10%
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">Complexity Penalty</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Deducts score from symbols with cyclomatic complexity &gt; 15 to prevent inheriting brittle debt.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.08] hover:border-emerald-500/30 rounded-xl p-4 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="cm-icon-tile" style={{ width: '32px', height: '32px' }}>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono text-rose-400 font-semibold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                    BLOCKER GATE
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">Security Audit Gate</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Hard veto: immediately rejects candidates containing hardcoded secrets, SQLi, or CWE vulnerabilities.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.08] hover:border-sky-500/30 rounded-xl p-4 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="cm-icon-tile" style={{ width: '32px', height: '32px' }}>
                    <GitFork className="w-4 h-4 text-sky-400" />
                  </div>
                  <span className="text-[10px] font-mono text-sky-400 font-semibold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                    Weight: 10%
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">Modification Effort</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Estimates lines of code refactoring overhead vs greenfield creation cost.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.08] hover:border-indigo-500/30 rounded-xl p-4 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="cm-icon-tile" style={{ width: '32px', height: '32px' }}>
                    <Cpu className="w-4 h-4 text-indigo-400" />
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                    Weight: 10%
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">Coupling & Blast Radius</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Checks fan-in and fan-out dependency counts to ensure reusing the symbol doesn't trigger cascade issues.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.08] hover:border-rose-500/30 rounded-xl p-4 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="cm-icon-tile" style={{ width: '32px', height: '32px' }}>
                    <RefreshCw className="w-4 h-4 text-rose-400" />
                  </div>
                  <span className="text-[10px] font-mono text-rose-400 font-semibold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                    Weight: 10%
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">Duplication Risk</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Penalizes duplicate symbol sprawl, upholding single source of truth across the repo architecture.
                </p>
              </div>
            </div>
          </div>

          {/* AST Engine Pipeline Workflow */}
          <div className="cm-clay-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="cm-eyebrow" style={{ color: '#10b981', marginBottom: '2px' }}>
                  HOW IT WORKS
                </div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Deterministic Discovery &amp; Grounded AI Pipeline
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                AST-Backed &bull; Provenance Verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[11px] font-mono">1</span>
                  AST Symbol Parsing
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Repository files are parsed into Tree-sitter and JavaParser ASTs, indexing classes, methods, parameters, and signatures.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 mb-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[11px] font-mono">2</span>
                  8-Dimension Mathematical Scoring
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Query intent is matched against the symbol index. Scores and security gates are computed with zero hallucinations.
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[11px] font-mono">3</span>
                  Grounded AI Narrative (Optional)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Downstream LLMs explain the reuse candidate with strict citations [E1], [E2] bound directly to exact file line numbers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

