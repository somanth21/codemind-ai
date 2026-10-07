import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ArchitectureGraph,
  ArchitectureAnalysis,
} from '../../types/architecture';
import {
  aggregatePackageGraph,
  computeHierarchicalDagLayout,
  getPackageClasses,
  computeClassLayout,
} from './architectureGraphModel';
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Layers,
  Repeat,
  Flame,
  Info,
  X,
  Share2,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  Download,
  Cpu,
  FileCode,
  GitCommit,
  ListOrdered,
  Workflow,
  Database,
  Globe,
  Shield,
  Box,
} from 'lucide-react';
import { exportSvg, exportPng } from './exportUtils';
import { ComponentDiagram } from './diagrams/ComponentDiagram';
import { ClassDiagram } from './diagrams/ClassDiagram';
import { CallGraphDiagram } from './diagrams/CallGraphDiagram';
import { SequenceDiagram } from './diagrams/SequenceDiagram';
import { DataFlowDiagram } from './diagrams/DataFlowDiagram';
import { EntityDiagram } from './diagrams/EntityDiagram';
import { ApiMapDiagram } from './diagrams/ApiMapDiagram';
import { SecurityArchitectureDiagram } from './diagrams/SecurityArchitectureDiagram';
import { DeploymentDiagram } from './diagrams/DeploymentDiagram';
import { SymbolItem, RelationshipItem } from '../../types/analysis';
import { SecurityFinding } from '../../types/security';
import { RepositoryTreeNode } from '../../types/repository';

export type ArchitectureViewMode =
  | 'overview'
  | 'components'
  | 'dependencies'
  | 'classes'
  | 'callgraph'
  | 'sequence'
  | 'dataflow'
  | 'entities'
  | 'apimap'
  | 'security'
  | 'cycles'
  | 'hotspots'
  | 'deployment';

export interface DependencyGraphViewerProps {
  graph: ArchitectureGraph;
  analysis?: ArchitectureAnalysis | null;
  activeView?: ArchitectureViewMode;
  onViewChange?: (view: ArchitectureViewMode) => void;
  selectedNodeId?: string | null;
  onSelectNodeId?: (id: string | null) => void;
  symbols?: SymbolItem[];
  relationships?: RelationshipItem[];
  securityFindings?: SecurityFinding[];
  tree?: RepositoryTreeNode | null;
}

