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

  return (
    <div className="space-y-6">
      {/* Header and Input Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Deterministic Reuse-First Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluates existing repository assets across functional, structural, maintainability, and security criteria before proposing new code.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono">
            v1.0-deterministic
          </span>
        </div>

        <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter intended functionality (e.g. calculate hash digest, parse json payload)..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-750 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              disabled={loading}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-2 bg-slate-950 border border-slate-750 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              disabled={loading}
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
            </select>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Analyze Reuse
            </button>
          </div>
        </form>

        {historyLoading && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <Loader2 className="w-3 h-3 animate-spin" /> Loading recent analyses...
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span>Recent:</span>
            <div className="flex flex-wrap gap-1.5">
              {history.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => loadFullAnalysis(h.id)}
                  className={`px-2 py-0.5 rounded border text-[11px] font-mono transition-colors ${
                    currentAnalysis?.id === h.id
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  "{h.query.length > 25 ? h.query.slice(0, 25) + '...' : h.query}"
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-md text-xs text-rose-300 flex items-center gap-2">
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
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                {/* Visual Distinction Banner */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="cm-status-pill cm-status-pill-deterministic">DETERMINISTIC ANALYSIS</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phase 5 Authoritative Decision Logic</span>
                  </div>
                  <span className="cm-status-pill cm-status-pill-ai">AI INTERPRETATION SEPARATED</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    {badge.icon}
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                        Reuse-First Recommendation
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-3 py-1 rounded-md text-sm font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center ${gateBadge.color}`}>
                          {gateBadge.icon}
                          {gateBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <div className="text-xs text-slate-400">Composite Score</div>
                      <div className="text-lg font-bold text-white font-mono">
                        {(currentAnalysis.overallScore * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Confidence</div>
                      <div className="text-lg font-bold text-indigo-400 font-mono">
                        {(currentAnalysis.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs text-slate-400 font-medium mb-1">Architectural Justification:</div>
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
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
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center justify-between">
              <span>Discovered Candidates ({currentAnalysis.candidates.length})</span>
              <span className="text-xs text-slate-500 font-normal">Ranked by deterministic multi-criteria score</span>
            </h3>

            {currentAnalysis.candidates.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-8 text-center text-slate-400 text-sm">
                No matching candidate components found. Recommending clean implementation (CREATE_NEW).
              </div>
            ) : (
              currentAnalysis.candidates.map((cand) => {
                const isExpanded = expandedCandidateId === cand.id;
                const candGate = getSecurityGateBadge(cand.securityGate);

                return (
                  <div
                    key={cand.id}
                    className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden transition-all"
                  >
                    <div
                      onClick={() => setExpandedCandidateId(isExpanded ? null : cand.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-850/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileCode className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{cand.symbolName}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              {cand.symbolKind}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono">
                              {cand.candidateType}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {`${cand.filePath}:${cand.startLine}-${cand.endLine}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`text-xs px-2 py-0.5 rounded border flex items-center ${candGate.color}`}>
                          {candGate.icon}
                          {candGate.label}
                        </span>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Score</span>
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
                      <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/30 space-y-4">
                        {/* Score Breakdown Metrics */}
                        <div>
                          <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                            Multi-Criteria Score Breakdown
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                              <span className="text-xs text-slate-400 block">Functional Rel.</span>
                              <span className="text-sm font-semibold text-indigo-400 font-mono">
                                {(cand.functionalRelevance * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                              <span className="text-xs text-slate-400 block">Structural Sim.</span>
                              <span className="text-sm font-semibold text-indigo-400 font-mono">
                                {(cand.structuralSimilarity * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                              <span className="text-xs text-slate-400 block">Maintainability</span>
                              <span className="text-sm font-semibold text-emerald-400 font-mono">
                                {(cand.maintainabilityScore * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                              <span className="text-xs text-slate-400 block">Complexity Pen.</span>
                              <span className="text-sm font-semibold text-amber-400 font-mono">
                                {(cand.complexityPenalty * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                              <span className="text-xs text-slate-400 block">Security Score</span>
                              <span className="text-sm font-semibold text-emerald-400 font-mono">
                                {(cand.securityScore * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                              <span className="text-xs text-slate-400 block">Mod. Effort</span>
                              <span className="text-sm font-semibold text-slate-300 font-mono">
                                {(cand.modificationEffort * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                              <span className="text-xs text-slate-400 block">Dependency Impact</span>
                              <span className="text-sm font-semibold text-slate-300 font-mono">
                                {(cand.dependencyImpact * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                              <span className="text-xs text-slate-400 block">Duplication Risk</span>
                              <span className="text-sm font-semibold text-rose-400 font-mono">
                                {(cand.duplicationRisk * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Signals */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {cand.positiveSignals && cand.positiveSignals.length > 0 && (
                            <div className="bg-emerald-950/20 border border-emerald-900/30 rounded p-3">
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
                            <div className="bg-amber-950/20 border border-amber-900/30 rounded p-3">
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
                            <span className="text-xs font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
                              Deterministic Evidence & Provenance
                            </span>
                            <div className="space-y-1.5">
                              {cand.evidence.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="text-xs bg-slate-900 p-2 rounded border border-slate-850 flex items-start justify-between"
                                >
                                  <div>
                                    <span className="font-mono text-indigo-400 mr-2">{`[${ev.evidenceType}]`}</span>
                                    <span className="text-slate-300">{ev.description}</span>
                                  </div>
                                  {ev.sourceFile && (
                                    <span className="text-slate-500 font-mono flex-shrink-0 ml-3">
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
    </div>
  );
};
