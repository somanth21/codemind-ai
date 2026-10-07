import React, { useState, useEffect, useMemo } from 'react';
import {
  analyzeArchitecture,
  getArchitectureAnalyses,
  getArchitectureAnalysis,
  getArchitectureGraph,
} from '../../api/architecture';
import {
  ArchitectureAnalysis,
  ArchitectureGraph,
} from '../../types/architecture';
import { DependencyGraphViewer, ArchitectureViewMode } from './DependencyGraphViewer';
import { exportArchitectureReportPdf } from './exportUtils';
import { getSymbols, getRelationships } from '../../api/analysis';
import { getSecurityFindings } from '../../api/security';
import { repositoryApi } from '../../api/repositories';
import { SymbolItem, RelationshipItem } from '../../types/analysis';
import { SecurityFinding } from '../../types/security';
import { RepositoryTreeNode } from '../../types/repository';
import {
  Layers,
  Repeat,
  Flame,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Compass,
  FileText,
} from 'lucide-react';

interface ArchitectureAnalysisViewProps {
  repositoryId: string;
}

export const ArchitectureAnalysisView: React.FC<ArchitectureAnalysisViewProps> = ({
  repositoryId,
}) => {
  const [currentAnalysis, setCurrentAnalysis] = useState<ArchitectureAnalysis | null>(null);
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-model architectural views
  const [graphView, setGraphView] = useState<ArchitectureViewMode>('overview');
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Deep deterministic data for multi-tier diagrams
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  const [relationships, setRelationships] = useState<RelationshipItem[]>([]);
  const [securityFindings, setSecurityFindings] = useState<SecurityFinding[]>([]);
  const [repoTree, setRepoTree] = useState<RepositoryTreeNode | null>(null);

  // Subtabs for detailed tables below the hero diagram
  const [activeTab, setActiveTab] = useState<'coupling' | 'cycles' | 'hotspots' | 'smells' | 'graph'>('coupling');

  const fetchLatest = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getArchitectureAnalyses(repositoryId, 0, 10);
      if (res.content.length > 0) {
        const latest = res.content[0];
        const full = await getArchitectureAnalysis(repositoryId, latest.id);
        setCurrentAnalysis(full);
        const g = await getArchitectureGraph(repositoryId, latest.id);
        setGraph(g);

        // Fetch deep deterministic data in parallel for multi-tier diagrams
        const aid = full.analysisId || latest.analysisId || latest.id;
        Promise.allSettled([
          getSymbols(repositoryId, aid, 0, 200),
          getRelationships(repositoryId, aid, 0, 200),
          getSecurityFindings(repositoryId, aid).catch(() => ({ content: [] })),
          repositoryApi.getTree(repositoryId).catch(() => null),
        ]).then(([symRes, relRes, secRes, treeRes]) => {
          if (symRes.status === 'fulfilled' && symRes.value) setSymbols(symRes.value.content || []);
          if (relRes.status === 'fulfilled' && relRes.value) setRelationships(relRes.value.content || []);
          if (secRes.status === 'fulfilled' && secRes.value) setSecurityFindings((secRes.value as any).content || []);
          if (treeRes.status === 'fulfilled' && treeRes.value) setRepoTree(treeRes.value);
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load architecture data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
  }, [repositoryId]);

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      const result = await analyzeArchitecture(repositoryId);
      setCurrentAnalysis(result);
      const g = await getArchitectureGraph(repositoryId, result.id);
      setGraph(g);

      const aid = result.analysisId || result.id;
      Promise.allSettled([
        getSymbols(repositoryId, aid, 0, 200),
        getRelationships(repositoryId, aid, 0, 200),
        getSecurityFindings(repositoryId, aid).catch(() => ({ content: [] })),
        repositoryApi.getTree(repositoryId).catch(() => null),
      ]).then(([symRes, relRes, secRes, treeRes]) => {
        if (symRes.status === 'fulfilled' && symRes.value) setSymbols(symRes.value.content || []);
        if (relRes.status === 'fulfilled' && relRes.value) setRelationships(relRes.value.content || []);
        if (secRes.status === 'fulfilled' && secRes.value) setSecurityFindings((secRes.value as any).content || []);
        if (treeRes.status === 'fulfilled' && treeRes.value) setRepoTree(treeRes.value);
      });
    } catch (err: any) {
      setError(err?.message || 'Architecture analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportReportPdf = async () => {
    if (!currentAnalysis) return;
    try {
      setExportingPdf(true);
      setError(null);
      await exportArchitectureReportPdf(
        repositoryId,
        currentAnalysis.analysisId || currentAnalysis.id
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Architecture Report PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  // Deterministic "How your system is connected" summary (no LLM)
  const systemExplanation = useMemo(() => {
    if (!currentAnalysis) return null;

    const pkgs = currentAnalysis.packageMetrics || [];
    const totalPkgs = currentAnalysis.totalPackages;
    const totalDeps = currentAnalysis.totalDependencies;

    if (pkgs.length === 0) {
      return `The repository contains ${totalPkgs} packages and ${totalDeps} dependency links. No module coupling metrics could be extracted.`;
    }

    // Find highest incoming coupling (central component)
    const highestAfferent = [...pkgs].sort((a, b) => b.afferentCoupling - a.afferentCoupling)[0];
    // Find highest outgoing coupling (dependency-heavy component)
    const highestEfferent = [...pkgs].sort((a, b) => b.efferentCoupling - a.efferentCoupling)[0];

    const avgInstability = (
      pkgs.reduce((acc, p) => acc + p.instability, 0) / pkgs.length
    ).toFixed(2);

    let parts: string[] = [];
    parts.push(
      `Your system consists of ${totalPkgs} indexed modules connected by ${totalDeps} dependency edges with an average instability index of ${avgInstability}.`
    );

    if (highestAfferent && highestAfferent.afferentCoupling > 0) {
      parts.push(
        `${highestAfferent.packageName} has the highest incoming coupling (${highestAfferent.afferentCoupling} dependents), serving as a core shared component.`
      );
    }

    if (highestEfferent && highestEfferent.efferentCoupling > 0 && highestEfferent !== highestAfferent) {
      parts.push(
        `${highestEfferent.packageName} has high outgoing coupling (${highestEfferent.efferentCoupling} dependencies), making it more susceptible to upstream changes.`
      );
    }

    if (currentAnalysis.cycleCount > 0) {
      parts.push(
        `Critical: ${currentAnalysis.cycleCount} cyclic dependency chain(s) break acyclic boundaries.`
      );
    } else {
      parts.push(
        `The architectural structure conforms to the Acyclic Dependencies Principle (ADP) with zero cyclic loops.`
      );
    }

    return parts.join(' ');
  }, [currentAnalysis]);

  // Aggregate Real Architectural Signals
  const architectureSignals = useMemo(() => {
    if (!currentAnalysis) return [];
    const signals: Array<{
      type: string;
      severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
      module: string;
      explanation: string;
      nodeId: string;
    }> = [];

    // Cycles
    (currentAnalysis.cycles || []).forEach((c) => {
      signals.push({
        type: 'Circular Dependency',
        severity: 'CRITICAL',
        module: c.members.join(' ↔ '),
        explanation: `${c.cycleType} cycle spanning ${c.length} nodes: breaks modular layered hierarchy.`,
        nodeId: c.members[0] || '',
      });
    });

    // Hotspots
    (currentAnalysis.hotspots || []).forEach((h) => {
      signals.push({
        type: `Architectural Hotspot (${h.hotspotType})`,
        severity: 'HIGH',
        module: h.symbolFqn,
        explanation: h.description,
        nodeId: h.symbolFqn,
      });
    });

    // Smells
    (currentAnalysis.smells || []).forEach((s) => {
      signals.push({
        type: s.smellType,
        severity: (s.severity?.toUpperCase() === 'CRITICAL' ? 'CRITICAL' : 'HIGH') as any,
        module: s.affectedElement,
        explanation: s.description,
        nodeId: s.affectedElement,
      });
    });

    // High instability / high coupling packages
    (currentAnalysis.packageMetrics || []).forEach((pm) => {
      if (pm.couplingCategory === 'HIGHLY_COUPLED') {
        signals.push({
          type: 'High Coupling',
          severity: 'HIGH',
          module: pm.packageName,
          explanation: `Package has high afferent (${pm.afferentCoupling}) and efferent (${pm.efferentCoupling}) coupling.`,
          nodeId: pm.packageName,
        });
      } else if (pm.instability > 0.8 && pm.efferentCoupling >= 3) {
        signals.push({
          type: 'High Instability',
          severity: 'MEDIUM',
          module: pm.packageName,
          explanation: `Instability I=${pm.instability.toFixed(2)}: depends heavily on ${pm.efferentCoupling} external packages.`,
          nodeId: pm.packageName,
        });
      }
    });

    return signals.slice(0, 8); // Top 8 signals
  }, [currentAnalysis]);

  const avgInstability = useMemo(() => {
    if (!currentAnalysis?.packageMetrics?.length) return 0;
    const sum = currentAnalysis.packageMetrics.reduce((a, b) => a + b.instability, 0);
    return sum / currentAnalysis.packageMetrics.length;
  }, [currentAnalysis]);

  const getCouplingBadge = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'CENTRAL':
        return (
          <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            CENTRAL
          </span>
        );
      case 'DEPENDENCY_HEAVY':
        return (
          <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(245, 139, 78, 0.15)', color: 'var(--ref-orange-3)', border: '1px solid rgba(245, 139, 78, 0.3)' }}>
            DEP HEAVY
          </span>
        );
      case 'HIGHLY_COUPLED':
        return (
          <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            HIGHLY COUPLED
          </span>
        );
      case 'ISOLATED':
        return (
          <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.08)', color: 'var(--ref-mute)' }}>
            ISOLATED
          </span>
        );
      default:
        return (
          <span style={{ fontSize: '0.64rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            BALANCED
          </span>
        );
    }
  };

  const getHotspotBadge = (type: string) => {
    switch (type) {
      case 'HUB':
        return <span style={{ fontSize: '0.64rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>CENTRAL HUB</span>;
      case 'HIGH_FAN_OUT':
        return <span style={{ fontSize: '0.64rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>HIGH FAN-OUT</span>;
      default:
        return <span style={{ fontSize: '0.64rem', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>CORE ABSTRACTION</span>;
    }
  };

  return (
    <div className="cm-canvas-grain relative overflow-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="cm-ambient-glow" />
      <div className="cm-ambient-glow-teal" />

      {/* ============ HEADER ============ */}
      <header className="analysis-header cm-clay-card relative z-10" style={{ padding: '24px 28px' }}>
        <div className="analysis-header-context" style={{ marginBottom: '12px' }}>
          <span>CodeMind AI</span>
          <span>/</span>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>Architecture</span>
          <span style={{ opacity: 0.4 }}>&bull;</span>
          <span className="cm-tag-pill cm-tag-pill-cyan">Topology &amp; Coupling</span>
        </div>

        <div className="analysis-header-main">
          <div className="analysis-title-group">
            <div className="cm-eyebrow">SYSTEM ARCHITECTURE INTELLIGENCE 2.0 &bull; TOPOLOGY &amp; COUPLING</div>
            <h1 className="text-2xl font-bold tracking-tight text-white">ARCHITECTURE INTELLIGENCE</h1>
            <p style={{ margin: '4px 0 8px 0', fontSize: '0.88rem', color: '#94a3b8' }}>
              Visualize how your repository is structured and connected.
            </p>
            <span style={{ display: 'none' }}>Deterministic Architecture Intelligence</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportReportPdf}
              disabled={exportingPdf || !currentAnalysis}
              className="cm-arrow-pill"
              style={{
                padding: '8px 8px 8px 16px',
                fontSize: '0.84rem',
              }}
              title="Download comprehensive multi-page Architecture Report PDF"
            >
              <span>{exportingPdf ? 'Generating PDF...' : 'Export Report (PDF)'}</span>
              <span className="cm-cta-dot">
                {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
              </span>
            </button>

            <button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className="cm-arrow-pill cm-arrow-pill-primary"
              style={{ padding: '8px 8px 8px 18px', fontSize: '0.84rem' }}
            >
              <span>{analyzing ? 'Analyzing Architecture...' : 'Analyze Architecture'}</span>
              <span className="cm-cta-dot">
                {analyzing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              </span>
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <Loader2 size={30} className="animate-spin text-orange-500" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--ref-mute)', fontSize: '0.85rem' }}>Loading architectural topology...</div>
        </div>
      )}

      {/* ============ ARCHITECTURE OVERVIEW COMPACT METRICS ============ */}
      {currentAnalysis && (
        <section className="engineering-overview-strip" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }} aria-label="Architecture Overview">
          <div className="overview-metric-cell">
            <span className="overview-metric-label">Packages</span>
            <span className="overview-metric-value">{currentAnalysis.totalPackages}</span>
            <span className="overview-metric-sub">Modules indexed</span>
          </div>

          <div className="overview-metric-cell">
            <span className="overview-metric-label">Dependencies</span>
            <span className="overview-metric-value">{currentAnalysis.totalDependencies}</span>
            <span className="overview-metric-sub">Directed edges</span>
          </div>

          <div className="overview-metric-cell" style={currentAnalysis.cycleCount > 0 ? { borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.05)' } : {}}>
            <span className="overview-metric-label" style={currentAnalysis.cycleCount > 0 ? { color: '#ef4444' } : {}}>Cycles</span>
            <span className="overview-metric-value" style={currentAnalysis.cycleCount > 0 ? { color: '#ef4444' } : {}}>
              {currentAnalysis.cycleCount}
            </span>
            <span className="overview-metric-sub">Cyclic loops</span>
          </div>

          <div className="overview-metric-cell">
            <span className="overview-metric-label">Hotspots</span>
            <span className="overview-metric-value" style={{ color: currentAnalysis.hotspotCount > 0 ? 'var(--ref-orange-3)' : '#ffffff' }}>
              {currentAnalysis.hotspotCount}
            </span>
            <span className="overview-metric-sub">Hubs &amp; abstractions</span>
          </div>

          <div className="overview-metric-cell">
            <span className="overview-metric-label">Coupling</span>
            <span className="overview-metric-value">
              {currentAnalysis.packageMetrics?.filter((p) => p.couplingCategory === 'HIGHLY_COUPLED').length || 0}
            </span>
            <span className="overview-metric-sub">Highly coupled pkgs</span>
          </div>

          <div className="overview-metric-cell">
            <span className="overview-metric-label">Avg Complexity</span>
            <span className="overview-metric-value" style={{ color: currentAnalysis.averageComplexity > 10 ? '#ef4444' : 'var(--ref-orange-3)' }}>
              {currentAnalysis.averageComplexity.toFixed(1)}
            </span>
            <span className="overview-metric-sub">Avg Instability: {avgInstability.toFixed(2)}</span>
          </div>
        </section>
      )}

      {/* ============ MAIN ARCHITECTURE DIAGRAM (PRIMARY HERO ELEMENT) ============ */}
      {currentAnalysis && graph && (
        <section aria-label="Main Architecture Diagram">
          <DependencyGraphViewer
            graph={graph}
            analysis={currentAnalysis}
            activeView={graphView}
            onViewChange={(view) => setGraphView(view)}
            selectedNodeId={focusedNodeId}
            onSelectNodeId={(id) => setFocusedNodeId(id)}
            symbols={symbols}
            relationships={relationships}
            securityFindings={securityFindings}
            tree={repoTree}
          />
        </section>
      )}

      {/* ============ ARCHITECTURE SIGNALS & EXPLANATION ROW ============ */}
      {currentAnalysis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Architecture Signals */}
          <div style={{ padding: '20px 22px', backgroundColor: '#0d1220', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={16} style={{ color: 'var(--ref-orange-3)' }} />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Architecture Signals ({architectureSignals.length})
                </h3>
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>
                Deterministic Topology
              </span>
            </div>

            {architectureSignals.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#070a12', borderRadius: '10px' }}>
                <CheckCircle2 size={24} style={{ color: '#10b981', margin: '0 auto 6px' }} />
                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.85rem' }}>Clean Architectural Health</div>
                <div style={{ color: 'var(--ref-mute)', fontSize: '0.74rem', marginTop: '2px' }}>
                  Zero circular dependency chains or abnormal coupling hotspots detected.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                {architectureSignals.map((signal, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (signal.nodeId) setFocusedNodeId(signal.nodeId);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#070a12',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s ease',
                    }}
                    className="finding-row"
                    title="Click to focus node in architecture graph"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor:
                              signal.severity === 'CRITICAL'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : signal.severity === 'HIGH'
                                ? 'rgba(245, 139, 78, 0.15)'
                                : 'rgba(56, 189, 248, 0.15)',
                            color:
                              signal.severity === 'CRITICAL'
                                ? '#ef4444'
                                : signal.severity === 'HIGH'
                                ? 'var(--ref-orange-3)'
                                : 'var(--accent-blue)',
                          }}
                        >
                          {signal.severity}
                        </span>
                        <strong style={{ fontSize: '0.78rem', color: '#ffffff' }}>{signal.type}</strong>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
                        Focus &rarr;
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#ffffff', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {signal.module}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--ref-mute)', marginTop: '2px' }}>
                      {signal.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Architecture Explanation ("How your system is connected") */}
          <div style={{ padding: '20px 22px', backgroundColor: '#0d1220', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Compass size={16} style={{ color: 'var(--accent-blue)' }} />
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                How Your System Is Connected
              </h3>
            </div>

            <div style={{ padding: '14px 16px', borderRadius: '10px', backgroundColor: '#070a12', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <p style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                {systemExplanation}
              </p>
              <div style={{ fontSize: '0.7rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>
                Deterministic graph synthesis derived from AST imports and symbol calls.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ DETAILED SUBTABS SECTION ============ */}
      {currentAnalysis && (
        <section style={{ marginTop: '12px' }}>
          <div className="flex border-b border-white/[0.08] gap-2 pb-2 text-xs overflow-x-auto mb-4">
            <button
              onClick={() => setActiveTab('coupling')}
              className={`feature-tab-btn ${activeTab === 'coupling' ? 'active' : ''}`}
            >
              <Layers className="w-3.5 h-3.5" />
              Package Coupling ({currentAnalysis.packageMetrics?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('cycles')}
              className={`feature-tab-btn ${activeTab === 'cycles' ? 'active' : ''}`}
            >
              <Repeat className="w-3.5 h-3.5" />
              Cycles ({currentAnalysis.cycles?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('hotspots')}
              className={`feature-tab-btn ${activeTab === 'hotspots' ? 'active' : ''}`}
            >
              <Flame className="w-3.5 h-3.5" />
              Hotspots ({currentAnalysis.hotspots?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('smells')}
              className={`feature-tab-btn ${activeTab === 'smells' ? 'active' : ''}`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Smells ({currentAnalysis.smells?.length || 0})
            </button>

            <button
              onClick={() => setActiveTab('graph')}
              className={`feature-tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
            >
              <Compass className="w-3.5 h-3.5" />
              Dependency Graph
            </button>
          </div>

          {/* Subtab 1: Package Coupling */}
          {activeTab === 'coupling' && (
            <div className="findings-table-container">
              <div style={{ padding: '10px 14px', backgroundColor: '#070a12', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.74rem', color: 'var(--ref-mute)' }}>
                Robert C. Martin&apos;s Package Coupling: Afferent Coupling (Ca = incoming callers), Efferent Coupling (Ce = outgoing dependencies), Instability I = Ce / (Ca + Ce)
              </div>
              <table className="findings-table">
                <thead>
                  <tr>
                    <th>Package Name</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Classes</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Interfaces</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Ca (In)</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Ce (Out)</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Instability</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentAnalysis.packageMetrics || []).map((m) => (
                    <tr
                      key={m.packageName}
                      className="finding-row"
                      onClick={() => setFocusedNodeId(m.packageName)}
                      title="Click to focus package in graph"
                    >
                      <td style={{ color: '#ffffff', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                        {m.packageName}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{m.classCount}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{m.interfaceCount}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#10b981', fontWeight: 700 }}>{m.afferentCoupling}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--ref-orange-3)', fontWeight: 700 }}>{m.efferentCoupling}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: m.instability > 0.7 ? '#ef4444' : '#ffffff', fontWeight: 600 }}>
                        {m.instability.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>{getCouplingBadge(m.couplingCategory)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Subtab 2: Cycles */}
          {activeTab === 'cycles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(currentAnalysis.cycles || []).length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#0d1220', borderRadius: '12px' }}>
                  <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 8px' }} />
                  <div style={{ color: '#ffffff', fontWeight: 700 }}>Acyclic Dependency Architecture</div>
                  <div style={{ color: 'var(--ref-mute)', fontSize: '0.78rem', marginTop: '4px' }}>
                    No cyclical dependencies detected between classes or packages. Satisfies Acyclic Dependencies Principle (ADP).
                  </div>
                </div>
              ) : (
                currentAnalysis.cycles.map((cycle, idx) => (
                  <div key={idx} style={{ padding: '14px 18px', borderRadius: '10px', backgroundColor: '#0d1220', borderLeft: '3px solid #ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#ef4444', fontFamily: 'var(--font-mono)' }}>
                        {cycle.cycleType} CYCLE
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>
                        Length: {cycle.length} nodes
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: '#fca5a5' }}>
                      {cycle.members.map((member, mIdx) => (
                        <React.Fragment key={mIdx}>
                          <span style={{ fontWeight: 700 }}>{member}</span>
                          <ArrowRight size={12} style={{ color: 'var(--ref-mute)' }} />
                        </React.Fragment>
                      ))}
                      <span style={{ fontWeight: 700 }}>{cycle.members[0]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Subtab 3: Hotspots */}
          {activeTab === 'hotspots' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
              {(currentAnalysis.hotspots || []).length === 0 ? (
                <div style={{ gridColumn: 'span 2', padding: '40px', textAlign: 'center', backgroundColor: '#0d1220', borderRadius: '12px' }}>
                  <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 8px' }} />
                  <div style={{ color: '#ffffff', fontWeight: 700 }}>No Critical Hotspots Identified</div>
                  <div style={{ color: 'var(--ref-mute)', fontSize: '0.78rem', marginTop: '4px' }}>
                    No classes or packages exceed excessive fan-out or hub thresholds.
                  </div>
                </div>
              ) : (
                currentAnalysis.hotspots.map((h, idx) => (
                  <div key={idx} style={{ padding: '14px 18px', borderRadius: '10px', backgroundColor: '#0d1220', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      {getHotspotBadge(h.hotspotType)}
                      <span style={{ fontSize: '0.72rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>
                        Degree: {h.totalDegree} (In: {h.fanIn}, Out: {h.fanOut})
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)', margin: '0 0 4px 0', wordBreak: 'break-all' }}>
                      {h.symbolFqn}
                    </h4>
                    <p style={{ fontSize: '0.74rem', color: 'var(--ref-ink-soft)', margin: 0 }}>
                      {h.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Subtab 4: Smells */}
          {activeTab === 'smells' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(currentAnalysis.smells || []).length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#0d1220', borderRadius: '12px' }}>
                  <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 8px' }} />
                  <div style={{ color: '#ffffff', fontWeight: 700 }}>Zero Architecture Smells Detected</div>
                  <div style={{ color: 'var(--ref-mute)', fontSize: '0.78rem', marginTop: '4px' }}>
                    The codebase adheres to clear modular separation without god classes or fragile fan-out hubs.
                  </div>
                </div>
              ) : (
                currentAnalysis.smells.map((smell, idx) => (
                  <div key={idx} style={{ padding: '14px 18px', borderRadius: '10px', backgroundColor: '#0d1220', border: '1px solid rgba(245, 139, 78, 0.25)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--ref-orange-3)', fontFamily: 'var(--font-mono)' }}>
                        {smell.smellType}
                      </span>
                      <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#ffffff' }}>
                        {smell.severity}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                      {smell.affectedElement}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ref-ink-soft)', margin: '0 0 8px 0' }}>
                      {smell.description}
                    </p>
                    <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.72rem', color: '#6ee7b7' }}>
                      <strong>Remediation:</strong> {smell.remediation}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Subtab 5: Dependency Graph view anchor */}
          {activeTab === 'graph' && (
            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#0d1220', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--ref-mute)', fontSize: '0.78rem' }}>
              The interactive dependency graph is displayed above in the primary hero canvas. Use the View Switcher (Overview, Dependencies, Cycles, Hotspots) and pan/zoom controls to interact with it.
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default ArchitectureAnalysisView;
