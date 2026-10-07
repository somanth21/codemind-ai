import React, { useState, useMemo, useRef } from 'react';
import { ArchitectureGraph, ArchitectureAnalysis } from '../../../types/architecture';
import { SymbolItem, RelationshipItem } from '../../../types/analysis';
import { Layers, ZoomIn, ZoomOut, RotateCcw, Download, Info, Database, Cpu, Globe, Server } from 'lucide-react';
import { exportSvg, exportPng } from '../exportUtils';

interface ComponentDiagramProps {
  graph: ArchitectureGraph;
  analysis?: ArchitectureAnalysis | null;
  symbols?: SymbolItem[];
  relationships?: RelationshipItem[];
}

interface ComponentNode {
  id: string;
  name: string;
  fqn: string;
  tier: number; // 0: Presentation, 1: Application/Service, 2: Domain, 3: Persistence/Data, 4: Infrastructure
  tierName: string;
  kind: string;
  methodsCount: number;
  fanIn: number;
  fanOut: number;
}

const TIERS = [
  { id: 0, name: 'Presentation & API Layer', icon: Globe, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.08)', border: '#38bdf8' },
  { id: 1, name: 'Application & Business Services', icon: Cpu, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.08)', border: '#a855f7' },
  { id: 2, name: 'Domain Models & Entities', icon: Layers, color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)', border: '#10b981' },
  { id: 3, name: 'Data Access & Repositories', icon: Database, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: '#f59e0b' },
  { id: 4, name: 'Infrastructure & Security', icon: Server, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.08)', border: '#ec4899' },
];

