import React, { useEffect, useState, useMemo } from 'react';
import { useRepository } from '../context/RepositoryContext';
import { NoRepoSelected } from '../components/common/NoRepoSelected';
import {
  triggerAnalysis,
  getAnalysisRuns,
  getSymbols,
  getFileMetrics,
  getQualityFindings,
  getRelationships,
} from '../api/analysis';
import {
  AnalysisRun,
  SymbolItem,
  FileMetricsItem,
  QualityFindingItem,
  RelationshipItem,
  Severity,
} from '../types/analysis';
import { RunExecutionSummary } from '../components/analysis/RunExecutionSummary';
import { EngineeringOverviewCards } from '../components/analysis/EngineeringOverviewCards';
import {
  Activity,
  AlertTriangle,
  Loader2,
  Play,
  CheckCircle2,
  X,
  Search,
  ArrowUpDown,
  Copy,
  GitBranch,
  ShieldAlert,
} from 'lucide-react';

interface InspectorItem {
  type: 'symbol' | 'finding' | 'file';
  data: any;
}

const formatPathSnippet = (fullPath: string, maxSegments = 3): string => {
  if (!fullPath) return '';
  const normalized = fullPath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= maxSegments) {
    return normalized;
  }
  const lastParts = parts.slice(-maxSegments).join('/');
  return `.../${lastParts}`;
};

const extractPackageName = (filePath: string): string => {
  if (!filePath) return 'root';
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length >= 2) {
    // Return parent directory or package name
    return parts[parts.length - 2];
  }
  return parts[0] || 'root';
};

const getSeverityBadgeStyle = (severity: Severity | string) => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
    case 'HIGH':
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        text: '#ef4444',
        border: 'rgba(239, 68, 68, 0.3)',
      };
    case 'MEDIUM':
    case 'WARNING':
      return {
        bg: 'rgba(245, 139, 78, 0.15)',
        text: 'var(--ref-orange-3, #f58b4e)',
        border: 'rgba(245, 139, 78, 0.3)',
      };
    case 'LOW':
    case 'INFO':
    default:
      return {
        bg: 'rgba(56, 189, 248, 0.15)',
        text: 'var(--accent-blue, #38bdf8)',
        border: 'rgba(56, 189, 248, 0.3)',
      };
  }
};

