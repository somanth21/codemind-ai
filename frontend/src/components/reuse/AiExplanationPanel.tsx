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
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-lg mt-6" data-testid="ai-explanation-panel">
      {/* Header with Research Invariant Label */}
      <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Grounded AI Reasoning Engine
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
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
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
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
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <div className="text-sm font-medium text-slate-200">
              Selecting Repository Evidence & Grounding LLM Reasoning...
            </div>
            <div className="text-xs text-slate-500 max-w-md">
              Extracting AST symbols, sanitizing source snippets, checking security gates, and validating citations.
            </div>
          </div>
        )}

        {/* Unavailable State (Graceful Fallback) */}
        {isUnavailable && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200 text-xs space-y-2" data-testid="ai-unavailable-state">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>LLM Provider Not Configured (503 Service Unavailable)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Deterministic static analysis, symbol indexing, and reuse scoring remain <strong>100% operational</strong>.
              To enable grounded AI reasoning, set the <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">CODEMIND_LLM_API_KEY</code> environment variable on the server.
            </p>
          </div>
        )}

        {/* Generic Error */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-center gap-2" data-testid="ai-error-state">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Prompt Input when empty or re-asking */}
        {!explanation && !loading && !isUnavailable && (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-4 space-y-3">
            <label className="block text-xs font-medium text-slate-300">
              Optional Developer Focus / Query:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., How would I adapt this candidate to handle asynchronous orders?"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleRequestExplanation}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
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
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/80 px-4 py-2.5 rounded-lg border border-slate-800/80">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 font-mono text-indigo-400">
                  <Cpu className="w-3.5 h-3.5" />
                  {explanation.provider}: {explanation.model}
                </span>
                <span className="flex items-center gap-1 font-mono">
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
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1" data-testid="citation-verified-badge">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified Citations (Citation coverage: {(explanation.citationCoverage * 100).toFixed(0)}% &mdash; {explanation.reasoning?.filter((r) => r.evidenceIds?.length > 0).length || 0}/{explanation.reasoning?.length || 0} claims cite supplied evidence)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Partial Citation Coverage (Citation coverage: {(explanation.citationCoverage * 100).toFixed(0)}% &mdash; {explanation.reasoning?.filter((r) => r.evidenceIds?.length > 0).length || 0}/{explanation.reasoning?.length || 0} claims cite supplied evidence)
                  </span>
                )}

                <button
                  onClick={handleRequestExplanation}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium ml-2"
                >
                  Regenerate
                </button>
              </div>
            </div>

            {/* Context Truncation Alert */}
            {explanation.contextTruncated && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Repository evidence exceeded the context budget ({explanation.contextChars} characters). Only the top-ranked evidence chunks were submitted to the LLM.
                </span>
              </div>
            )}

            {/* Summary & Recommendation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Executive Interpretation
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {explanation.summary}
                </p>
              </div>

              <div className={`border rounded-lg p-4 space-y-2 ${
                explanation.securityGatePreserved
                  ? 'bg-slate-950/70 border-slate-800'
                  : 'bg-rose-950/30 border-rose-500/30'
              }`}>
                <div className="text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span className={explanation.securityGatePreserved ? 'text-indigo-400' : 'text-rose-400'}>
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
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Grounded Evidence Claims ({explanation.reasoning.length})
                </h4>
                <span className="text-[11px] text-slate-500">
                  Click citation badges to inspect source code provenance
                </span>
              </div>

              <div className="space-y-2">
                {explanation.reasoning.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-start justify-between gap-4"
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
                          className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-colors"
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
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 space-y-1.5">
                <div className="text-xs font-semibold text-slate-400">
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-sm text-white font-mono">
                  Evidence [{selectedEvidence.evidenceId}]
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {selectedEvidence.evidenceType}
                </span>
              </div>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-1 text-xs text-slate-400 font-mono">
              <div>File: <span className="text-white">{selectedEvidence.filePath}:{selectedEvidence.startLine}-{selectedEvidence.endLine}</span></div>
              {selectedEvidence.symbolName && (
                <div>Symbol: <span className="text-indigo-400">{selectedEvidence.symbolName}</span></div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 mb-1.5">Sanitized Snippet:</div>
              <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-72">
                {selectedEvidence.sanitizedSnippet}
              </pre>
            </div>

            <div className="text-[11px] text-slate-500">
              Evidence is backed by source-line provenance from repository static analysis. Raw secrets and injection tokens are redacted.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
