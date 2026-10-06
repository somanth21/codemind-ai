import React, { useState, useEffect } from 'react';
import { useRepository } from '../context/RepositoryContext';
import { NoRepoSelected } from '../components/common/NoRepoSelected';
import { getAiHistory, explainEvidence } from '../api/ai';
import { AiReasoningResponse } from '../types/ai';
import {
  BotMessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Loader2,
  FileCode,
  Send,
  History,
} from 'lucide-react';

export const AiInsightsPage: React.FC = () => {
  const { selectedRepo } = useRepository();

  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<AiReasoningResponse[]>([]);
  const [currentResult, setCurrentResult] = useState<AiReasoningResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);

  const fetchHistory = async (repoId: string) => {
    try {
      const res = await getAiHistory(repoId, 0, 10);
      setHistory(res.content);
      if (res.content.length > 0 && !currentResult) {
        setCurrentResult(res.content[0]);
      }
    } catch {
      // History fetch may be empty or unconfigured
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      fetchHistory(selectedRepo.id);
    }
  }, [selectedRepo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo || !query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setIsUnavailable(false);
      const res = await explainEvidence(selectedRepo.id, {
        query: query.trim(),
        limit: 8,
      });
      setCurrentResult(res);
      fetchHistory(selectedRepo.id);
    } catch (err: any) {
      if (err.status === 503 || err.message?.includes('not configured') || err.message?.includes('unavailable')) {
        setIsUnavailable(true);
      } else {
        setError(err.message || 'AI explanation generation failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!selectedRepo) {
    return (
      <NoRepoSelected
        moduleName="Grounded AI Reasoning"
        description="Select an ingested repository from the header dropdown to request grounded LLM synthesis strictly backed by deterministic AST symbols and verifiable source citations."
      />
    );
  }

  const selectedEvidence = currentResult?.evidence?.find((e) => e.evidenceId === selectedEvidenceId);

  return (
    <div className="space-y-6" data-testid="ai-insights-page">
      {/* Top Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BotMessageSquare className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Grounded AI Reasoning Layer</h1>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {selectedRepo.name}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
                  Downstream Layer
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Deterministic repository evidence remains authoritative. LLM responses cite verifiable static analysis symbols.
              </p>
            </div>
          </div>
        </div>

        {/* Input Query Bar */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about the repository or requested functionality (e.g. How does error handling work?)..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition shadow"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Grounding...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Synthesize</span>
                </>
              )}
            </button>
          </div>
          <div className="text-[11px] text-slate-500">
            CodeMind AI extracts relevant AST symbols and static evidence before invoking the reasoning model.
          </div>
        </form>
      </div>

      {/* Unavailable State Notice */}
      {isUnavailable && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 text-xs text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>LLM Provider Not Configured (503 Service Unavailable)</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            Deterministic static analysis, symbol indexing, and reuse scoring remain <strong>100% operational</strong>.
            To enable grounded AI synthesis, set the <code className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-mono">CODEMIND_LLM_API_KEY</code> environment variable on the server.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-800/50 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active AI Reasoning Display */}
      {currentResult && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm space-y-5">
          {/* Telemetry Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 font-mono text-indigo-400">
                <Cpu className="h-3.5 w-3.5" />
                {currentResult.provider}: {currentResult.model}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                {currentResult.latencyMs} ms
              </span>
              {currentResult.totalTokens && (
                <span className="font-mono text-slate-400">
                  Tokens: {currentResult.totalTokens}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Citation coverage: {(currentResult.citationCoverage * 100).toFixed(0)}% &mdash; {currentResult.reasoning?.filter((r) => r.evidenceIds?.length > 0).length || 0}/{currentResult.reasoning?.length || 0} claims cite supplied evidence
              </span>
            </div>
          </div>

          {/* Context Truncation Warning */}
          {currentResult.contextTruncated && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Evidence exceeded maximum context budget ({currentResult.contextChars} characters). Only highest-ranked evidence chunks were submitted to the LLM.
              </span>
            </div>
          )}

          {/* Executive Summary & Recommendation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Executive Interpretation
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {currentResult.summary}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
                <span>Recommendation</span>
                <span className="font-mono text-slate-400">
                  Confidence: {(currentResult.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {currentResult.recommendation}
              </p>
            </div>
          </div>

          {/* Grounded Evidence Claims */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Grounded Evidence Claims ({currentResult.reasoning?.length || 0})
              </h4>
              <span className="text-[11px] text-slate-500">
                Click citation badges to view underlying source evidence
              </span>
            </div>

            <div className="space-y-2">
              {currentResult.reasoning?.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 flex items-start justify-between gap-4"
                >
                  <div className="text-xs text-slate-200 leading-relaxed flex-1">
                    <span className="text-slate-500 font-mono mr-2">{idx + 1}.</span>
                    {step.claim}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {step.evidenceIds?.map((evId) => (
                      <button
                        key={evId}
                        onClick={() => setSelectedEvidenceId(evId)}
                        className="rounded px-2 py-0.5 text-[11px] font-mono font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition"
                      >
                        [{evId}]
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Limitations */}
          {currentResult.limitations && currentResult.limitations.length > 0 && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-1.5">
              <div className="text-xs font-semibold text-slate-400">Known Limitations &amp; Caveats:</div>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                {currentResult.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* History List */}
      {history.length > 1 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <History className="h-4 w-4" />
            <span>Reasoning Request History ({history.length})</span>
          </div>

          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => setCurrentResult(item)}
                className={`rounded-lg border p-3 cursor-pointer transition text-xs flex items-center justify-between gap-4 ${
                  currentResult?.id === item.id
                    ? 'border-indigo-500 bg-slate-900 text-white font-medium'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="truncate flex-1">
                  <span className="font-semibold text-slate-200">{item.requestType}</span>: {item.summary}
                </div>
                <div className="flex items-center gap-3 text-slate-500 font-mono shrink-0">
                  <span>{item.latencyMs}ms</span>
                  <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Inspection Modal */}
      {selectedEvidenceId && selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-indigo-400" />
                <span className="font-bold text-sm text-white font-mono">
                  Evidence [{selectedEvidence.evidenceId}]
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {selectedEvidence.evidenceType}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvidenceId(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1"
              >
                &#x2715; Close
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
              Evidence is backed by source-line provenance from repository static analysis.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
