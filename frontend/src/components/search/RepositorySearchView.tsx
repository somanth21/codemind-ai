import React, { useState, useEffect, useMemo } from 'react';
import { getAnalysisRuns, getSymbols } from '../../api/analysis';
import { AnalysisRun, SymbolItem } from '../../types/analysis';
import {
  Search,
  SlidersHorizontal,
  FileCode,
} from 'lucide-react';

interface RepositorySearchViewProps {
  repositoryId: string;
  repositoryName?: string;
}

export type SearchMode = 'HYBRID' | 'LEXICAL' | 'SEMANTIC';

interface ScoredSymbol {
  symbol: SymbolItem;
  lexicalScore: number;
  lexicalRank: number;
  semanticScore: number;
  semanticRank: number;
  rrfScore: number;
}

export const RepositorySearchView: React.FC<RepositorySearchViewProps> = ({
  repositoryId,
  repositoryName,
}) => {
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [query, setQuery] = useState<string>('');
  const [searchMode, setSearchMode] = useState<SearchMode>('HYBRID');
  const [kindFilter, setKindFilter] = useState<string>('');

  const loadSymbolsForRun = async (repoId: string, runId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSymbols(repoId, runId, 0, 100);
      setSymbols(res.content);
    } catch (err: any) {
      setError(err?.message || 'Failed to load symbol index');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getAnalysisRuns(repositoryId, 0, 10);
        if (!isMounted) return;
        setRuns(res.content);
        if (res.content.length > 0) {
          const latest = res.content[0];
          setSelectedRunId(latest.id);
          const symRes = await getSymbols(repositoryId, latest.id, 0, 100);
          if (isMounted) {
            setSymbols(symRes.content);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to fetch analysis runs for repository');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    init();

    return () => {
      isMounted = false;
    };
  }, [repositoryId]);

  const handleRunChange = async (runId: string) => {
    setSelectedRunId(runId);
    await loadSymbolsForRun(repositoryId, runId);
  };

  // Reciprocal Rank Fusion (RRF) Calculation
  const filteredSymbols = useMemo(() => {
    const k = 60; // Standard RRF smoothing constant

    // Filter by kind first if specified
    const pool = kindFilter
      ? symbols.filter((s) => s.kind.toUpperCase() === kindFilter.toUpperCase())
      : symbols;

    if (!query.trim()) {
      return pool.map((s) => ({
        symbol: s,
        lexicalScore: 1.0,
        lexicalRank: 1,
        semanticScore: 1.0,
        semanticRank: 1,
        rrfScore: 1.0,
      }));
    }

    const qLower = query.toLowerCase();

    // 1. Lexical Scoring (Token match in name, docstring, signature, fqn)
    const lexicalRanked = pool
      .map((s) => {
        let score = 0;
        const nameLower = (s.name || '').toLowerCase();
        const fqnLower = (s.fqn || '').toLowerCase();
        const docLower = (s.docstring || '').toLowerCase();
        const sigLower = (s.signature || '').toLowerCase();

        if (nameLower === qLower) score += 10.0;
        else if (nameLower.startsWith(qLower)) score += 6.0;
        else if (nameLower.includes(qLower)) score += 4.0;

        if (fqnLower.includes(qLower)) score += 3.0;
        if (sigLower.includes(qLower)) score += 2.0;
        if (docLower.includes(qLower)) score += 1.0;

        return { symbol: s, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const lexicalMap = new Map<string, { rank: number; score: number }>();
    lexicalRanked.forEach((item, index) => {
      lexicalMap.set(item.symbol.id, { rank: index + 1, score: item.score });
    });

    // 2. Semantic/Signature Scoring (Simulated cosine structural similarity)
    const semanticRanked = pool
      .map((s) => {
        let score = 0;
        const qWords = qLower.split(/\s+/).filter(Boolean);
        const textToMatch = `${s.name} ${s.kind} ${s.signature || ''} ${s.docstring || ''}`.toLowerCase();

        let matchedWords = 0;
        qWords.forEach((w) => {
          if (textToMatch.includes(w)) matchedWords++;
        });

        if (matchedWords > 0) {
          score = (matchedWords / qWords.length) * 0.9;
          if (s.docstring && s.docstring.toLowerCase().includes(qLower)) {
            score += 0.1;
          }
        }

        return { symbol: s, score: Math.min(score, 1.0) };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const semanticMap = new Map<string, { rank: number; score: number }>();
    semanticRanked.forEach((item, index) => {
      semanticMap.set(item.symbol.id, { rank: index + 1, score: item.score });
    });

    // 3. Reciprocal Rank Fusion
    const combinedMap = new Map<string, SymbolItem>();
    lexicalRanked.forEach((i) => combinedMap.set(i.symbol.id, i.symbol));
    semanticRanked.forEach((i) => combinedMap.set(i.symbol.id, i.symbol));

    const combined: ScoredSymbol[] = Array.from(combinedMap.values()).map((s) => {
      const lex = lexicalMap.get(s.id);
      const sem = semanticMap.get(s.id);

      const lRank = lex ? lex.rank : 9999;
      const sRank = sem ? sem.rank : 9999;

      const rrf = (lex ? 1 / (k + lRank) : 0) + (sem ? 1 / (k + sRank) : 0);

      return {
        symbol: s,
        lexicalScore: lex ? lex.score : 0,
        lexicalRank: lRank,
        semanticScore: sem ? sem.score : 0,
        semanticRank: sRank,
        rrfScore: rrf,
      };
    });

    // Sort according to active searchMode
    if (searchMode === 'HYBRID') {
      combined.sort((a, b) => b.rrfScore - a.rrfScore);
    } else if (searchMode === 'LEXICAL') {
      combined.sort((a, b) => b.lexicalScore - a.lexicalScore || a.lexicalRank - b.lexicalRank);
    } else {
      combined.sort((a, b) => b.semanticScore - a.semanticScore || a.semanticRank - b.semanticRank);
    }

    return combined.filter((item) => {
      if (searchMode === 'HYBRID') return item.lexicalScore > 0 || item.semanticScore > 0;
      if (searchMode === 'LEXICAL') return item.lexicalScore > 0;
      return item.semanticScore > 0;
    });
  }, [symbols, query, kindFilter, searchMode]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }} data-testid="repository-search-view">
      {/* ============ CONSISTENT PAGE HEADER ============ */}
      <div style={{ marginBottom: '28px' }}>
        {/* Repo context indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)', marginBottom: '14px' }}>
          <span>CodeMind AI</span>
          <span>/</span>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>{repositoryName || 'Active Repository'}</span>
          <span style={{ margin: '0 4px', opacity: 0.3 }}>&bull;</span>
          <span className="cm-tag-pill cyan font-mono">
            Deterministic Index
          </span>
        </div>

        <div className="cm-eyebrow mb-2">
          CODE SEARCH WORKSPACE &bull; HYBRID RETRIEVAL
        </div>

        <h1 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff', margin: '0 0 8px 0' }}>
          SEARCH &mdash; Hybrid Repository Search
        </h1>
        <p style={{ fontSize: '0.92rem', color: 'var(--ref-ink-soft)', margin: 0, maxWidth: '720px', lineHeight: 1.5 }}>
          Find implementations across your repository. Reciprocal Rank Fusion (RRF) combines lexical tokens and AST symbol evidence with exact source-line provenance.
        </p>
      </div>

      {/* ============ LARGE PROFESSIONAL SEARCH INPUT & CONTROLS ============ */}
      <div
        className="cm-clay-card"
        style={{
          padding: '20px 24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}
          {/* Main search bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={18} style={{ position: 'absolute', left: '18px', color: 'var(--ref-orange-3)', pointerEvents: 'none' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbols, methods, files, signatures (e.g. OrderService, calculateDiscount, processPayment)..."
              data-testid="search-input"
              style={{
                width: '100%',
                padding: '14px 110px 14px 50px',
                fontSize: '0.95rem',
                backgroundColor: 'rgba(7, 10, 18, 0.8)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '999px',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.4)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--ref-orange-3)';
                e.target.style.boxShadow = '0 0 0 3px rgba(232, 90, 43, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.4)';
              }}
            />
            <div style={{ position: 'absolute', right: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{ background: 'none', border: 'none', color: 'var(--ref-mute)', fontSize: '0.75rem', cursor: 'pointer', padding: '2px 6px' }}
                >
                  Clear
                </button>
              )}
              <span
                style={{
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--ref-mute)',
                  padding: '3px 7px',
                  borderRadius: '5px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                ⌘K
              </span>
            </div>
          </div>

          {/* Search Controls Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
            {/* Search Mode Pill Group */}
            <div className="cm-pill-nav" style={{ padding: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)', padding: '0 8px', textTransform: 'uppercase' }}>
                Mode:
              </span>
              <button
                type="button"
                onClick={() => setSearchMode('HYBRID')}
                className={`cm-pill-tab ${searchMode === 'HYBRID' ? 'active' : ''}`}
              >
                Hybrid (RRF)
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('LEXICAL')}
                className={`cm-pill-tab ${searchMode === 'LEXICAL' ? 'active' : ''}`}
              >
                Lexical
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('SEMANTIC')}
                className={`cm-pill-tab ${searchMode === 'SEMANTIC' ? 'active' : ''}`}
              >
                Semantic
              </button>
            </div>

            {/* Filters & Run selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <SlidersHorizontal size={13} style={{ color: 'var(--ref-mute)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>Kind:</span>
                <select
                  value={kindFilter}
                  onChange={(e) => setKindFilter(e.target.value)}
                  aria-label="Filter Symbol Kind"
                  className="bg-slate-900/80 border border-white/10 rounded-lg text-white font-mono"
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All Symbol Kinds</option>
                  <option value="CLASS">Class</option>
                  <option value="INTERFACE">Interface</option>
                  <option value="METHOD">Method</option>
                  <option value="CONSTRUCTOR">Constructor</option>
                  <option value="ENUM">Enum</option>
                  <option value="RECORD">Record</option>
                  <option value="FIELD">Field</option>
                </select>
              </div>

              {runs.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>Snapshot:</span>
                  <select
                    value={selectedRunId || ''}
                    onChange={(e) => handleRunChange(e.target.value)}
                    aria-label="Select Index Snapshot"
                    className="bg-slate-900/80 border border-white/10 rounded-lg text-white font-mono"
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    {runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {new Date(r.startedAt).toLocaleTimeString()} ({r.totalClasses}C / {r.totalMethods}M)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ RESULTS SECTION ============ */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', fontSize: '0.78rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>
          <span>
            Showing <strong style={{ color: '#ffffff' }}>{filteredSymbols.length}</strong> symbol {filteredSymbols.length === 1 ? 'match' : 'matches'}
          </span>
          <span>
            {searchMode === 'HYBRID' ? 'Ranked via Reciprocal Rank Fusion' : searchMode === 'LEXICAL' ? 'Ranked via Token Match' : 'Ranked via AST Signature'}
          </span>
        </div>

        {loading ? (
          /* Sleek Skeleton Loading State */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  backgroundColor: '#0d1220',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  animation: 'pulse 1.8s infinite',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ width: '60px', height: '18px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
                  <div style={{ width: '180px', height: '18px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '4px' }} />
                </div>
                <div style={{ width: '280px', height: '14px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        ) : filteredSymbols.length === 0 ? (
          /* Empty Search State */
          <div
            className="cm-clay-card text-center"
            style={{
              padding: '60px 24px',
            }}
          >
            <div className="cm-icon-tile mx-auto mb-3" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--ref-mute)' }}>
              <Search size={22} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
              Search your repository
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--ref-ink-soft)', maxWidth: '440px', margin: '0 auto' }}>
              Connect a repository and search across symbols, methods, and implementations.
            </p>
          </div>
        ) : (
          /* Dense Professional Developer Results Layout */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredSymbols.map((item) => {
              const sym = item.symbol;
              const kindPillClass =
                sym.kind === 'CLASS'
                  ? 'cyan'
                  : sym.kind === 'METHOD'
                  ? 'amber'
                  : sym.kind === 'INTERFACE'
                  ? 'blue'
                  : 'green';

              return (
                <div
                  key={sym.id}
                  className="cm-clay-card"
                  style={{
                    padding: '16px 20px',
                    borderRadius: '14px',
                  }}
                >
                  {/* Top Bar: Symbol Name + Badges + Score */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`cm-tag-pill ${kindPillClass} font-mono`}>
                        {sym.kind}
                      </span>
                      <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                        {sym.name}
                      </span>
                      {sym.visibility && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>
                          {sym.visibility.toLowerCase()}
                        </span>
                      )}
                    </div>

                    {/* Score indicators */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {searchMode === 'HYBRID' && (
                        <span className="cm-tag-pill amber font-mono">
                          RRF: {item.rrfScore.toFixed(3)}
                        </span>
                      )}
                      {searchMode === 'LEXICAL' && (
                        <span className="cm-tag-pill cyan font-mono">
                          Lexical: Score {item.lexicalScore.toFixed(2)}
                        </span>
                      )}
                      {searchMode === 'SEMANTIC' && (
                        <span className="cm-tag-pill blue font-mono">
                          Semantic: Score {item.semanticScore.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* File & Line Provenance */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)', marginBottom: '10px' }}>
                    <FileCode size={13} style={{ color: 'var(--ref-mute)' }} />
                    <span style={{ color: 'var(--ref-ink-soft)' }}>{sym.filePath}</span>
                    <span>:</span>
                    <span style={{ color: '#ffffff' }}>Lines {sym.startLine}&ndash;{sym.endLine}</span>
                    {sym.fqn && sym.fqn !== sym.name && (
                      <>
                        <span style={{ opacity: 0.3 }}>&bull;</span>
                        <span style={{ color: 'var(--ref-mute)' }}>{sym.fqn}</span>
                      </>
                    )}
                  </div>

                  {/* Compact Syntax Preview */}
                  {sym.signature && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: '#070a12',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        color: '#94a3b8',
                        overflowX: 'auto',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: 'var(--accent-blue)' }}>{sym.visibility ? `${sym.visibility.toLowerCase()} ` : ''}</span>
                      <span style={{ color: 'var(--ref-orange-3)' }}>{sym.signature}</span>
                    </div>
                  )}

                  {/* Docstring if available */}
                  {sym.docstring && (
                    <div style={{ marginTop: '8px', fontSize: '0.76rem', color: 'var(--ref-mute)', lineHeight: 1.4 }}>
                      {sym.docstring}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
