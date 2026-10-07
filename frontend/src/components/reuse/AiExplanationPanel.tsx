import React, { useState } from 'react';
import { explainReuse } from '../../api/ai';
import { AiReasoningResponse } from '../../types/ai';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  FileCode,
  Loader2,
} from 'lucide-react';

interface AiExplanationPanelProps {
  repositoryId: string;
  reuseAnalysisId: string;
  candidateId?: string;
  initialExplanation?: AiReasoningResponse | null;
}

export const AiExplanationPanel: React.FC<AiExplanationPanelProps> = ({
  repositoryId,
  reuseAnalysisId,
  candidateId,
  initialExplanation = null,
}) => {
  const [explanation, setExplanation] = useState<AiReasoningResponse | null>(initialExplanation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [question, setQuestion] = useState('');
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  const handleRequestExplanation = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnavailable(false);
      const res = await explainReuse(repositoryId, {
        reuseAnalysisId,
        candidateId,
        developerQuestion: question.trim() || undefined,
      });
      setExplanation(res);
    } catch (err: any) {
      if (err.status === 503 || err.message?.includes('not configured') || err.message?.includes('unavailable')) {
        setIsUnavailable(true);
      } else {
        setError(err.message || 'Failed to generate AI explanation.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedEvidence = explanation?.evidence?.find(e => e.evidenceId === selectedEvidenceId);

  return (
    <div className="feature-content-card mt-6" data-testid="ai-explanation-panel">
      {/* Header with Research Invariant Label */}
      <div className="bg-black/40 px-5 py-4 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Grounded AI Reasoning Engine
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase tracking-wider font-mono">
                Downstream Layer
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              LLM reasoning strictly bounded by deterministic repository evidence. Authoritative truth remains static analysis.
            </p>
          </div>
        </div>

        {!explanation && !loading && (
          <button
            onClick={handleRequestExplanation}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-orange-950/40 cursor-pointer"
            data-testid="request-ai-explanation-btn"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Grounded Explanation</span>
          </button>
        )}
      </div>

      {/* Body Content */}
      <div className="p-5 space-y-5">
        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3" data-testid="ai-loading-state">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <div className="text-sm font-medium text-slate-200">
              Selecting Repository Evidence & Grounding LLM Reasoning...
            </div>
            <div className="text-xs text-slate-400 max-w-md">
              Extracting AST symbols, sanitizing source snippets, checking security gates, and validating citations.
            </div>
          </div>
        )}

        {/* Unavailable State (Graceful Fallback) */}
        {isUnavailable && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-xs space-y-2" data-testid="ai-unavailable-state">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>LLM Provider Not Configured (503 Service Unavailable)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Deterministic static analysis, symbol indexing, and reuse scoring remain <strong>100% operational</strong>.
              To enable grounded AI reasoning, set the <code className="px-1.5 py-0.5 rounded bg-black/50 text-amber-300 font-mono border border-white/10">CODEMIND_LLM_API_KEY</code> environment variable on the server.
            </p>
          </div>
        )}

        {/* Generic Error */}
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2" data-testid="ai-error-state">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Prompt Input when empty or re-asking */}
        {!explanation && !loading && !isUnavailable && (
          <div className="bg-black/30 border border-white/[0.08] rounded-xl p-4 space-y-3">
            <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider">
              Optional Developer Focus / Query:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., How would I adapt this candidate to handle asynchronous orders?"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
              />
              <button
                onClick={handleRequestExplanation}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Explain</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-500">
              CodeMind AI will select the highest-scoring candidate evidence and generate an explanation backed by verifiable line citations.
            </div>
          </div>
        )}

        {/* Active Grounded Explanation Display */}
        {explanation && !loading && (
          <div className="space-y-5" data-testid="ai-explanation-content">
            {/* Telemetry Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-black/40 px-4 py-3 rounded-xl border border-white/[0.08]">
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1 font-mono text-amber-400">
                  <Cpu className="w-3.5 h-3.5" />
                  {explanation.provider}: {explanation.model}
                </span>
                <span className="flex items-center gap-1 font-mono text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {explanation.latencyMs} ms
                </span>
                {explanation.totalTokens && (
                  <span className="font-mono text-slate-400">
                    Tokens: {explanation.totalTokens}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {explanation.grounded ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1" data-testid="citation-verified-badge">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified Citations (Citation coverage: {(explanation.citationCoverage * 100).toFixed(0)}% &mdash; {explanation.reasoning?.filter((r) => r.evidenceIds?.length > 0).length || 0}/{explanation.reasoning?.length || 0} claims cite supplied evidence)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Partial Citation Coverage (Citation coverage: {(explanation.citationCoverage * 100).toFixed(0)}% &mdash; {explanation.reasoning?.filter((r) => r.evidenceIds?.length > 0).length || 0}/{explanation.reasoning?.length || 0} claims cite supplied evidence)
                  </span>
                )}

                <button
                  onClick={handleRequestExplanation}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium ml-2 cursor-pointer"
                >
                  Regenerate
                </button>
              </div>
            </div>

            {/* Context Truncation Alert */}
            {explanation.contextTruncated && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Repository evidence exceeded the context budget ({explanation.contextChars} characters). Only the top-ranked evidence chunks were submitted to the LLM.
                </span>
              </div>
            )}

            {/* Summary & Recommendation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/40 border border-white/[0.08] rounded-xl p-4 space-y-2">
                <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                  Executive Interpretation
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {explanation.summary}
                </p>
              </div>

              <div className={`border rounded-xl p-4 space-y-2 ${
                explanation.securityGatePreserved
                  ? 'bg-black/40 border-white/[0.08]'
                  : 'bg-rose-950/20 border-rose-500/30'
              }`}>
                <div className="text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span className={explanation.securityGatePreserved ? 'text-amber-400' : 'text-rose-400'}>
                    Architectural Recommendation
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Confidence: {(explanation.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {explanation.recommendation}
                </p>
              </div>
            </div>

            {/* Reasoning Claims with Citations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Grounded Evidence Claims ({explanation.reasoning.length})
                </h4>
                <span className="text-[11px] font-mono text-slate-500">
                  Click citation badges to inspect source code provenance
                </span>
              </div>

              <div className="space-y-2.5">
                {explanation.reasoning.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-black/30 border border-white/[0.08] rounded-xl flex items-start justify-between gap-4"
                  >
                    <div className="text-xs text-slate-200 leading-relaxed flex-1">
                      <span className="text-slate-500 font-mono mr-2">{idx + 1}.</span>
                      {step.claim}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {step.evidenceIds.map((evId) => (
                        <button
                          key={evId}
                          onClick={() => {
                            setSelectedEvidenceId(evId);
                            setShowEvidenceModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                          title="Click to view underlying source evidence"
                        >
                          [{evId}]
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Limitations & Caveats */}
            {explanation.limitations && explanation.limitations.length > 0 && (
              <div className="bg-black/20 border border-white/[0.08] rounded-xl p-3.5 space-y-1.5">
                <div className="text-xs font-mono font-semibold text-slate-400">
                  Known Limitations & Caveats:
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                  {explanation.limitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Evidence Inspection Modal / Drawer */}
      {showEvidenceModal && selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="feature-content-card max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm text-white font-mono">
                  Evidence [{selectedEvidence.evidenceId}]
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded bg-white/[0.06] text-slate-300 font-mono border border-white/10">
                  {selectedEvidence.evidenceType}
                </span>
              </div>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-1 text-xs text-slate-400 font-mono">
              <div>File: <span className="text-white">{selectedEvidence.filePath}:{selectedEvidence.startLine}-{selectedEvidence.endLine}</span></div>
              {selectedEvidence.symbolName && (
                <div>Symbol: <span className="text-amber-400">{selectedEvidence.symbolName}</span></div>
              )}
            </div>

            <div>
              <div className="text-[11px] font-mono font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Sanitized Snippet:</div>
              <pre className="bg-black/60 p-4 rounded-xl border border-white/10 text-xs font-mono text-slate-200 overflow-x-auto max-h-72 leading-relaxed">
                {selectedEvidence.sanitizedSnippet}
              </pre>
            </div>

            <div className="text-[11px] font-mono text-slate-500">
              Evidence is backed by source-line provenance from repository static analysis. Raw secrets and injection tokens are redacted.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