export const DependencyGraphViewer: React.FC<DependencyGraphViewerProps> = ({
  graph,
  analysis,
  activeView = 'overview',
  onViewChange,
  selectedNodeId,
  onSelectNodeId,
  symbols = [],
  relationships = [],
  securityFindings = [],
  tree = null,
}) => {
  // Internal state
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const activeSelectedId = selectedNodeId !== undefined ? selectedNodeId : internalSelectedId;

  const setSelectedId = useCallback(
    (id: string | null) => {
      setInternalSelectedId(id);
      if (onSelectNodeId) onSelectNodeId(id);
    },
    [onSelectNodeId]
  );

  const [search, setSearch] = useState('');
  const [showAllModules, setShowAllModules] = useState(false);

  // Drill-down state: null = package overview, string = drilled into a specific package
  const [drilledPackageId, setDrilledPackageId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // 1. Deterministically aggregate graph into package-level model
  const aggregated = useMemo(() => {
    return aggregatePackageGraph(graph, analysis);
  }, [graph, analysis]);

  // Packages to display (if >30 packages and not showAllModules, prioritize active/coupled ones)
  const visiblePackages = useMemo(() => {
    const pkgs = aggregated.packages;
    if (pkgs.length <= 30 || showAllModules) {
      return pkgs;
    }
    // Prioritize packages with dependencies or hotspot/cycle
    return pkgs
      .filter((p) => p.afferentCoupling > 0 || p.efferentCoupling > 0 || p.isHotspot || p.isInCycle)
      .slice(0, 30);
  }, [aggregated.packages, showAllModules]);

  const visiblePackageIds = useMemo(() => new Set(visiblePackages.map((p) => p.id)), [visiblePackages]);

  const visibleEdges = useMemo(() => {
    return aggregated.edges.filter(
      (e) => visiblePackageIds.has(e.source) && visiblePackageIds.has(e.target)
    );
  }, [aggregated.edges, visiblePackageIds]);

  // 2. Hierarchical DAG Layout calculation
  const layout = useMemo(() => {
    const containerWidth = containerRef.current?.clientWidth || 1100;
    const canvasWidth = Math.max(containerWidth, 1000);
    const canvasHeight = 620;
    return computeHierarchicalDagLayout(visiblePackages, visibleEdges, canvasWidth, canvasHeight);
  }, [visiblePackages, visibleEdges]);

  // 3. Drill-down data for currently opened package
  const drilledData = useMemo(() => {
    if (!drilledPackageId) return null;
    return getPackageClasses(drilledPackageId, graph);
  }, [drilledPackageId, graph]);

  const drilledClassLayout = useMemo(() => {
    if (!drilledData) return new Map();
    const containerWidth = containerRef.current?.clientWidth || 900;
    return computeClassLayout(drilledData.classes, containerWidth, 540);
  }, [drilledData]);

  // Cycle & Hotspot sets
  const cycleNodeSet = useMemo(() => {
    const set = new Set<string>();
    if (!analysis?.cycles) return set;
    analysis.cycles.forEach((c) => {
      c.members.forEach((m) => {
        set.add(m);
        // Also map to package
        const dot = m.lastIndexOf('.');
        if (dot > 0) set.add(m.substring(0, dot));
      });
    });
    return set;
  }, [analysis?.cycles]);

  const hotspotNodeSet = useMemo(() => {
    const set = new Set<string>();
    if (!analysis?.hotspots) return set;
    analysis.hotspots.forEach((h) => {
      set.add(h.symbolFqn);
      const dot = h.symbolFqn.lastIndexOf('.');
      if (dot > 0) set.add(h.symbolFqn.substring(0, dot));
    });
    return set;
  }, [analysis?.hotspots]);

  // Search match logic: finds matching package or package containing matching class/symbol
  const searchMatchedPackageId = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();

    // Check direct package match
    const pkgMatch = visiblePackages.find(
      (p) => p.id.toLowerCase().includes(q) || p.label.toLowerCase().includes(q)
    );
    if (pkgMatch) return pkgMatch.id;

    // Check class inside packages
    const classMatch = (graph.nodes || []).find(
      (n) => n.id.toLowerCase().includes(q) || n.label.toLowerCase().includes(q)
    );
    if (classMatch) {
      if (classMatch.metadata?.package) return classMatch.metadata.package;
      const dot = classMatch.id.lastIndexOf('.');
      if (dot > 0) return classMatch.id.substring(0, dot);
    }
    return null;
  }, [search, visiblePackages, graph.nodes]);

  // Selected package details
  const selectedPackage = useMemo(() => {
    if (!activeSelectedId) return null;
    const direct = visiblePackages.find(
      (p) => p.id === activeSelectedId || p.label === activeSelectedId
    );
    if (direct) return direct;
    // If activeSelectedId is a class or symbol, find the parent package
    const dot = activeSelectedId.lastIndexOf('.');
    if (dot > 0) {
      const parentPkg = activeSelectedId.substring(0, dot);
      return visiblePackages.find((p) => p.id === parentPkg || p.id.includes(parentPkg)) || null;
    }
    return null;
  }, [activeSelectedId, visiblePackages]);

  // Connected edges for selected package
  const selectedConnectedEdges = useMemo(() => {
    if (!selectedPackage) return [];
    return visibleEdges.filter(
      (e) => e.source === selectedPackage.id || e.target === selectedPackage.id
    );
  }, [selectedPackage, visibleEdges]);

  // Selected class in drill-down mode
  const selectedClassNode = useMemo(() => {
    if (!selectedClassId || !drilledData) return null;
    return drilledData.classes.find((c) => c.id === selectedClassId) || null;
  }, [selectedClassId, drilledData]);

  // Auto-focus on search match
  useEffect(() => {
    if (searchMatchedPackageId) {
      setSelectedId(searchMatchedPackageId);
    }
  }, [searchMatchedPackageId, setSelectedId]);

  // 4. Fit to Screen calculation
  const handleFitToScreen = useCallback(() => {
    if (drilledPackageId && drilledData) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      return;
    }

    if (!containerRef.current || visiblePackages.length === 0) {
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      return;
    }

    const containerWidth = containerRef.current.clientWidth || 1000;
    const containerHeight = containerRef.current.clientHeight || 560;

    const b = layout.bounds;
    const graphWidth = Math.max(100, b.maxX - b.minX);
    const graphHeight = Math.max(100, b.maxY - b.minY);

    const scaleX = (containerWidth - 60) / graphWidth;
    const scaleY = (containerHeight - 60) / graphHeight;
    const newZoom = Math.min(1.3, Math.max(0.45, Math.min(scaleX, scaleY)));

    const graphCenterX = (b.minX + b.maxX) / 2;
    const graphCenterY = (b.minY + b.maxY) / 2;

    const panX = containerWidth / 2 - graphCenterX * newZoom;
    const panY = containerHeight / 2 - graphCenterY * newZoom;

    setZoom(Number(newZoom.toFixed(2)));
    setPan({ x: Math.round(panX), y: Math.round(panY) });
  }, [drilledPackageId, drilledData, visiblePackages.length, layout.bounds]);

  // Reset graph
  const handleReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setSelectedId(null);
    setSelectedClassId(null);
    setSearch('');
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(3.0, Math.max(0.25, Number((z * zoomFactor).toFixed(2)))));
  };

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking empty canvas background
    const target = e.target as HTMLElement;
    if (target.tagName === 'svg' || target.tagName === 'rect' || target.classList.contains('canvas-bg')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const isSparseData = aggregated.packages.length <= 2;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0d1220',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        boxShadow: '0 20px 40px -16px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* 1. Header Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: '#070a12',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Left: View Switcher or Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {drilledPackageId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setDrilledPackageId(null);
                  setSelectedClassId(null);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={13} />
                <span>All Packages</span>
              </button>
              <ChevronRight size={14} style={{ color: 'var(--ref-mute)' }} />
              <span
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--ref-orange-3)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}
              >
                {drilledPackageId}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--ref-mute)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                ({drilledData?.classes.length || 0} classes)
              </span>
            </div>
          ) : (
            <>
              <div className="cm-pill-nav" role="tablist" style={{ overflowX: 'auto', maxWidth: '100%', padding: '4px' }}>
                {[
                  { id: 'overview' as const, label: 'Overview', icon: <Layers size={13} /> },
                  { id: 'components' as const, label: 'Components', icon: <Cpu size={13} /> },
                  { id: 'dependencies' as const, label: 'Dependencies', icon: <Share2 size={13} /> },
                  { id: 'classes' as const, label: 'Classes', icon: <FileCode size={13} /> },
                  { id: 'callgraph' as const, label: 'Call Graph', icon: <GitCommit size={13} /> },
                  { id: 'sequence' as const, label: 'Sequence', icon: <ListOrdered size={13} /> },
                  { id: 'dataflow' as const, label: 'Data Flow', icon: <Workflow size={13} /> },
                  { id: 'entities' as const, label: 'Entities', icon: <Database size={13} /> },
                  { id: 'apimap' as const, label: 'API Map', icon: <Globe size={13} /> },
                  { id: 'security' as const, label: 'Security', icon: <Shield size={13} /> },
                  {
                    id: 'cycles' as const,
                    label: `Cycles (${analysis?.cycleCount ?? 0})`,
                    icon: <Repeat size={13} />,
                  },
                  {
                    id: 'hotspots' as const,
                    label: `Hotspots (${analysis?.hotspotCount ?? 0})`,
                    icon: <Flame size={13} />,
                  },
                  { id: 'deployment' as const, label: 'Deployment', icon: <Box size={13} /> },
                ].map((view) => (
                  <button
                    key={view.id}
                    onClick={() => {
                      if (onViewChange) onViewChange(view.id as any);
                    }}
                    className={`cm-pill-tab ${activeView === view.id ? 'active' : ''}`}
                  >
                    {view.icon}
                    <span>{view.label}</span>
                  </button>
                ))}
              </div>

              {/* Show all modules toggle if >30 packages */}
              {aggregated.packages.length > 30 && (
                <button
                  type="button"
                  onClick={() => setShowAllModules((v) => !v)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: showAllModules ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: showAllModules ? '#38bdf8' : 'var(--ref-mute)',
                    border: '1px solid',
                    borderColor: showAllModules ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                  }}
                >
                  {showAllModules
                    ? `Showing all (${aggregated.packages.length})`
                    : `Show all modules (${aggregated.packages.length})`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Center: Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '6px',
              padding: '4px 8px',
            }}
          >
            <Search size={13} style={{ color: 'var(--ref-mute)' }} />
            <input
              type="text"
              placeholder="Search package, class, symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.74rem',
                outline: 'none',
                width: '180px',
                fontFamily: 'var(--font-mono)',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--ref-mute)', cursor: 'pointer', padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Zoom & Reset Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => svgRef.current && exportSvg(svgRef.current, `architecture-${activeView}`)}
            style={{
              background: '#0d1220',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.7rem',
              marginRight: '4px',
            }}
            title="Export Diagram as SVG"
            aria-label="Export SVG"
          >
            <Download size={12} />
            <span>SVG</span>
          </button>
          <button
            onClick={() => svgRef.current && exportPng(svgRef.current, `architecture-${activeView}`)}
            style={{
              background: '#0d1220',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.7rem',
              marginRight: '6px',
            }}
            title="Export Diagram as PNG"
            aria-label="Export PNG"
          >
            <Download size={12} />
            <span>PNG</span>
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, Number((z - 0.15).toFixed(2))))}
            style={{
              background: '#0d1220',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              padding: '5px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--ref-mute)',
              fontFamily: 'var(--font-mono)',
              width: '44px',
              textAlign: 'center',
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))))}
            style={{
              background: '#0d1220',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              padding: '5px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={handleFitToScreen}
            style={{
              background: '#0d1220',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              padding: '5px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Fit to Screen"
            aria-label="Fit to Screen"
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={handleReset}
            style={{
              background: '#0d1220',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              padding: '5px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Reset Graph"
            aria-label="Reset Graph"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Sparse Data Truth Notice (Correction 2) */}
      {isSparseData && !drilledPackageId && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.18)',
            color: 'var(--accent-blue)',
            fontSize: '0.74rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Info size={14} style={{ flexShrink: 0 }} />
          <span>
            Architecture visibility is limited because only {aggregated.packages.length} package/module
            relationships were detected in this analysis run.
          </span>
        </div>
      )}

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'row',
          minHeight: '520px',
          height: '65vh',
          maxHeight: '740px',
          backgroundColor: '#070a12',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        {/* SVG Drawing Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {activeView === 'components' ? (
            <ComponentDiagram graph={graph} analysis={analysis} symbols={symbols} relationships={relationships} />
          ) : activeView === 'classes' ? (
            <ClassDiagram graph={graph} analysis={analysis} symbols={symbols} relationships={relationships} />
          ) : activeView === 'callgraph' ? (
            <CallGraphDiagram graph={graph} analysis={analysis} symbols={symbols} relationships={relationships} />
          ) : activeView === 'sequence' ? (
            <SequenceDiagram graph={graph} analysis={analysis} symbols={symbols} relationships={relationships} />
          ) : activeView === 'dataflow' ? (
            <DataFlowDiagram graph={graph} analysis={analysis} symbols={symbols} relationships={relationships} />
          ) : activeView === 'entities' ? (
            <EntityDiagram graph={graph} analysis={analysis} symbols={symbols} relationships={relationships} />
          ) : activeView === 'apimap' ? (
            <ApiMapDiagram graph={graph} analysis={analysis} symbols={symbols} relationships={relationships} />
          ) : activeView === 'security' ? (
            <SecurityArchitectureDiagram graph={graph} analysis={analysis} symbols={symbols} relationships={relationships} securityFindings={securityFindings} />
          ) : activeView === 'deployment' ? (
            <DeploymentDiagram graph={graph} analysis={analysis} tree={tree} />
          ) : (
            <>
              {visiblePackages.length === 0 && !drilledPackageId ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--ref-mute)',
                gap: '8px',
                fontSize: '0.82rem',
              }}
            >
              <Layers size={28} />
              <span>No package modules detected in this repository</span>
            </div>
          ) : activeView === 'cycles' && cycleNodeSet.size === 0 && !drilledPackageId ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--ref-mute)',
                gap: '8px',
                fontSize: '0.82rem',
              }}
            >
              <Repeat size={28} style={{ color: '#10b981' }} />
              <span style={{ color: '#ffffff', fontWeight: 600 }}>No Dependency Cycles Detected</span>
              <span style={{ fontSize: '0.74rem' }}>
                The repository satisfies the Acyclic Dependencies Principle (ADP).
              </span>
            </div>
          ) : activeView === 'hotspots' && hotspotNodeSet.size === 0 && !drilledPackageId ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--ref-mute)',
                gap: '8px',
                fontSize: '0.82rem',
              }}
            >
              <Flame size={28} style={{ color: '#10b981' }} />
              <span style={{ color: '#ffffff', fontWeight: 600 }}>No Critical Hotspots Identified</span>
              <span style={{ fontSize: '0.74rem' }}>
                Coupling fan-in and fan-out remain within healthy thresholds.
              </span>
            </div>
          ) : (
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              style={{
                width: '100%',
                height: '100%',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease',
              }}
            >
              <defs>
                <marker
                  id="pkg-arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="10"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#475569" />
                </marker>
                <marker
                  id="pkg-arrowhead-active"
                  markerWidth="9"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 9 3.5, 0 7" fill="#e85a2b" />
                </marker>
                <marker
                  id="pkg-arrowhead-incoming"
                  markerWidth="9"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 9 3.5, 0 7" fill="#10b981" />
                </marker>
                <marker
                  id="pkg-arrowhead-cycle"
                  markerWidth="9"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 9 3.5, 0 7" fill="#ef4444" />
                </marker>

                {/* Subtle dot pattern */}
                <pattern
                  id="arch-grid"
                  width="36"
                  height="36"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="18" cy="18" r="1" fill="rgba(255, 255, 255, 0.05)" />
                </pattern>
              </defs>

              <rect
                width={layout.width}
                height={layout.height}
                fill="url(#arch-grid)"
                className="canvas-bg"
              />

              {/* VIEW 1: PACKAGE LEVEL DAG (Default) */}
              {!drilledPackageId && (
                <>
                  {/* Aggregated Package Edges */}
                  {visibleEdges.map((edge) => {
                    const srcPos = layout.positions.get(edge.source);
                    const tgtPos = layout.positions.get(edge.target);
                    if (!srcPos || !tgtPos) return null;

                    const srcX = srcPos.x + srcPos.width / 2;
                    const srcY = srcPos.y + srcPos.height;
                    const tgtX = tgtPos.x + tgtPos.width / 2;
                    const tgtY = tgtPos.y;

                    const isConnected =
                      selectedPackage &&
                      (edge.source === selectedPackage.id || edge.target === selectedPackage.id);
                    const isOutgoing = selectedPackage && edge.source === selectedPackage.id;
                    const isIncoming = selectedPackage && edge.target === selectedPackage.id;

                    const isCycleEdge =
                      cycleNodeSet.has(edge.source) && cycleNodeSet.has(edge.target);

                    // Dynamic stroke thickness based on dependency weight
                    const strokeWidth = Math.min(5, Math.max(1.5, 1.2 + Math.log2(edge.weight)));

                    // Route with clean bezier curve
                    const deltaY = tgtY - srcY;
                    const curvature = Math.max(40, Math.abs(deltaY) * 0.4);
                    const pathData = `M ${srcX} ${srcY} C ${srcX} ${srcY + curvature}, ${tgtX} ${tgtY - curvature}, ${tgtX} ${tgtY}`;

                    // Midpoint for count badge
                    const midX = (srcX + tgtX) / 2;
                    const midY = (srcY + tgtY) / 2;

                    let strokeColor = 'rgba(255, 255, 255, 0.15)';
                    let marker = 'url(#pkg-arrowhead)';

                    if (isCycleEdge && activeView === 'cycles') {
                      strokeColor = '#ef4444';
                      marker = 'url(#pkg-arrowhead-cycle)';
                    } else if (isOutgoing) {
                      strokeColor = '#e85a2b';
                      marker = 'url(#pkg-arrowhead-active)';
                    } else if (isIncoming) {
                      strokeColor = '#10b981';
                      marker = 'url(#pkg-arrowhead-incoming)';
                    } else if (activeView === 'dependencies') {
                      strokeColor = edge.weight >= 2 ? 'rgba(56, 189, 248, 0.65)' : 'rgba(255, 255, 255, 0.12)';
                    }

                    // Faded if not in cycles / hotspots view
                    const opacity =
                      activeView === 'cycles' && !isCycleEdge
                        ? 0.12
                        : activeView === 'hotspots' &&
                          (!hotspotNodeSet.has(edge.source) && !hotspotNodeSet.has(edge.target))
                        ? 0.15
                        : selectedPackage && !isConnected
                        ? 0.15
                        : 0.9;

                    return (
                      <g key={edge.id} opacity={opacity}>
                        <path
                          d={pathData}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isConnected ? strokeWidth + 1 : strokeWidth}
                          markerEnd={marker}
                          strokeDasharray={isCycleEdge ? '4 3' : undefined}
                        />

                        {/* Edge weight badge if selected or in dependencies view */}
                        {(isConnected || activeView === 'dependencies' || edge.weight > 3) && (
                          <g transform={`translate(${midX}, ${midY})`}>
                            <rect
                              x="-14"
                              y="-9"
                              width="28"
                              height="18"
                              rx="9"
                              fill="#070a12"
                              stroke={strokeColor}
                              strokeWidth="1"
                            />
                            <text
                              textAnchor="middle"
                              y="3"
                              fill="#ffffff"
                              fontSize="9"
                              fontFamily="var(--font-mono)"
                              fontWeight={700}
                            >
                              {edge.weight}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Aggregated Package Nodes */}
                  {visiblePackages.map((pkg) => {
                    const pos = layout.positions.get(pkg.id);
                    if (!pos) return null;

                    const isSelected = selectedPackage?.id === pkg.id;
                    const isCycle = cycleNodeSet.has(pkg.id);
                    const isHotspot = hotspotNodeSet.has(pkg.id);
                    const isSearchMatch = searchMatchedPackageId === pkg.id;

                    let opacity = 1;
                    if (activeView === 'cycles' && !isCycle) opacity = 0.2;
                    else if (activeView === 'hotspots' && !isHotspot) opacity = 0.2;
                    else if (selectedPackage && !isSelected && !selectedConnectedEdges.some((e) => e.source === pkg.id || e.target === pkg.id)) {
                      opacity = 0.35;
                    }

                    return (
                      <g
                        key={pkg.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(pkg.id);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setDrilledPackageId(pkg.id);
                        }}
                        opacity={opacity}
                        style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
                      >
                        {/* Selected / Match Glow */}
                        {(isSelected || isSearchMatch) && (
                          <rect
                            x="-4"
                            y="-4"
                            width={pos.width + 8}
                            height={pos.height + 8}
                            rx="10"
                            fill="none"
                            stroke="#e85a2b"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                            opacity="0.9"
                          />
                        )}

                        {/* Cycle border glow */}
                        {isCycle && activeView === 'cycles' && (
                          <rect
                            x="-4"
                            y="-4"
                            width={pos.width + 8}
                            height={pos.height + 8}
                            rx="10"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2"
                          />
                        )}

                        {/* Main Package Card */}
                        <rect
                          width={pos.width}
                          height={pos.height}
                          rx="8"
                          fill={
                            isSelected
                              ? 'rgba(232, 90, 43, 0.16)'
                              : isHotspot
                              ? 'rgba(245, 139, 78, 0.12)'
                              : isCycle
                              ? 'rgba(239, 68, 68, 0.12)'
                              : '#0d1220'
                          }
                          stroke={
                            isSelected
                              ? '#e85a2b'
                              : isCycle
                              ? '#ef4444'
                              : isHotspot
                              ? 'var(--ref-orange-3)'
                              : 'rgba(255, 255, 255, 0.12)'
                          }
                          strokeWidth={isSelected ? 2 : 1}
                        />

                        {/* Top Indicator Strip */}
                        <rect
                          width={pos.width}
                          height="3"
                          rx="1.5"
                          fill={
                            isCycle
                              ? '#ef4444'
                              : isHotspot
                              ? 'var(--ref-orange-3)'
                              : pkg.instability > 0.7
                              ? '#f43f5e'
                              : '#8b5cf6'
                          }
                        />

                        {/* Package Name Label */}
                        <text
                          x="10"
                          y="22"
                          fill="#ffffff"
                          fontSize="11"
                          fontFamily="var(--font-mono)"
                          fontWeight={isSelected ? 700 : 600}
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {pkg.label.length > 20
                            ? pkg.label.substring(0, 18) + '…'
                            : pkg.label}
                        </text>

                        {/* Subtitle / Metadata Pill */}
                        <text
                          x="10"
                          y="42"
                          fill="var(--ref-mute)"
                          fontSize="9"
                          fontFamily="var(--font-mono)"
                          style={{ pointerEvents: 'none', userSelect: 'none' }}
                        >
                          {pkg.classCount} {pkg.classCount === 1 ? 'class' : 'classes'}
                        </text>

                        {/* Coupling Pill on Right */}
                        <g transform={`translate(${pos.width - 50}, 30)`}>
                          <rect
                            width="42"
                            height="16"
                            rx="4"
                            fill="rgba(255, 255, 255, 0.05)"
                            stroke="rgba(255, 255, 255, 0.08)"
                            strokeWidth="1"
                          />
                          <text
                            x="21"
                            y="11"
                            textAnchor="middle"
                            fill={pkg.instability > 0.7 ? '#ef4444' : '#10b981'}
                            fontSize="8.5"
                            fontFamily="var(--font-mono)"
                            fontWeight={700}
                          >
                            I:{pkg.instability.toFixed(2)}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </>
              )}

              {/* VIEW 2: DRILLED DOWN PACKAGE DETAIL (Classes inside Package) */}
              {drilledPackageId && drilledData && (
                <>
                  {/* Internal class edges within package */}
                  {drilledData.internalEdges.map((edge) => {
                    const srcPos = drilledClassLayout.get(edge.source);
                    const tgtPos = drilledClassLayout.get(edge.target);
                    if (!srcPos || !tgtPos) return null;

                    const srcX = srcPos.x + srcPos.width / 2;
                    const srcY = srcPos.y + srcPos.height / 2;
                    const tgtX = tgtPos.x + tgtPos.width / 2;
                    const tgtY = tgtPos.y + tgtPos.height / 2;

                    return (
                      <line
                        key={edge.id}
                        x1={srcX}
                        y1={srcY}
                        x2={tgtX}
                        y2={tgtY}
                        stroke="rgba(56, 189, 248, 0.4)"
                        strokeWidth={1.5}
                        markerEnd="url(#pkg-arrowhead)"
                      />
                    );
                  })}

                  {/* Class Nodes inside Package */}
                  {drilledData.classes.map((cls) => {
                    const pos = drilledClassLayout.get(cls.id);
                    if (!pos) return null;

                    const isClassSelected = selectedClassId === cls.id;
                    const isHotspot = hotspotNodeSet.has(cls.id) || hotspotNodeSet.has(cls.label);

                    return (
                      <g
                        key={cls.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClassId(cls.id);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {isClassSelected && (
                          <rect
                            x="-3"
                            y="-3"
                            width={pos.width + 6}
                            height={pos.height + 6}
                            rx="8"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2"
                          />
                        )}

                        <rect
                          width={pos.width}
                          height={pos.height}
                          rx="6"
                          fill={isClassSelected ? 'rgba(56, 189, 248, 0.15)' : '#0d1220'}
                          stroke={isClassSelected ? '#38bdf8' : isHotspot ? 'var(--ref-orange-3)' : 'rgba(255, 255, 255, 0.12)'}
                          strokeWidth="1"
                        />

                        {/* Class Kind tag */}
                        <rect
                          x="8"
                          y="8"
                          width="24"
                          height="14"
                          rx="3"
                          fill={cls.type === 'INTERFACE' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(56, 189, 248, 0.15)'}
                        />
                        <text
                          x="20"
                          y="18"
                          textAnchor="middle"
                          fill={cls.type === 'INTERFACE' ? '#06b6d4' : '#38bdf8'}
                          fontSize="7.5"
                          fontFamily="var(--font-mono)"
                          fontWeight={800}
                        >
                          {cls.type === 'INTERFACE' ? 'INT' : 'CLS'}
                        </text>

                        {/* Class Name */}
                        <text
                          x="38"
                          y="20"
                          fill="#ffffff"
                          fontSize="10"
                          fontFamily="var(--font-mono)"
                          fontWeight={isClassSelected ? 700 : 500}
                        >
                          {cls.label.length > 18 ? cls.label.substring(0, 16) + '…' : cls.label}
                        </text>

                        {/* File / Subtitle */}
                        <text
                          x="8"
                          y="38"
                          fill="var(--ref-mute)"
                          fontSize="8"
                          fontFamily="var(--font-mono)"
                        >
                          {cls.metadata?.filePath ? cls.metadata.filePath.split('/').pop() : cls.id}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}
            </svg>
          )}

          {/* Minimap status tag in bottom corner */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '14px',
              fontSize: '0.68rem',
              color: 'var(--ref-mute)',
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'rgba(7, 10, 18, 0.85)',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              pointerEvents: 'none',
            }}
          >
            {drilledPackageId ? (
              <>
                <span>Classes: {drilledData?.classes.length || 0}</span>
                <span style={{ margin: '0 6px', opacity: 0.3 }}>&bull;</span>
                <span>Package Detail View</span>
              </>
            ) : (
              <>
                <span>Packages: {visiblePackages.length}</span>
                <span style={{ margin: '0 6px', opacity: 0.3 }}>&bull;</span>
                <span>Edges: {visibleEdges.length}</span>
                <span style={{ margin: '0 6px', opacity: 0.3 }}>&bull;</span>
                <span>Double-click package to open</span>
              </>
            )}
          </div>
            </>
          )}
        </div>

        {/* 2. Side-Docked Inspector (340px width) */}
        {selectedPackage && !drilledPackageId && (activeView === 'overview' || activeView === 'dependencies' || activeView === 'cycles' || activeView === 'hotspots') && (
          <aside
            style={{
              width: '340px',
              backgroundColor: '#0a0f1d',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
              zIndex: 10,
              boxShadow: '-6px 0 20px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#8b5cf6',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  PACKAGE MODULE
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--ref-mute)',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  title="Close inspector"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Title & Drill-down Button */}
              <div>
                <h4
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    fontFamily: 'var(--font-mono)',
                    margin: '0 0 4px 0',
                    wordBreak: 'break-all',
                  }}
                >
                  {selectedPackage.packageName}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setDrilledPackageId(selectedPackage.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      backgroundColor: 'rgba(232, 90, 43, 0.2)',
                      color: 'var(--ref-orange-3)',
                      border: '1px solid rgba(232, 90, 43, 0.4)',
                      cursor: 'pointer',
                    }}
                  >
                    <FolderOpen size={12} />
                    <span>Open Package</span>
                  </button>
                  <span style={{ fontSize: '0.7rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>
                    {selectedPackage.classCount} classes
                  </span>
                </div>
              </div>

              {/* Real Coupling & Instability Metrics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#070a12',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.64rem', color: 'var(--ref-mute)', textTransform: 'uppercase' }}>
                    Afferent (Ca)
                  </span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                    {selectedPackage.afferentCoupling}
                  </div>
                  <span style={{ fontSize: '0.64rem', color: 'var(--ref-mute)' }}>Incoming callers</span>
                </div>

                <div>
                  <span style={{ fontSize: '0.64rem', color: 'var(--ref-mute)', textTransform: 'uppercase' }}>
                    Efferent (Ce)
                  </span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--ref-orange-3)', fontFamily: 'var(--font-mono)' }}>
                    {selectedPackage.efferentCoupling}
                  </div>
                  <span style={{ fontSize: '0.64rem', color: 'var(--ref-mute)' }}>Outgoing deps</span>
                </div>

                <div style={{ gridColumn: 'span 2', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--ref-mute)' }}>Instability (I = Ce/(Ca+Ce)):</span>
                    <strong style={{ color: selectedPackage.instability > 0.7 ? '#ef4444' : '#10b981' }}>
                      {selectedPackage.instability.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Architectural Hotspot & Cycle Notice */}
              {selectedPackage.isHotspot && (
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(245, 139, 78, 0.1)',
                    border: '1px solid rgba(245, 139, 78, 0.3)',
                    color: 'var(--ref-orange-3)',
                    fontSize: '0.72rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Flame size={14} />
                  <span>Identified Architectural Hotspot / High Centrality</span>
                </div>
              )}

              {selectedPackage.isInCycle && (
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                    fontSize: '0.72rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ShieldAlert size={14} />
                  <span>Participates in Circular Dependency Chain</span>
                </div>
              )}

              {/* Connected Dependencies */}
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    fontFamily: 'var(--font-mono)',
                    marginBottom: '6px',
                    display: 'block',
                  }}
                >
                  Package Dependencies ({selectedConnectedEdges.length}):
                </span>
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedConnectedEdges.length === 0 ? (
                    <div style={{ fontSize: '0.7rem', color: 'var(--ref-mute)', fontStyle: 'italic' }}>
                      Isolated package with 0 external inter-package edges.
                    </div>
                  ) : (
                    selectedConnectedEdges.map((e) => {
                      const isOut = e.source === selectedPackage.id;
                      const partner = isOut ? e.target : e.source;
                      return (
                        <div
                          key={e.id}
                          onClick={() => setSelectedId(partner)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#070a12',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: isOut ? 'var(--ref-orange-3)' : '#10b981', fontWeight: 700 }}>
                              {isOut ? `→ OUT (${e.weight} deps)` : `← IN (${e.weight} deps)`}
                            </span>
                            <span style={{ color: 'var(--ref-mute)', fontSize: '0.64rem' }}>Focus</span>
                          </div>
                          <div style={{ color: '#ffffff', marginTop: '2px', wordBreak: 'break-all' }}>
                            {partner}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.68rem', color: 'var(--ref-mute)' }}>
              Deterministic Package Topology
            </div>
          </aside>
        )}

        {/* 3. Class Inspector (when drilled down and a class is selected) */}
        {drilledPackageId && selectedClassNode && (
          <aside
            style={{
              width: '340px',
              backgroundColor: '#0a0f1d',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto',
              zIndex: 10,
              boxShadow: '-6px 0 20px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '0.64rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#38bdf8',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {selectedClassNode.type} DETAIL
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedClassId(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--ref-mute)', cursor: 'pointer', padding: '2px' }}
                >
                  <X size={15} />
                </button>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)', margin: 0, wordBreak: 'break-all' }}>
                  {selectedClassNode.label}
                </h4>
                <div style={{ fontSize: '0.68rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)', marginTop: '2px', wordBreak: 'break-all' }}>
                  {selectedClassNode.id}
                </div>
              </div>

              {selectedClassNode.metadata?.filePath && (
                <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#070a12', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ fontSize: '0.64rem', color: 'var(--ref-mute)', textTransform: 'uppercase' }}>File Location</div>
                  <div style={{ fontSize: '0.72rem', color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '2px', wordBreak: 'break-all' }}>
                    {selectedClassNode.metadata.filePath}
                  </div>
                  {selectedClassNode.metadata.startLine && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      Lines: {selectedClassNode.metadata.startLine} - {selectedClassNode.metadata.endLine || '?'}
                    </div>
                  )}
                </div>
              )}

              {/* Class Calls and Called By */}
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)', marginBottom: '6px', display: 'block' }}>
                  Class Relationships:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {graph.edges
                    ?.filter((e) => e.source === selectedClassNode.id || e.target === selectedClassNode.id)
                    .map((e) => {
                      const isOut = e.source === selectedClassNode.id;
                      const partner = isOut ? e.target : e.source;
                      return (
                        <div
                          key={e.id}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#070a12',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            fontSize: '0.68rem',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          <span style={{ color: isOut ? 'var(--ref-orange-3)' : '#10b981', fontWeight: 700 }}>
                            {isOut ? `CALLS →` : `CALLED BY ←`}
                          </span>
                          <div style={{ color: '#ffffff', marginTop: '2px', wordBreak: 'break-all' }}>
                            {partner.split('.').pop()}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.68rem', color: 'var(--ref-mute)' }}>
              Deterministic Class AST Symbol
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default DependencyGraphViewer;