export const AnalysisPage: React.FC = () => {
  const { selectedRepo } = useRepository();

  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AnalysisRun | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Data states
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  const [fileMetrics, setFileMetrics] = useState<FileMetricsItem[]>([]);
  const [qualityFindings, setQualityFindings] = useState<QualityFindingItem[]>([]);
  const [relationships, setRelationships] = useState<RelationshipItem[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);

  // Inspector & Filter states
  const [selectedItem, setSelectedItem] = useState<InspectorItem | null>(null);
  const [symbolSearch, setSymbolSearch] = useState<string>('');
  const [symbolTypeFilter, setSymbolTypeFilter] = useState<string>('ALL');
  const [complexityFilter, setComplexityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'complexity' | 'loc'>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [findingSeverityFilter, setFindingSeverityFilter] = useState<string>('ALL');
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  const fetchRuns = async (repoId: string) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await getAnalysisRuns(repoId, 0, 10);
      setRuns(res.content);
      if (res.content.length > 0) {
        setSelectedRun(res.content[0]);
      } else {
        setSelectedRun(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch analysis runs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      fetchRuns(selectedRepo.id);
    }
  }, [selectedRepo]);

  const handleTriggerAnalysis = async () => {
    if (!selectedRepo) return;
    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      const newRun = await triggerAnalysis(selectedRepo.id);
      setSelectedRun(newRun);
      await fetchRuns(selectedRepo.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis run failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load all analysis datasets concurrently when run is selected
  useEffect(() => {
    if (!selectedRepo || !selectedRun) return;

    const loadData = async () => {
      setDataLoading(true);
      try {
        const [symRes, metricsRes, findingsRes, relsRes] = await Promise.all([
          getSymbols(selectedRepo.id, selectedRun.id, 0, 100),
          getFileMetrics(selectedRepo.id, selectedRun.id, 0, 100),
          getQualityFindings(selectedRepo.id, selectedRun.id, 0, 100),
          getRelationships(selectedRepo.id, selectedRun.id, 0, 100).catch(() => ({ content: [] })),
        ]);
        setSymbols(symRes.content);
        setFileMetrics(metricsRes.content);
        setQualityFindings(findingsRes.content);
        setRelationships(relsRes.content);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load telemetry data');
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [selectedRepo, selectedRun]);

  // File metrics lookup for fast joining with symbols
  const fileMetricsMap = useMemo(() => {
    const map = new Map<string, FileMetricsItem>();
    fileMetrics.forEach((fm) => {
      map.set(fm.filePath, fm);
    });
    return map;
  }, [fileMetrics]);

  // Section B: Complexity Analytics (Real Histogram & Top Complex Units)
  const complexityAnalytics = useMemo(() => {
    const buckets = {
      '0-5': 0,
      '6-10': 0,
      '11-20': 0,
      '21+': 0,
    };

    fileMetrics.forEach((fm) => {
      const cc = fm.cyclomaticComplexity;
      if (cc <= 5) buckets['0-5'] += 1;
      else if (cc <= 10) buckets['6-10'] += 1;
      else if (cc <= 20) buckets['11-20'] += 1;
      else buckets['21+'] += 1;
    });

    const totalFiles = fileMetrics.length || 1;

    // Top complex units
    const topComplex = [...fileMetrics]
      .sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity)
      .slice(0, 5);

    const maxCc = Math.max(...fileMetrics.map((fm) => fm.cyclomaticComplexity), 1);

    return { buckets, totalFiles, topComplex, maxCc };
  }, [fileMetrics]);

  // Section C: Maintainability Analytics (Real Distribution)
  const maintainabilityAnalytics = useMemo(() => {
    const counts = {
      excellent: 0, // >= 85
      good: 0,      // 65 - 84
      needsAttention: 0, // 40 - 64
      poor: 0,      // < 40
    };

    fileMetrics.forEach((fm) => {
      const mi = fm.maintainabilityIndex;
      if (mi >= 85) counts.excellent += 1;
      else if (mi >= 65) counts.good += 1;
      else if (mi >= 40) counts.needsAttention += 1;
      else counts.poor += 1;
    });

    const total = fileMetrics.length || 1;
    return { counts, total };
  }, [fileMetrics]);

  // Section D: Codebase Scale (LOC by Package / Module)
  const packageScale = useMemo(() => {
    const pkgMap = new Map<string, { loc: number; files: number }>();

    fileMetrics.forEach((fm) => {
      const pkg = extractPackageName(fm.filePath);
      const curr = pkgMap.get(pkg) || { loc: 0, files: 0 };
      curr.loc += fm.loc;
      curr.files += 1;
      pkgMap.set(pkg, curr);
    });

    const packages = Array.from(pkgMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.loc - a.loc)
      .slice(0, 5);

    const maxPkgLoc = Math.max(...packages.map((p) => p.loc), 1);
    return { packages, maxPkgLoc };
  }, [fileMetrics]);

  // Section E: Findings Severity Distribution
  const findingsSeverityDist = useMemo(() => {
    const counts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };

    qualityFindings.forEach((f) => {
      const sev = f.severity?.toUpperCase();
      if (sev === 'CRITICAL') counts.CRITICAL += 1;
      else if (sev === 'HIGH') counts.HIGH += 1;
      else if (sev === 'MEDIUM' || sev === 'WARNING') counts.MEDIUM += 1;
      else counts.LOW += 1;
    });

    return counts;
  }, [qualityFindings]);

  const filteredFindings = useMemo(() => {
    if (findingSeverityFilter === 'ALL') return qualityFindings;
    return qualityFindings.filter((f) => f.severity === findingSeverityFilter);
  }, [qualityFindings, findingSeverityFilter]);

  // Section F: Symbol Explorer (Search, Filter, Sort)
  const filteredSymbols = useMemo(() => {
    return symbols
      .filter((s) => {
        const matchesSearch =
          s.name.toLowerCase().includes(symbolSearch.toLowerCase()) ||
          s.filePath.toLowerCase().includes(symbolSearch.toLowerCase());

        const matchesType =
          symbolTypeFilter === 'ALL' || s.kind?.toUpperCase() === symbolTypeFilter.toUpperCase();

        const fm = fileMetricsMap.get(s.filePath);
        const cc = fm ? fm.cyclomaticComplexity : 1;

        let matchesCc = true;
        if (complexityFilter === 'HIGH') matchesCc = cc > 10;
        else if (complexityFilter === 'MODERATE') matchesCc = cc >= 6 && cc <= 10;
        else if (complexityFilter === 'LOW') matchesCc = cc <= 5;

        return matchesSearch && matchesType && matchesCc;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
        if (sortBy === 'loc') {
          const locA = (a.endLine || 0) - (a.startLine || 0) + 1;
          const locB = (b.endLine || 0) - (b.startLine || 0) + 1;
          return sortAsc ? locA - locB : locB - locA;
        }
        if (sortBy === 'complexity') {
          const ccA = fileMetricsMap.get(a.filePath)?.cyclomaticComplexity || 1;
          const ccB = fileMetricsMap.get(b.filePath)?.cyclomaticComplexity || 1;
          return sortAsc ? ccA - ccB : ccB - ccA;
        }
        return 0;
      });
  }, [symbols, symbolSearch, symbolTypeFilter, complexityFilter, sortBy, sortAsc, fileMetricsMap]);

  // Relationships connected to selected symbol in inspector
  const selectedSymbolRelationships = useMemo(() => {
    if (!selectedItem || selectedItem.type !== 'symbol') return { outgoing: [], incoming: [] };
    const symId = selectedItem.data.id;
    const symName = selectedItem.data.name;

    const outgoing = relationships.filter(
      (r) => r.sourceSymbolId === symId || (r.sourceFqn && r.sourceFqn.includes(symName))
    );
    const incoming = relationships.filter(
      (r) => r.targetSymbolId === symId || (r.targetFqn && r.targetFqn.includes(symName))
    );

    return { outgoing, incoming };
  }, [selectedItem, relationships]);

  // Findings affecting selected symbol in inspector
  const selectedSymbolFindings = useMemo(() => {
    if (!selectedItem || selectedItem.type !== 'symbol') return [];
    return qualityFindings.filter(
      (f) =>
        f.filePath === selectedItem.data.filePath &&
        (!f.lineNumber ||
          (f.lineNumber >= (selectedItem.data.startLine || 0) &&
            f.lineNumber <= (selectedItem.data.endLine || 999999)))
    );
  }, [selectedItem, qualityFindings]);

  const handleCopyPath = (path: string) => {
    if (!path) return;
    navigator.clipboard?.writeText(path);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  if (!selectedRepo) {
    return (
      <NoRepoSelected
        moduleName="Deterministic Static Analysis"
        description="Select an ingested repository from the header dropdown to run JavaParser AST extraction, McCabe cyclomatic complexity calculations, and maintainability index analysis."
      />
    );
  }

  return (
    <div className="analysis-report-container cm-canvas-grain relative overflow-hidden space-y-6" data-testid="analysis-page">
      <div className="cm-ambient-glow" />
      <div className="cm-ambient-glow-teal" />

      {/* ============ HEADER ============ */}
      <header className="analysis-header cm-clay-card relative z-10" style={{ padding: '24px 28px', marginBottom: '24px' }}>
        <div className="analysis-header-context" style={{ marginBottom: '12px' }}>
          <span>CodeMind AI</span>
          <span>/</span>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>{selectedRepo.name}</span>
          <span style={{ opacity: 0.4 }}>&bull;</span>
          <span className="cm-tag-pill cm-tag-pill-cyan">Static AST Engine</span>
        </div>

        <div className="analysis-header-main">
          <div className="analysis-title-group">
            <div className="cm-eyebrow">DETERMINISTIC CODE INTELLIGENCE &bull; STATIC ANALYSIS ENGINE</div>
            <h1 className="text-2xl font-bold tracking-tight text-white">CODE ANALYSIS</h1>
            <p style={{ margin: '4px 0 10px 0', fontSize: '0.88rem', color: '#94a3b8' }}>
              Understand the health, complexity and structure of your repository.
            </p>
            <div className="analysis-meta-subtitle">
              <span>
                Repository: <strong style={{ color: '#ffffff' }}>{selectedRepo.name}</strong>
              </span>
              <span style={{ opacity: 0.3 }}>&bull;</span>
              <span>
                Last analysis:{' '}
                <strong style={{ color: '#ffffff' }}>
                  {selectedRun
                    ? new Date(selectedRun.completedAt || selectedRun.startedAt).toLocaleString()
                    : 'Not yet analyzed'}
                </strong>
              </span>
              {selectedRun && (
                <>
                  <span style={{ opacity: 0.3 }}>&bull;</span>
                  <span>
                    Files: <strong style={{ color: '#ffffff' }}>{selectedRun.filesAnalyzed}</strong>
                  </span>
                  <span style={{ opacity: 0.3 }}>&bull;</span>
                  <span>
                    Symbols: <strong style={{ color: '#ffffff' }}>{selectedRun.totalClasses + selectedRun.totalMethods}</strong>
                  </span>
                  <span style={{ opacity: 0.3 }}>&bull;</span>
                  <span>
                    LOC: <strong style={{ color: '#ffffff' }}>{selectedRun.totalLoc.toLocaleString()}</strong>
                  </span>
                </>
              )}
              {dataLoading && (
                <>
                  <span style={{ opacity: 0.3 }}>&bull;</span>
                  <span style={{ color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Loader2 size={12} className="animate-spin" />
                    Loading metrics...
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleTriggerAnalysis}
            disabled={isAnalyzing}
            className="cm-arrow-pill cm-arrow-pill-primary"
            style={{ padding: '8px 8px 8px 18px', fontSize: '0.84rem' }}
            title="Execute JavaParser AST analysis pipeline"
          >
            {isAnalyzing ? (
              <>
                <span>Running Analysis...</span>
                <span className="cm-cta-dot">
                  <Loader2 size={13} className="animate-spin" />
                </span>
              </>
            ) : (
              <>
                <span>Run Analysis</span>
                <span className="cm-cta-dot">
                  <Play size={12} />
                </span>
              </>
            )}
          </button>
        </div>
      </header>

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#fca5a5',
            fontSize: '0.82rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Snapshot switcher */}
      {runs.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <span className="cm-eyebrow" style={{ margin: 0, fontSize: '0.68rem' }}>
            Snapshots
          </span>
          <div className="cm-pill-nav">
            {runs.map((run) => (
              <button
                key={run.id}
                onClick={() => setSelectedRun(run)}
                className={`cm-pill-tab ${selectedRun?.id === run.id ? 'active' : ''}`}
                style={{ padding: '5px 12px', fontSize: '0.74rem' }}
              >
                <span>{new Date(run.startedAt).toLocaleTimeString()}</span>
                <span style={{ fontSize: '0.66rem', opacity: 0.7 }}>({run.filesAnalyzed} files)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Loader2 size={30} className="animate-spin text-orange-500" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--ref-mute)', fontSize: '0.85rem' }}>Loading analysis telemetry...</div>
        </div>
      ) : !selectedRun ? (
        <div className="cm-clay-card" style={{ padding: '50px 24px', textAlign: 'center' }}>
          <Activity size={32} style={{ color: 'var(--accent-blue)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>No Analysis Runs Yet</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '440px', margin: '0 auto 20px' }}>
            Click &quot;Run Analysis&quot; above to calculate deterministic metrics, complexity distributions, and AST symbols.
          </p>
          <button onClick={handleTriggerAnalysis} disabled={isAnalyzing} className="cm-arrow-pill cm-arrow-pill-primary" style={{ padding: '8px 18px', fontSize: '0.82rem' }}>
            <span>Run Analysis</span>
            <span className="cm-cta-dot"><Play size={12} /></span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ============ RUN EXECUTION SUMMARY ============ */}
          <RunExecutionSummary run={selectedRun} />

          {/* ============ SECTION A — ENGINEERING OVERVIEW (GRAPHICAL) ============ */}
          <EngineeringOverviewCards run={selectedRun} />

          {/* ============ SECTION B — COMPLEXITY ANALYTICS ============ */}
          <section className="analytics-card cm-clay-card" style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
                  Complexity Analytics
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--ref-mute)', margin: 0 }}>
                  Deterministic McCabe cyclomatic complexity distribution and highest-risk units
                </p>
              </div>
              <span className="cm-tag-pill cm-tag-pill-green" style={{ fontSize: '0.68rem' }}>
                AST Metrics
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {/* 1. Complexity Distribution Histogram */}
              <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#070a12', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Complexity Distribution</span>
                  <span style={{ color: 'var(--ref-mute)', fontSize: '0.7rem' }}>{fileMetrics.length} source files</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { range: '0–5', count: complexityAnalytics.buckets['0-5'], color: '#10b981', label: 'Simple' },
                    { range: '6–10', count: complexityAnalytics.buckets['6-10'], color: 'var(--accent-blue)', label: 'Moderate' },
                    { range: '11–20', count: complexityAnalytics.buckets['11-20'], color: 'var(--ref-orange-3)', label: 'Complex' },
                    { range: '21+', count: complexityAnalytics.buckets['21+'], color: '#ef4444', label: 'High Risk' },
                  ].map((tier) => {
                    const pct = Math.round((tier.count / complexityAnalytics.totalFiles) * 100);
                    return (
                      <div key={tier.range}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                          <span style={{ color: '#ffffff', fontWeight: 600 }}>
                            {tier.range} <span style={{ color: 'var(--ref-mute)', fontWeight: 400 }}>({tier.label})</span>
                          </span>
                          <span style={{ color: 'var(--ref-mute)' }}>
                            {tier.count} ({pct}%)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(pct, tier.count > 0 ? 4 : 0)}%`, height: '100%', backgroundColor: tier.color, borderRadius: '4px', transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Top Complex Symbols / Units */}
              <div style={{ padding: '16px', borderRadius: '10px', backgroundColor: '#070a12', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Top Complex Units</span>
                  <span style={{ color: 'var(--ref-mute)', fontSize: '0.7rem' }}>McCabe CC</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {complexityAnalytics.topComplex.map((unit) => {
                    const pct = Math.round((unit.cyclomaticComplexity / complexityAnalytics.maxCc) * 100);
                    const fileName = unit.filePath.split('/').pop() || unit.filePath;
                    return (
                      <div
                        key={unit.id}
                        onClick={() => setSelectedItem({ type: 'file', data: unit })}
                        style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', transition: 'background 0.15s' }}
                        className="finding-row"
                        title={`Click to inspect ${unit.filePath}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>
                          <span style={{ color: '#ffffff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                            {fileName}
                          </span>
                          <span style={{ color: unit.cyclomaticComplexity > 10 ? '#ef4444' : 'var(--ref-orange-3)', fontWeight: 800 }}>
                            {unit.cyclomaticComplexity} CC
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: unit.cyclomaticComplexity > 10 ? '#ef4444' : 'var(--ref-orange-3)', borderRadius: '3px' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ============ SECTION C & D — MAINTAINABILITY & CODEBASE SCALE ============ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Section C: Maintainability Section */}
            <section className="cm-clay-card" style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Maintainability Analysis
                </h3>
                <span className="cm-tag-pill cm-tag-pill-cyan" style={{ fontSize: '0.66rem' }}>
                  Halstead + CC Bounded
                </span>
              </div>

              {/* Average Maintainability Gauge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '16px', borderRadius: '14px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '16px' }}>
                <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="64" height="64" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeWidth="3.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={selectedRun.maintainabilityIndex >= 65 ? '#10b981' : '#f59e0b'}
                      strokeWidth="3.5"
                      strokeDasharray={`${Math.min(selectedRun.maintainabilityIndex, 100)}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span style={{ position: 'absolute', fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                    {selectedRun.maintainabilityIndex.toFixed(0)}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                    Average Maintainability Index
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--ref-mute)', marginTop: '2px' }}>
                    CodeMind reference threshold: 65.0
                  </div>
                  <div style={{ fontSize: '0.7rem', color: selectedRun.maintainabilityIndex >= 65 ? '#10b981' : '#f59e0b', marginTop: '4px', fontWeight: 600 }}>
                    {selectedRun.maintainabilityIndex >= 65 ? 'Meets reference threshold' : 'Below reference threshold'}
                  </div>
                </div>
              </div>

              {/* Distribution Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--ref-mute)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  File Maintainability Distribution
                </div>

                {[
                  { tier: 'Excellent (≥ 85)', count: maintainabilityAnalytics.counts.excellent, color: '#10b981' },
                  { tier: 'Good (65–84)', count: maintainabilityAnalytics.counts.good, color: 'var(--accent-blue)' },
                  { tier: 'Needs Attention (40–64)', count: maintainabilityAnalytics.counts.needsAttention, color: 'var(--ref-orange-3)' },
                  { tier: 'Poor (< 40)', count: maintainabilityAnalytics.counts.poor, color: '#ef4444' },
                ].map((item) => {
                  const pct = Math.round((item.count / maintainabilityAnalytics.total) * 100);
                  return (
                    <div key={item.tier}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>
                        <span style={{ color: '#ffffff' }}>{item.tier}</span>
                        <span style={{ color: 'var(--ref-mute)' }}>{item.count} files ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.max(pct, item.count > 0 ? 3 : 0)}%`, height: '100%', backgroundColor: item.color, borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section D: Codebase Scale Section */}
            <section className="cm-clay-card" style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Codebase Scale &amp; Composition
                </h3>
                <span className="cm-tag-pill cm-tag-pill-cyan" style={{ fontSize: '0.66rem' }}>
                  LOC by Package / Module
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {packageScale.packages.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ref-mute)', fontSize: '0.8rem' }}>
                    No package metric data available
                  </div>
                ) : (
                  packageScale.packages.map((pkg) => {
                    const pct = Math.round((pkg.loc / packageScale.maxPkgLoc) * 100);
                    return (
                      <div key={pkg.name} style={{ padding: '10px 14px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                          <span style={{ color: '#ffffff', fontWeight: 700 }}>{pkg.name}</span>
                          <span style={{ color: 'var(--ref-mute)' }}>
                            <strong style={{ color: '#ffffff' }}>{pkg.loc.toLocaleString()}</strong> LOC ({pkg.files} files)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', backgroundColor: 'var(--accent-blue)', borderRadius: '3px' }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* ============ SECTION E — FINDINGS ============ */}
          <section className="cm-clay-card" style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
                  Static Quality Findings
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--ref-mute)' }}>
                  Detected violations categorized by rule severity
                </span>
              </div>

              {/* Severity Filter Pills */}
              <div className="cm-pill-nav" style={{ padding: '3px 4px' }}>
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setFindingSeverityFilter(sev)}
                    className={`cm-pill-tab ${findingSeverityFilter === sev ? 'active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Distribution Compact Chart */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#070a12', border: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                Severity Distribution:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#ef4444' }}><strong>{findingsSeverityDist.CRITICAL}</strong> Critical</span>
                <span style={{ color: '#f87171' }}><strong>{findingsSeverityDist.HIGH}</strong> High</span>
                <span style={{ color: 'var(--ref-orange-3)' }}><strong>{findingsSeverityDist.MEDIUM}</strong> Medium</span>
                <span style={{ color: 'var(--accent-blue)' }}><strong>{findingsSeverityDist.LOW}</strong> Low</span>
              </div>
            </div>

            {/* Findings Table */}
            {filteredFindings.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#070a12', borderRadius: '10px' }}>
                <CheckCircle2 size={28} style={{ color: '#10b981', margin: '0 auto 8px' }} />
                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem' }}>Zero quality rule violations in this category</div>
              </div>
            ) : (
              <div className="findings-table-container">
                <table className="findings-table">
                  <thead>
                    <tr>
                      <th style={{ width: '95px' }}>Severity</th>
                      <th style={{ width: '140px' }}>Rule</th>
                      <th style={{ width: '220px' }}>File</th>
                      <th style={{ width: '70px' }}>Line</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindings.map((finding) => {
                      const badge = getSeverityBadgeStyle(finding.severity);
                      return (
                        <tr
                          key={finding.id}
                          className="finding-row"
                          onClick={() => setSelectedItem({ type: 'finding', data: finding })}
                          title="Click to view finding details"
                        >
                          <td>
                            <span
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: badge.bg,
                                color: badge.text,
                                border: `1px solid ${badge.border}`,
                                display: 'inline-block',
                              }}
                            >
                              {finding.severity}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#ffffff', fontWeight: 600 }}>
                              {finding.ruleId}
                            </span>
                          </td>
                          <td>
                            <span className="truncated-path" title={finding.filePath}>
                              {formatPathSnippet(finding.filePath)}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ref-mute)' }}>
                            {finding.lineNumber || '—'}
                          </td>
                          <td>
                            <span style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.78rem' }}>
                              {finding.title}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ============ SECTION F — SYMBOL EXPLORER ============ */}
          <section className="cm-clay-card" style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '0 0 4px 0' }}>
                  Symbol Explorer
                </h3>
                <span style={{ fontSize: '0.74rem', color: 'var(--ref-mute)' }}>
                  Searchable and filterable AST declaration catalog ({filteredSymbols.length} displayed)
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#070a12', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.08)', flex: 1, minWidth: '180px' }}>
                <Search size={14} style={{ color: 'var(--ref-mute)' }} />
                <input
                  type="text"
                  placeholder="Search symbols or paths..."
                  value={symbolSearch}
                  onChange={(e) => setSymbolSearch(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '0.75rem', outline: 'none', width: '100%', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              {/* Type Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--ref-mute)' }}>
                <span>Type:</span>
                <select
                  value={symbolTypeFilter}
                  onChange={(e) => setSymbolTypeFilter(e.target.value)}
                  style={{ background: '#0d1220', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.72rem', outline: 'none' }}
                >
                  <option value="ALL">All Types</option>
                  <option value="CLASS">Classes</option>
                  <option value="METHOD">Methods</option>
                  <option value="INTERFACE">Interfaces</option>
                </select>
              </div>

              {/* Complexity Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--ref-mute)' }}>
                <span>Complexity:</span>
                <select
                  value={complexityFilter}
                  onChange={(e) => setComplexityFilter(e.target.value)}
                  style={{ background: '#0d1220', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.72rem', outline: 'none' }}
                >
                  <option value="ALL">All Levels</option>
                  <option value="HIGH">High (&gt; 10)</option>
                  <option value="MODERATE">Moderate (6–10)</option>
                  <option value="LOW">Low (0–5)</option>
                </select>
              </div>

              {/* Sort selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--ref-mute)' }}>
                <ArrowUpDown size={13} />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{ background: '#0d1220', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.72rem', outline: 'none' }}
                >
                  <option value="name">Sort: Name</option>
                  <option value="complexity">Sort: Complexity</option>
                  <option value="loc">Sort: LOC</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortAsc(!sortAsc)}
                  style={{ background: '#0d1220', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '4px', color: '#ffffff', padding: '3px 6px', fontSize: '0.7rem', cursor: 'pointer' }}
                  title="Toggle sort direction"
                >
                  {sortAsc ? 'ASC' : 'DESC'}
                </button>
              </div>
            </div>

            {/* Symbol Explorer Table */}
            {filteredSymbols.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--ref-mute)', fontSize: '0.8rem' }}>
                No symbols match current search and filter criteria
              </div>
            ) : (
              <div className="findings-table-container">
                <table className="findings-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Type</th>
                      <th>Symbol</th>
                      <th style={{ width: '220px' }}>File</th>
                      <th style={{ width: '75px' }}>Line</th>
                      <th style={{ width: '95px', textAlign: 'right' }}>Complexity</th>
                      <th style={{ width: '75px', textAlign: 'right' }}>LOC</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>Maintainability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSymbols.slice(0, 50).map((sym) => {
                      const fm = fileMetricsMap.get(sym.filePath);
                      const cc = fm ? fm.cyclomaticComplexity : 1;
                      const mi = fm ? fm.maintainabilityIndex : selectedRun.maintainabilityIndex;
                      const loc = (sym.endLine || 0) - (sym.startLine || 0) + 1;

                      return (
                        <tr
                          key={sym.id}
                          className="finding-row"
                          onClick={() => setSelectedItem({ type: 'symbol', data: sym })}
                          title="Click to view detailed symbol metrics and relationships"
                        >
                          <td>
                            <span
                              style={{
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                color: sym.kind === 'CLASS' ? '#c084fc' : sym.kind === 'METHOD' ? '#38bdf8' : '#34d399',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              {sym.kind}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#ffffff', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>
                              {sym.signature || sym.name}
                            </span>
                          </td>
                          <td>
                            <span className="truncated-path" title={sym.filePath}>
                              {formatPathSnippet(sym.filePath)}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ref-mute)' }}>
                            {sym.startLine ? `L${sym.startLine}` : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: cc > 10 ? '#ef4444' : 'var(--ref-orange-3)', fontWeight: 700 }}>
                            {cc}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--ref-mute)' }}>
                            {loc > 0 ? loc : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: mi >= 65 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                            {mi.toFixed(0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ============ DETAIL / EVIDENCE PANEL ============ */}
      {selectedItem && (
        <>
          <div className="inspector-backdrop" onClick={() => setSelectedItem(null)} />
          <aside className="inspector-drawer" role="dialog" aria-modal="true" aria-label="Item Details">
            <div className="inspector-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="cm-status-pill cm-status-pill-ready" style={{ fontSize: '0.64rem', textTransform: 'uppercase' }}>
                  {selectedItem.type.toUpperCase()} INSPECTOR
                </span>
                {selectedItem.type === 'finding' && (
                  <span
                    style={{
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: getSeverityBadgeStyle(selectedItem.data.severity).bg,
                      color: getSeverityBadgeStyle(selectedItem.data.severity).text,
                    }}
                  >
                    {selectedItem.data.severity}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ref-mute)', cursor: 'pointer', padding: '4px' }}
                title="Close inspector"
                aria-label="Close inspector"
              >
                <X size={18} />
              </button>
            </div>

            <div className="inspector-drawer-body">
              {/* Title & description */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0', wordBreak: 'break-word' }}>
                  {selectedItem.type === 'finding'
                    ? selectedItem.data.title
                    : selectedItem.type === 'symbol'
                    ? selectedItem.data.signature || selectedItem.data.name
                    : selectedItem.data.filePath}
                </h3>
                {selectedItem.type === 'finding' && selectedItem.data.description && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--ref-ink-soft)', margin: 0, lineHeight: 1.5 }}>
                    {selectedItem.data.description}
                  </p>
                )}
              </div>

              {/* Metadata Grid */}
              <div className="inspector-meta-grid">
                <div className="inspector-meta-item">
                  <span className="inspector-meta-label">Location</span>
                  <span className="inspector-meta-val" title={selectedItem.data.filePath}>
                    {formatPathSnippet(selectedItem.data.filePath)}
                  </span>
                </div>

                <div className="inspector-meta-item">
                  <span className="inspector-meta-label">Line Position</span>
                  <span className="inspector-meta-val">
                    {selectedItem.type === 'symbol'
                      ? `L${selectedItem.data.startLine || 1}–${selectedItem.data.endLine || 'N/A'}`
                      : `Line ${selectedItem.data.lineNumber || 1}`}
                  </span>
                </div>

                {selectedItem.type === 'symbol' && (
                  <>
                    <div className="inspector-meta-item">
                      <span className="inspector-meta-label">Kind</span>
                      <span className="inspector-meta-val">{selectedItem.data.kind}</span>
                    </div>
                    <div className="inspector-meta-item">
                      <span className="inspector-meta-label">Parameters</span>
                      <span className="inspector-meta-val">{selectedItem.data.parameterCount ?? 0}</span>
                    </div>
                    <div className="inspector-meta-item">
                      <span className="inspector-meta-label">LOC</span>
                      <span className="inspector-meta-val">
                        {(selectedItem.data.endLine || 0) - (selectedItem.data.startLine || 0) + 1} lines
                      </span>
                    </div>
                    <div className="inspector-meta-item">
                      <span className="inspector-meta-label">Complexity</span>
                      <span className="inspector-meta-val" style={{ color: 'var(--ref-orange-3)' }}>
                        {fileMetricsMap.get(selectedItem.data.filePath)?.cyclomaticComplexity || 1} CC
                      </span>
                    </div>
                  </>
                )}

                {selectedItem.type === 'finding' && (
                  <>
                    <div className="inspector-meta-item">
                      <span className="inspector-meta-label">Rule ID</span>
                      <span className="inspector-meta-val">{selectedItem.data.ruleId}</span>
                    </div>
                    <div className="inspector-meta-item">
                      <span className="inspector-meta-label">Severity</span>
                      <span className="inspector-meta-val" style={{ color: getSeverityBadgeStyle(selectedItem.data.severity).text }}>
                        {selectedItem.data.severity}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* File Path with Copy Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#070a12', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '360px' }} title={selectedItem.data.filePath}>
                  {selectedItem.data.filePath}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyPath(selectedItem.data.filePath)}
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: copyFeedback ? '#10b981' : '#ffffff', fontSize: '0.68rem', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Copy size={11} />
                  <span>{copyFeedback ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Symbol Relationships (CALLS / CALLED BY) */}
              {selectedItem.type === 'symbol' && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#070a12', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GitBranch size={13} style={{ color: 'var(--accent-blue)' }} />
                    <span>Relationships ({selectedSymbolRelationships.outgoing.length + selectedSymbolRelationships.incoming.length})</span>
                  </div>

                  {selectedSymbolRelationships.outgoing.length === 0 && selectedSymbolRelationships.incoming.length === 0 ? (
                    <div style={{ fontSize: '0.72rem', color: 'var(--ref-mute)' }}>No explicit call or inheritance edges mapped</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedSymbolRelationships.outgoing.map((r, i) => (
                        <div key={i} style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--ref-ink-soft)' }}>
                          <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{r.relationshipType}</span> &rarr; {r.targetFqn || 'target'}
                        </div>
                      ))}
                      {selectedSymbolRelationships.incoming.map((r, i) => (
                        <div key={i} style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--ref-ink-soft)' }}>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>CALLED BY</span> &larr; {r.sourceFqn || 'caller'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quality findings affecting this symbol */}
              {selectedItem.type === 'symbol' && selectedSymbolFindings.length > 0 && (
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fca5a5', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={13} />
                    <span>Quality Findings Affecting Symbol ({selectedSymbolFindings.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedSymbolFindings.map((f) => (
                      <div key={f.id} style={{ fontSize: '0.72rem', color: '#ffffff' }}>
                        <strong style={{ color: '#ef4444' }}>[{f.ruleId}]</strong> {f.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Snippet Box with Strictly Confined Horizontal Scroll */}
              <div className="code-snippet-box">
                <div className="code-snippet-header">
                  <span>Code Evidence &amp; AST Context</span>
                  <span>{selectedItem.type === 'symbol' ? selectedItem.data.kind : 'AST Source'}</span>
                </div>
                <div className="code-snippet-content">
                  {(() => {
                    let snippetText = '';
                    let startLine = 1;

                    if (selectedItem.type === 'finding') {
                      snippetText =
                        selectedItem.data.evidence ||
                        `// Rule violation: ${selectedItem.data.title}\n// Location: ${selectedItem.data.filePath}:${selectedItem.data.lineNumber || 1}\n// ID: ${selectedItem.data.ruleId}`;
                      startLine = Math.max((selectedItem.data.lineNumber || 1) - 1, 1);
                    } else if (selectedItem.type === 'symbol') {
                      snippetText =
                        selectedItem.data.signature ||
                        `${selectedItem.data.visibility || 'public'} ${selectedItem.data.returnType || 'void'} ${selectedItem.data.name}()`;
                      startLine = selectedItem.data.startLine || 1;
                    } else {
                      snippetText = `// File: ${selectedItem.data.filePath}\n// Lines of Code: ${selectedItem.data.loc}\n// Cyclomatic Complexity: ${selectedItem.data.cyclomaticComplexity}\n// Maintainability: ${selectedItem.data.maintainabilityIndex}`;
                      startLine = 1;
                    }

                    const lines = snippetText.split('\n');
                    return lines.map((line, idx) => (
                      <div key={idx} className="code-snippet-line">
                        <span className="code-snippet-linenum">{startLine + idx}</span>
                        <span className="code-snippet-text">{line || ' '}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default AnalysisPage;
