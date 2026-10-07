import React, { useState, useEffect } from 'react';
import { useRepository } from '../context/RepositoryContext';
import { NoRepoSelected } from '../components/common/NoRepoSelected';
import { getAiHistory, explainEvidence } from '../api/ai';
import { AiReasoningResponse, EvidenceItem } from '../types/ai';
import {
  AlertTriangle,
  Clock,
  Loader2,
  FileCode,
  Send,
  History,
  Sparkles,
  ShieldCheck,
  Code2,
  Brain,
  HelpCircle,
} from 'lucide-react';

export const AiInsightsPage: React.FC = () => {
  const { selectedRepo } = useRepository();

  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<AiReasoningResponse[]>([]);
  const [currentResult, setCurrentResult] = useState<AiReasoningResponse | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  const examplePrompts = [
    'Where is authentication handled?',
    'Which classes are most complex?',
    'Can I reuse an existing implementation for payment processing?',
    'What are the biggest architecture risks?',
    'Which security findings should I investigate first?',
  ];

  const fetchHistory = async (repoId: string) => {
    try {
      const res = await getAiHistory(repoId, 0, 10);
      setHistory(res.content);
      if (res.content.length > 0 && !currentResult) {
        setCurrentResult(res.content[0]);
        setActiveQuestion(res.content[0].summary || 'Analysis Synthesis');
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

  const runQuery = async (queryText: string) => {
    if (!selectedRepo || !queryText.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setIsUnavailable(false);
      setActiveQuestion(queryText.trim());

      const res = await explainEvidence(selectedRepo.id, {
        query: queryText.trim(),
        limit: 8,
      });
      setCurrentResult(res);
      fetchHistory(selectedRepo.id);
    } catch (err: any) {
      if (
        err.status === 503 ||
        err.message?.includes('not configured') ||
        err.message?.includes('unavailable')
      ) {
        setIsUnavailable(true);
      } else {
        setError(err.message || 'AI explanation generation failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    runQuery(query);
  };

  const handleSelectExample = (prompt: string) => {
    setQuery(prompt);
  };

  if (!selectedRepo) {
    return (
      <NoRepoSelected
        moduleName="Grounded AI Reasoning"
        description="Select an ingested repository from the header dropdown to request grounded LLM synthesis strictly backed by deterministic AST symbols and verifiable source citations."
      />
    );
  }

  const isGrounded = currentResult ? currentResult.grounded && currentResult.citationCoverage >= 0.8 : false;

  return (
    <div className="analysis-report-container relative" data-testid="ai-insights-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="cm-ambient-glow" style={{ top: -60, left: 100, opacity: 0.6 }} />
      <div className="cm-ambient-glow-teal" style={{ top: 120, right: 60, opacity: 0.4 }} />

      {/* ============ HEADER ============ */}
      <header className="cm-clay-card p-6 relative overflow-hidden" style={{ borderRadius: '20px' }}>
        <div className="analysis-header-context mb-3">
          <span>CodeMind AI</span>
          <span>/</span>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>{selectedRepo.name}</span>
          <span style={{ opacity: 0.4 }}>&bull;</span>
          <span className="cm-tag-pill cyan">Grounded Reasoning Layer</span>
        </div>

        <div className="analysis-header-main">
          <div className="analysis-title-group">
            <div className="cm-eyebrow mb-2">INTELLIGENT REASONING</div>
            <h1 className="text-2xl font-bold tracking-tight text-white m-0">GROUNDED AI</h1>
            <p style={{ margin: '6px 0 8px 0', fontSize: '0.9rem', color: 'var(--ref-ink-soft)' }}>
              Ask questions about your repository using verified engineering evidence.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>
              <span>Deterministic repository evidence</span>
              <span style={{ color: 'var(--ref-mute)' }}>&rarr;</span>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>AI interpretation</span>
            </div>
          </div>
        </div>

        {/* Query Input Bar */}
        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                flex: 1,
                minWidth: '280px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(7, 10, 18, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '999px',
                padding: '0 18px',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)',
              }}
            >
              <HelpCircle size={18} style={{ color: 'var(--ref-mute)', marginRight: '10px', flexShrink: 0 }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask about this repository (e.g. Where is authentication handled?)..."
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  outline: 'none',
                  padding: '14px 0',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="cm-arrow-pill"
              style={{ padding: '0 24px', fontSize: '0.85rem' }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Grounding...</span>
                </>
              ) : (
                <>
                  <span className="cm-cta-dot" style={{ backgroundColor: '#06b6d4' }} />
                  <span>Ask CodeMind</span>
                  <span className="ref-ar">
                    <Send size={12} />
                  </span>
                </>
              )}
            </button>
          </div>
        </form>

        {history.length > 0 && (
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--ref-mute)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <History size={12} />
              <span>Recent:</span>
            </span>
            {history.slice(0, 4).map((h, i) => (
              <button
                key={h.id || i}
                type="button"
                onClick={() => {
                  setCurrentResult(h);
                  setActiveQuestion(h.summary || 'Previous Inquiry');
                }}
                className="cm-tag-pill blue"
                style={{
                  cursor: 'pointer',
                  maxWidth: '220px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={h.summary || 'Inquiry'}
              >
                {h.summary || 'Inquiry'}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Unavailable State Notice */}
      {isUnavailable && (
        <div style={{ padding: '16px 20px', borderRadius: '12px', backgroundColor: 'rgba(245, 139, 78, 0.08)', border: '1px solid rgba(245, 139, 78, 0.25)', color: '#fed7aa', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--ref-orange-3)', marginBottom: '4px' }}>
            <AlertTriangle size={16} />
            <span>LLM Provider Not Configured (503 Service Unavailable)</span>
          </div>
          <p style={{ margin: 0, lineHeight: 1.5, color: '#fcd34d' }}>
            Deterministic static analysis, symbol indexing, and architecture calculations remain 100% operational.
            To enable Grounded AI synthesis, set the <code>CODEMIND_LLM_API_KEY</code> environment variable on the server.
          </p>
        </div>
      )}

      {error && (
        <div style={{ padding: '14px 18px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ============ EMPTY STATE (When no question asked yet) ============ */}
      {!currentResult && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Welcome Card */}
          <div className="cm-clay-card text-center" style={{ padding: '36px 32px' }}>
            <div className="cm-icon-tile mx-auto mb-4" style={{ width: '48px', height: '48px', background: 'rgba(232, 90, 43, 0.15)', color: '#f97316' }}>
              <Sparkles size={24} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0' }}>
              Grounded Repository Intelligence
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--ref-ink-soft)', maxWidth: '560px', margin: '0 auto 24px', lineHeight: 1.6 }}>
              Unlike generic chatbots, Grounded AI extracts deterministic AST symbols, complexity metrics, and quality findings from your repository before answering. Every claim must cite verified evidence.
            </p>

            {/* Prompt Starters */}
            <div style={{ textAlign: 'left', maxWidth: '680px', margin: '0 auto' }}>
              <div className="cm-eyebrow mb-2">
                Example Questions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {examplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSelectExample(prompt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(7, 10, 18, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                    className="finding-row"
                  >
                    <span>{prompt}</span>
                    <span style={{ color: 'var(--ref-orange-3)', fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}>Use prompt &rarr;</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI vs Deterministic Architectural Invariant */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            <div className="cm-clay-card" style={{ padding: '20px', borderColor: 'rgba(56, 189, 248, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>
                <Code2 size={16} />
                <span>DETERMINISTIC EVIDENCE</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--ref-mute)', margin: 0, lineHeight: 1.5 }}>
                Authoritative ground truth: AST symbol declarations, McCabe cyclomatic complexity, Halstead maintainability scores, and static rule audits.
              </p>
            </div>

            <div className="cm-clay-card" style={{ padding: '20px', borderColor: 'rgba(232, 90, 43, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e85a2b', fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>
                <Brain size={16} />
                <span>AI INTERPRETATION</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--ref-mute)', margin: 0, lineHeight: 1.5 }}>
                Downstream reasoning: natural-language explanation, architectural implications, and remediation guidance strictly citing deterministic facts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ ANSWER LAYOUT (When a question is answered) ============ */}
      {currentResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 1. User Question Card */}
          <div className="cm-clay-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="cm-eyebrow mb-1">
                User Question
              </span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: '4px 0 0 0' }}>
                &ldquo;{activeQuestion || query || 'Repository Analysis'}&rdquo;
              </h3>
            </div>

            {/* Grounding Status Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className={isGrounded ? 'cm-tag-pill green font-mono' : 'cm-tag-pill amber font-mono'}
              >
                <ShieldCheck size={13} />
                <span>{isGrounded ? 'GROUNDED' : 'PARTIALLY GROUNDED'}</span>
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>
                {(currentResult.citationCoverage * 100).toFixed(0)}% Citation Coverage
              </span>
            </div>
          </div>

          {/* 2. AI Interpretation Section */}
          <div className="cm-clay-card" style={{ padding: '24px', borderColor: 'rgba(232, 90, 43, 0.3)', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={18} style={{ color: '#e85a2b' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  AI INTERPRETATION
                </h3>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                <span>{currentResult.latencyMs}ms response time</span>
              </span>
            </div>

            {/* Executive Synthesis */}
            <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              {currentResult.summary}
            </p>

            {/* Recommendation */}
            {currentResult.recommendation && (
              <div style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: 'rgba(7, 10, 18, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ref-orange-3)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                  Recommendation
                </div>
                <div style={{ fontSize: '0.84rem', color: '#ffffff', lineHeight: 1.5 }}>
                  {currentResult.recommendation}
                </div>
              </div>
            )}

            {/* Grounded Claims with Clickable Citations */}
            {currentResult.reasoning && currentResult.reasoning.length > 0 && (
              <div>
                <div className="cm-eyebrow mb-2">
                  Grounded Evidence Claims ({currentResult.reasoning.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {currentResult.reasoning.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(7, 10, 18, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', color: '#ffffff', lineHeight: 1.5, flex: 1, minWidth: '240px' }}>
                        <span style={{ color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)', marginRight: '8px' }}>
                          {idx + 1}.
                        </span>
                        {step.claim}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {step.evidenceIds?.map((evId) => {
                          const evItem = currentResult.evidence?.find((e) => e.evidenceId === evId);
                          return (
                            <button
                              key={evId}
                              type="button"
                              onClick={() => setSelectedEvidence(evItem || null)}
                              className="cm-tag-pill amber font-mono cursor-pointer"
                              title="Click to view verified source evidence"
                            >
                              [{evId}]
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. VERIFIED REPOSITORY EVIDENCE (Very Clearly Separated) */}
          <div className="cm-clay-card" style={{ padding: '24px', borderColor: 'rgba(56, 189, 248, 0.3)', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', marginBottom: '4px' }}>
                  <Code2 size={18} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                    VERIFIED REPOSITORY EVIDENCE
                  </h3>
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--ref-mute)', margin: 0 }}>
                  Actual codebase artifacts retrieved from deterministic static analysis and cited by the reasoning layer.
                </p>
              </div>

              <span className="cm-tag-pill cyan font-mono">
                {currentResult.evidence?.length || 0} Provenance Records
              </span>
            </div>

            {/* Evidence Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {(currentResult.evidence || []).map((ev) => (
                <div
                  key={ev.evidenceId}
                  onClick={() => setSelectedEvidence(ev)}
                  className="cm-clay-card finding-row"
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                  title="Click to inspect source lines"
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="cm-tag-pill cyan font-mono">
                        [{ev.evidenceId}] {ev.evidenceType}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>
                        Lines {ev.startLine}–{ev.endLine}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                      {ev.symbolName || ev.filePath.split('/').pop()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {ev.filePath}
                    </div>
                  </div>

                  {ev.sanitizedSnippet && (
                    <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'rgba(7, 10, 18, 0.9)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.sanitizedSnippet.split('\n')[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4. WHY THIS MATTERS */}
          <div className="cm-clay-card" style={{ padding: '20px 22px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', margin: '0 0 6px 0' }}>
              Why This Matters
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--ref-ink-soft)', margin: 0, lineHeight: 1.6 }}>
              Engineering decisions grounded in verifiable static analysis eliminate hallucinated architecture advice. By mapping claims directly to AST symbols, lines of code, and coupling metrics, CodeMind ensures that every recommendation is executable against your real repository.
            </p>
          </div>
        </div>
      )}

      {/* ============ EVIDENCE MODAL ============ */}
      {selectedEvidence && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="cm-clay-card" style={{ width: 'min(640px, 94vw)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(7, 10, 18, 0.85)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode size={16} style={{ color: 'var(--accent-blue)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  Evidence [{selectedEvidence.evidenceId}] &mdash; {selectedEvidence.evidenceType}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvidence(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ref-mute)', cursor: 'pointer', padding: '4px' }}
              >
                &#x2715;
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--ref-mute)' }}>
                File: <strong style={{ color: '#ffffff' }}>{selectedEvidence.filePath}:{selectedEvidence.startLine}&ndash;{selectedEvidence.endLine}</strong>
                {selectedEvidence.symbolName && (
                  <div>Symbol: <span style={{ color: 'var(--ref-orange-3)' }}>{selectedEvidence.symbolName}</span></div>
                )}
              </div>

              <div className="code-snippet-box">
                <div className="code-snippet-header">
                  <span>Source Code Evidence</span>
                  <span>Lines {selectedEvidence.startLine}&ndash;{selectedEvidence.endLine}</span>
                </div>
                <div className="code-snippet-content">
                  {(selectedEvidence.sanitizedSnippet || '// No code snippet attached')
                    .split('\n')
                    .map((line, idx) => (
                      <div key={idx} className="code-snippet-line">
                        <span className="code-snippet-linenum">{selectedEvidence.startLine + idx}</span>
                        <span className="code-snippet-text">{line || ' '}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiInsightsPage;
