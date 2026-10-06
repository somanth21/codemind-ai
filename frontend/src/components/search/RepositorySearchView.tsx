import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalysisRuns, getSymbols } from '../../api/analysis';
import { AnalysisRun, SymbolItem } from '../../types/analysis';
import {
  Search,
  SlidersHorizontal,
  FileCode,
  Sparkles,
  GitFork,
  AlertCircle,
  Loader2,
  ArrowRight,
  Layers,
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
  const navigate = useNavigate();
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

  // Fetch runs & initial symbols on mount
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

  // Compute Scored Symbols with Reciprocal Rank Fusion
  const searchResults = useMemo<ScoredSymbol[]>(() => {
    if (!query.trim()) {
      // When query is empty, show filtered symbols with baseline rank
      const filtered = kindFilter ? symbols.filter((s) => s.kind === kindFilter) : symbols;
      return filtered.slice(0, 30).map((symbol, idx) => ({
        symbol,
        lexicalScore: 0,
        lexicalRank: idx + 1,
        semanticScore: 0,
        semanticRank: idx + 1,
        rrfScore: 0,
      }));
    }

    const q = query.trim().toLowerCase();
    const queryTokens = q.split(/\s+/).filter(Boolean);

    // Filter by kind first if specified
    const candidateSymbols = kindFilter ? symbols.filter((s) => s.kind === kindFilter) : symbols;

    // 1. Calculate Lexical Scores
    const lexicalScored = candidateSymbols.map((sym) => {
      const name = sym.name.toLowerCase();
      const fqn = (sym.fqn || '').toLowerCase();
      const filePath = sym.filePath.toLowerCase();

      let score = 0;
      if (name === q) score += 100;
      else if (name.startsWith(q)) score += 60;
      else if (name.includes(q)) score += 40;

      queryTokens.forEach((token) => {
        if (name.includes(token)) score += 20;
        if (fqn.includes(token)) score += 10;
        if (filePath.includes(token)) score += 5;
      });

      return { sym, score };
    });

    lexicalScored.sort((a, b) => b.score - a.score);
    const lexicalRankMap = new Map<string, { score: number; rank: number }>();
    lexicalScored.forEach((item, index) => {
      lexicalRankMap.set(item.sym.id, { score: item.score, rank: index + 1 });
    });

    // 2. Calculate Semantic / Structural Scores (only awarded if query matched)
    const semanticScored = candidateSymbols.map((sym) => {
      let score = 0;
      let matched = false;
      const signature = (sym.signature || '').toLowerCase();
      const doc = (sym.docstring || '').toLowerCase();

      if (sym.name.toLowerCase().includes(q)) {
        score += 30;
        matched = true;
      }

      queryTokens.forEach((token) => {
        if (signature.includes(token)) {
          score += 25;
          matched = true;
        }
        if (doc.includes(token)) {
          score += 15;
          matched = true;
        }
      });

      // Structural bonus by AST kind ONLY if query matched
      if (matched) {
        if (sym.kind === 'CLASS' || sym.kind === 'INTERFACE') score += 15;
        if (sym.kind === 'METHOD' && sym.visibility === 'PUBLIC') score += 20;
      }

      return { sym, score };
    });

    semanticScored.sort((a, b) => b.score - a.score);
    const semanticRankMap = new Map<string, { score: number; rank: number }>();
    semanticScored.forEach((item, index) => {
      semanticRankMap.set(item.sym.id, { score: item.score, rank: index + 1 });
    });

    // 3. Combine with Reciprocal Rank Fusion: RRF = 1 / (60 + r_lex) + 1 / (60 + r_sem)
    const combined: ScoredSymbol[] = candidateSymbols.map((sym) => {
      const lex = lexicalRankMap.get(sym.id) || { score: 0, rank: 999 };
      const sem = semanticRankMap.get(sym.id) || { score: 0, rank: 999 };
      const rrf = 1 / (60 + lex.rank) + 1 / (60 + sem.rank);

      return {
        symbol: sym,
        lexicalScore: lex.score,
        lexicalRank: lex.rank,
        semanticScore: sem.score,
        semanticRank: sem.rank,
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
    <div className="space-y-6" data-testid="repository-search-view">
      {/* Search Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/10 p-2.5 text-indigo-400 border border-indigo-500/20">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Hybrid Repository Search</h2>
                {repositoryName && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {repositoryName}
                  </span>
                )}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  Deterministic Index
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Reciprocal Rank Fusion (RRF) over lexical tokens and AST symbol evidence with exact source-line provenance.
              </p>
            </div>
          </div>

          {/* Analysis Run Selector */}
          {runs.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Index Snapshot:</span>
              <select
                value={selectedRunId || ''}
                onChange={(e) => handleRunChange(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {runs.map((run) => (
                  <option key={run.id} value={run.id}>
                    {new Date(run.startedAt).toLocaleTimeString()} ({run.totalClasses} classes, {run.totalMethods} methods)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search Input Bar & Controls */}
        <div className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search symbols by name, signature, interface, or responsibility (e.g. Order, calculate, Repository)..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                data-testid="search-input"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Mode Selector */}
            <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setSearchMode('HYBRID')}
                className={`px-3 py-1 text-xs font-semibold rounded transition ${
                  searchMode === 'HYBRID'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Combines Lexical + Semantic via Reciprocal Rank Fusion"
              >
                Hybrid (RRF)
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('LEXICAL')}
                className={`px-3 py-1 text-xs font-semibold rounded transition ${
                  searchMode === 'LEXICAL'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Token and exact identifier substring match"
              >
                Lexical
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('SEMANTIC')}
                className={`px-3 py-1 text-xs font-semibold rounded transition ${
                  searchMode === 'SEMANTIC'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="AST signature & structural type rank"
              >
                Semantic
              </button>
            </div>
          </div>

          {/* Filters & Results Counter */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-2">
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span>Filter Kind:</span>
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
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

            <div className="flex items-center gap-4">
              <span>Index Size: {symbols.length} AST symbols</span>
              <span className="font-semibold text-slate-200">
                Found {searchResults.length} matching evidence items
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-rose-800/50 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex min-h-[240px] flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="text-xs text-slate-400">Loading deterministic symbol evidence index...</span>
        </div>
      )}

      {/* No Runs Warning */}
      {!loading && runs.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <Layers className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">No Static Analysis Runs Available</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            Repository must undergo deterministic static AST analysis before the symbol evidence index can be searched.
          </p>
          <button
            onClick={() => navigate('/analysis')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
          >
            <span>Run Static Analysis</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Search Results List */}
      {!loading && runs.length > 0 && (
        <div className="space-y-3">
          {searchResults.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-10 text-center text-slate-400">
              <Search className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-medium text-slate-300">No matching symbol evidence found</div>
              <div className="text-xs text-slate-500 mt-1">
                Try searching for different method names, classes, or adjusting the filter.
              </div>
            </div>
          ) : (
            searchResults.map((item, index) => {
              const sym = item.symbol;
              return (
                <div
                  key={sym.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm hover:border-slate-700 transition"
                  data-testid="search-result-item"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold font-mono">
                          {sym.kind}
                        </span>

                        <span className="font-mono text-sm font-bold text-white truncate">
                          {sym.name}
                        </span>

                        {sym.visibility && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            [{sym.visibility.toLowerCase()}]
                          </span>
                        )}

                        {/* Search Ranks / Scores Badge */}
                        <div className="flex items-center gap-1.5 ml-auto md:ml-2">
                          {searchMode === 'HYBRID' && (
                            <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-medium">
                              RRF: {item.rrfScore > 0 ? item.rrfScore.toFixed(4) : `Rank #${index + 1}`}
                            </span>
                          )}
                          {searchMode === 'LEXICAL' && (
                            <span className="rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 text-[10px] font-mono">
                              Lexical: {item.lexicalScore > 0 ? `Score ${item.lexicalScore}` : `#${item.lexicalRank}`}
                            </span>
                          )}
                          {searchMode === 'SEMANTIC' && (
                            <span className="rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 text-[10px] font-mono">
                              Semantic: {item.semanticScore > 0 ? `Score ${item.semanticScore}` : `#${item.semanticRank}`}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Signature / FQN */}
                      <div className="font-mono text-xs text-slate-300 truncate bg-slate-950/70 rounded px-2.5 py-1 border border-slate-800/80">
                        {sym.signature || sym.fqn}
                      </div>

                      {/* File Path & Line Range */}
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono pt-0.5">
                        <FileCode className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-slate-300">{sym.filePath}</span>
                        <span>:lines {sym.startLine}-{sym.endLine}</span>
                      </div>

                      {sym.docstring && (
                        <p className="text-xs text-slate-400 line-clamp-2 pt-1 italic">
                          {sym.docstring}
                        </p>
                      )}
                    </div>

                    {/* Quick Jump Action Buttons */}
                    <div className="flex sm:flex-row md:flex-col gap-2 shrink-0 pt-2 md:pt-0">
                      <button
                        onClick={() => navigate('/reuse')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition"
                        title="Evaluate candidate component in Reuse-First Advisor"
                      >
                        <GitFork className="h-3.5 w-3.5" />
                        <span>Evaluate Reuse</span>
                      </button>

                      <button
                        onClick={() => navigate('/ai')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition"
                        title="Ground AI explanation against this evidence"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Explain with AI</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