export const ComponentDiagram: React.FC<ComponentDiagramProps> = ({
  graph,
  analysis: _analysis,
  symbols = [],
  relationships = [],
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedComponent, setSelectedComponent] = useState<ComponentNode | null>(null);
  const [filterTier, setFilterTier] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Group classes / symbols into tiers deterministically
  const componentNodes = useMemo(() => {
    // If symbols exist, use class symbols; otherwise extract from graph nodes
    const classSymbols = symbols.filter(
      (s) => s.kind === 'CLASS' || s.kind === 'INTERFACE' || s.kind === 'RECORD'
    );

    const nodes: ComponentNode[] = [];
    const sourceList = classSymbols.length > 0 ? classSymbols : graph.nodes.map((n) => ({
      id: n.id,
      name: n.label,
      fqn: n.id,
      kind: n.type || 'CLASS',
    }));

    sourceList.forEach((item) => {
      const name = item.name.toLowerCase();
      const fqn = (item.fqn || item.name).toLowerCase();
      let tier = 1; // default to application service

      if (
        name.includes('controller') ||
        name.includes('resource') ||
        name.includes('endpoint') ||
        fqn.includes('.controller.') ||
        fqn.includes('.web.') ||
        fqn.includes('.rest.') ||
        fqn.includes('.api.')
      ) {
        tier = 0;
      } else if (
        name.includes('repository') ||
        name.includes('dao') ||
        name.includes('mapper') ||
        fqn.includes('.repository.') ||
        fqn.includes('.dao.')
      ) {
        tier = 3;
      } else if (
        name.includes('entity') ||
        name.includes('model') ||
        name.includes('dto') ||
        name.includes('record') ||
        fqn.includes('.entity.') ||
        fqn.includes('.model.') ||
        fqn.includes('.domain.')
      ) {
        tier = 2;
      } else if (
        name.includes('config') ||
        name.includes('security') ||
        name.includes('filter') ||
        name.includes('client') ||
        name.includes('util') ||
        fqn.includes('.config.') ||
        fqn.includes('.security.') ||
        fqn.includes('.infrastructure.')
      ) {
        tier = 4;
      } else {
        tier = 1;
      }

      // Compute fanIn and fanOut
      const fanIn = relationships.filter((r) => r.targetFqn === item.fqn || r.targetSymbolId === item.id).length;
      const fanOut = relationships.filter((r) => r.sourceFqn === item.fqn || r.sourceSymbolId === item.id).length;

      nodes.push({
        id: item.id,
        name: item.name,
        fqn: item.fqn || item.name,
        tier,
        tierName: TIERS[tier].name,
        kind: item.kind,
        methodsCount: symbols.filter((s) => s.parentSymbolId === item.id && s.kind === 'METHOD').length,
        fanIn,
        fanOut,
      });
    });

    return nodes;
  }, [symbols, graph.nodes, relationships]);

  // Group nodes by tier
  const tierGroups = useMemo(() => {
    const groups: { [key: number]: ComponentNode[] } = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    componentNodes.forEach((node) => {
      if (groups[node.tier]) {
        groups[node.tier].push(node);
      }
    });
    return groups;
  }, [componentNodes]);

  // Layout positions: 5 tiers arranged vertically
  const layout = useMemo(() => {
    const canvasWidth = 1100;
    const tierHeight = 130;
    const paddingY = 40;
    const nodeWidth = 190;
    const nodeHeight = 52;
    const gapX = 20;

    const positions = new Map<string, { x: number; y: number; width: number; height: number }>();

    TIERS.forEach((tier) => {
      const items = tierGroups[tier.id] || [];
      const visibleItems = items.slice(0, 5); // display top 5 per tier to prevent overcrowding
      const totalWidth = visibleItems.length * nodeWidth + Math.max(0, visibleItems.length - 1) * gapX;
      const startX = Math.max(60, (canvasWidth - totalWidth) / 2);
      const startY = paddingY + tier.id * tierHeight;

      visibleItems.forEach((item, index) => {
        positions.set(item.id, {
          x: startX + index * (nodeWidth + gapX),
          y: startY + 28,
          width: nodeWidth,
          height: nodeHeight,
        });
      });
    });

    return {
      positions,
      width: canvasWidth,
      height: paddingY * 2 + TIERS.length * tierHeight,
    };
  }, [tierGroups]);

  // Inter-tier connections
  const connections = useMemo(() => {
    const edges: { source: string; target: string; type: string }[] = [];
    relationships.forEach((rel) => {
      if (layout.positions.has(rel.sourceSymbolId || '') && layout.positions.has(rel.targetSymbolId || '')) {
        edges.push({
          source: rel.sourceSymbolId!,
          target: rel.targetSymbolId!,
          type: rel.relationshipType,
        });
      }
    });
    return edges;
  }, [relationships, layout.positions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Sub-toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: '#070a12',
          fontSize: '0.76rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--ref-mute)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Tiered Architecture:
          </span>
          {TIERS.map((tier) => (
            <button
              key={tier.id}
              onClick={() => setFilterTier(filterTier === tier.id ? null : tier.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: filterTier === tier.id ? tier.color : 'rgba(255, 255, 255, 0.1)',
                backgroundColor: filterTier === tier.id ? tier.bg : 'transparent',
                color: filterTier === tier.id ? tier.color : '#cbd5e1',
                cursor: 'pointer',
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: tier.color }} />
              <span>{tier.name.split(' ')[0]}</span>
              <span style={{ opacity: 0.6 }}>({tierGroups[tier.id]?.length || 0})</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => svgRef.current && exportSvg(svgRef.current, 'component-diagram')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: '#0d1220',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '5px',
              color: '#ffffff',
              cursor: 'pointer',
            }}
            title="Export as SVG"
          >
            <Download size={12} />
            <span>SVG</span>
          </button>
          <button
            onClick={() => svgRef.current && exportPng(svgRef.current, 'component-diagram')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              background: '#0d1220',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '5px',
              color: '#ffffff',
              cursor: 'pointer',
            }}
            title="Export as PNG"
          >
            <Download size={12} />
            <span>PNG</span>
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
            style={{ padding: '4px', background: '#0d1220', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '5px', color: '#fff', cursor: 'pointer' }}
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            style={{ padding: '4px', background: '#0d1220', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '5px', color: '#fff', cursor: 'pointer' }}
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            style={{ padding: '4px', background: '#0d1220', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '5px', color: '#fff', cursor: 'pointer' }}
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div
        style={{
          padding: '6px 16px',
          backgroundColor: 'rgba(56, 189, 248, 0.05)',
          borderBottom: '1px solid rgba(56, 189, 248, 0.12)',
          color: '#94a3b8',
          fontSize: '0.72rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Info size={13} style={{ color: '#38bdf8' }} />
        <span>
          5-tier architectural breakdown inferred from package structure, naming conventions, and AST type declarations.
        </span>
      </div>

      {/* Diagram Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#070a12', display: 'flex' }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.1s ease',
            flex: 1,
          }}
        >
          <defs>
            <marker id="comp-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
            </marker>
            <pattern id="comp-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="1" fill="rgba(255, 255, 255, 0.04)" />
            </pattern>
          </defs>

          <rect width={layout.width} height={layout.height} fill="url(#comp-grid)" />

          {/* Render Tier Bands */}
          {TIERS.map((tier) => {
            const y = 40 + tier.id * 130;
            const isDimmed = filterTier !== null && filterTier !== tier.id;
            return (
              <g key={tier.id} opacity={isDimmed ? 0.3 : 1}>
                {/* Background band */}
                <rect
                  x="20"
                  y={y}
                  width={layout.width - 40}
                  height="116"
                  rx="8"
                  fill={tier.bg}
                  stroke={tier.border}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                {/* Tier Title Label */}
                <text
                  x="36"
                  y={y + 18}
                  fill={tier.color}
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                  letterSpacing="0.05em"
                >
                  {tier.name.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Cross-Tier Connection Edges */}
          {connections.map((conn, idx) => {
            const src = layout.positions.get(conn.source);
            const tgt = layout.positions.get(conn.target);
            if (!src || !tgt) return null;

            const isSelected = selectedComponent && (selectedComponent.id === conn.source || selectedComponent.id === conn.target);
            const x1 = src.x + src.width / 2;
            const y1 = src.y + src.height;
            const x2 = tgt.x + tgt.width / 2;
            const y2 = tgt.y;

            return (
              <path
                key={idx}
                d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                fill="none"
                stroke={isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.2)'}
                strokeWidth={isSelected ? 2 : 1}
                markerEnd="url(#comp-arrow)"
              />
            );
          })}

          {/* Component Nodes */}
          {componentNodes.map((comp) => {
            const pos = layout.positions.get(comp.id);
            if (!pos) return null;

            const tierMeta = TIERS[comp.tier];
            const isSelected = selectedComponent?.id === comp.id;
            const isFiltered = filterTier !== null && filterTier !== comp.tier;

            return (
              <g
                key={comp.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedComponent(comp)}
                style={{ cursor: 'pointer' }}
                opacity={isFiltered ? 0.25 : 1}
              >
                <rect
                  width={pos.width}
                  height={pos.height}
                  rx="6"
                  fill="#0d1220"
                  stroke={isSelected ? '#ffffff' : tierMeta.color}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <rect
                  width="4"
                  height={pos.height}
                  rx="2"
                  fill={tierMeta.color}
                />
                <text
                  x="14"
                  y="22"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="var(--font-mono)"
                >
                  {comp.name.length > 20 ? comp.name.substring(0, 18) + '…' : comp.name}
                </text>
                <text
                  x="14"
                  y="38"
                  fill="var(--ref-mute)"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                >
                  {comp.kind} • {comp.methodsCount} methods
                </text>
              </g>
            );
          })}
        </svg>

        {/* Side Inspector Drawer */}
        {selectedComponent && (
          <div
            style={{
              width: '300px',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: '#0b0f19',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: TIERS[selectedComponent.tier].color, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                {selectedComponent.tierName}
              </span>
              <button
                onClick={() => setSelectedComponent(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <h4 style={{ margin: 0, color: '#ffffff', fontSize: '0.95rem' }}>{selectedComponent.name}</h4>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#94a3b8', wordBreak: 'break-all' }}>
              {selectedComponent.fqn}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
              <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Incoming (Fan-In)</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981' }}>{selectedComponent.fanIn}</div>
              </div>
              <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Outgoing (Fan-Out)</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8' }}>{selectedComponent.fanOut}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Methods Declared:</span>
              <span style={{ marginLeft: '6px', color: '#38bdf8' }}>{selectedComponent.methodsCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
