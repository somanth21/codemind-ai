import React, { useState, useMemo, useRef } from 'react';
import { ArchitectureGraph, ArchitectureAnalysis } from '../../../types/architecture';
import { SymbolItem, RelationshipItem } from '../../../types/analysis';
import { GitCommit, ZoomIn, ZoomOut, RotateCcw, Download, Info } from 'lucide-react';
import { exportSvg, exportPng } from '../exportUtils';

interface CallGraphDiagramProps {
  graph: ArchitectureGraph;
  analysis?: ArchitectureAnalysis | null;
  symbols?: SymbolItem[];
  relationships?: RelationshipItem[];
}

export const CallGraphDiagram: React.FC<CallGraphDiagramProps> = ({
  graph: _graph,
  analysis: _analysis,
  symbols = [],
  relationships = [],
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Filter method symbols
  const methods = useMemo(() => {
    return symbols.filter((s) => s.kind === 'METHOD' || s.kind === 'CONSTRUCTOR');
  }, [symbols]);

  // Filter CALLS relationships
  const callRelationships = useMemo(() => {
    return relationships.filter((r) => r.relationshipType === 'CALLS');
  }, [relationships]);

  // Selected method or default to the method with most calls
  const activeMethod = useMemo(() => {
    if (selectedMethodId) {
      return methods.find((m) => m.id === selectedMethodId) || null;
    }
    if (methods.length === 0) return null;

    // Default to the method with the highest degree in CALLS
    let bestMethod = methods[0];
    let maxDegree = -1;
    methods.forEach((m) => {
      const degree = callRelationships.filter(
        (r) => r.sourceSymbolId === m.id || r.targetSymbolId === m.id || r.sourceFqn === m.fqn || r.targetFqn === m.fqn
      ).length;
      if (degree > maxDegree) {
        maxDegree = degree;
        bestMethod = m;
      }
    });
    return bestMethod;
  }, [methods, selectedMethodId, callRelationships]);

  // Find direct incoming callers and direct outgoing callees
  const { incomingCallers, outgoingCallees } = useMemo(() => {
    if (!activeMethod) return { incomingCallers: [], outgoingCallees: [] };

    const callersMap = new Map<string, { id: string; name: string; fqn: string; parentClass: string }>();
    const calleesMap = new Map<string, { id: string; name: string; fqn: string; parentClass: string }>();

    callRelationships.forEach((rel) => {
      // Incoming: rel target is active method
      if (rel.targetSymbolId === activeMethod.id || rel.targetFqn === activeMethod.fqn) {
        const callerSymbol = methods.find((m) => m.id === rel.sourceSymbolId || m.fqn === rel.sourceFqn);
        const name = callerSymbol ? callerSymbol.name : rel.sourceFqn ? rel.sourceFqn.split('.').pop()! : 'caller()';
        const parentClass = callerSymbol?.signature || rel.sourceFqn || 'UnknownCaller';
        callersMap.set(rel.sourceSymbolId || rel.sourceFqn || name, {
          id: rel.sourceSymbolId || name,
          name,
          fqn: rel.sourceFqn || name,
          parentClass,
        });
      }

      // Outgoing: rel source is active method
      if (rel.sourceSymbolId === activeMethod.id || rel.sourceFqn === activeMethod.fqn) {
        const calleeSymbol = methods.find((m) => m.id === rel.targetSymbolId || m.fqn === rel.targetFqn);
        const name = calleeSymbol ? calleeSymbol.name : rel.targetFqn ? rel.targetFqn.split('.').pop()! : 'callee()';
        const parentClass = calleeSymbol?.signature || rel.targetFqn || 'UnknownCallee';
        calleesMap.set(rel.targetSymbolId || rel.targetFqn || name, {
          id: rel.targetSymbolId || name,
          name,
          fqn: rel.targetFqn || name,
          parentClass,
        });
      }
    });

    return {
      incomingCallers: Array.from(callersMap.values()),
      outgoingCallees: Array.from(calleesMap.values()),
    };
  }, [activeMethod, callRelationships, methods]);

  // Compute 3-column layout: Callers -> Target Method -> Callees
  const layout = useMemo(() => {
    const width = 1100;
    const height = Math.max(500, Math.max(incomingCallers.length, outgoingCallees.length, 1) * 70 + 120);

    const colX1 = 80;
    const colX2 = 450;
    const colX3 = 820;
    const cardWidth = 240;
    const cardHeight = 48;

    const callerPositions: { x: number; y: number; id: string }[] = [];
    incomingCallers.forEach((c, idx) => {
      const y = 80 + idx * 64;
      callerPositions.push({ x: colX1, y, id: c.id });
    });

    const targetPos = { x: colX2, y: Math.max(80, (height - cardHeight) / 2) };

    const calleePositions: { x: number; y: number; id: string }[] = [];
    outgoingCallees.forEach((c, idx) => {
      const y = 80 + idx * 64;
      calleePositions.push({ x: colX3, y, id: c.id });
    });

    return {
      width,
      height,
      cardWidth,
      cardHeight,
      callerPositions,
      targetPos,
      calleePositions,
    };
  }, [incomingCallers, outgoingCallees]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--ref-mute)', fontWeight: 600 }}>Active Method:</span>
          <select
            value={activeMethod?.id || ''}
            onChange={(e) => setSelectedMethodId(e.target.value)}
            style={{
              background: '#0d1220',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '5px',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
              maxWidth: '320px',
            }}
          >
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}() {m.signature ? `— ${m.signature}` : ''}
              </option>
            ))}
          </select>
          <span style={{ color: 'var(--ref-mute)', fontSize: '0.7rem' }}>
            ({callRelationships.length} static method call relationships indexed)
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => svgRef.current && exportSvg(svgRef.current, 'call-graph')}
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
            onClick={() => svgRef.current && exportPng(svgRef.current, 'call-graph')}
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

      {/* Banner */}
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
          Directed invocation call graph extracted from AST method call expressions (CALLS relationships).
        </span>
      </div>

      {/* Main Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#070a12', display: 'flex' }}>
        {!activeMethod ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              color: 'var(--ref-mute)',
              gap: '8px',
            }}
          >
            <GitCommit size={32} />
            <span>No method call hierarchy detected in this repository.</span>
          </div>
        ) : (
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
              <marker id="call-arrow" markerWidth="9" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 9 3.5, 0 7" fill="#38bdf8" />
              </marker>
              <pattern id="call-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="14" cy="14" r="1" fill="rgba(255, 255, 255, 0.04)" />
              </pattern>
            </defs>

            <rect width={layout.width} height={layout.height} fill="url(#call-grid)" />

            {/* Column Header Labels */}
            <text x="80" y="45" fill="#10b981" fontSize="12" fontWeight="700" fontFamily="var(--font-mono)">
              CALLERS (FAN-IN: {incomingCallers.length})
            </text>
            <text x="450" y="45" fill="#e85a2b" fontSize="12" fontWeight="700" fontFamily="var(--font-mono)">
              FOCUSED METHOD
            </text>
            <text x="820" y="45" fill="#38bdf8" fontSize="12" fontWeight="700" fontFamily="var(--font-mono)">
              CALLEES (FAN-OUT: {outgoingCallees.length})
            </text>

            {/* Inbound Call Edges: Caller -> Target */}
            {layout.callerPositions.map((pos, idx) => {
              const x1 = pos.x + layout.cardWidth;
              const y1 = pos.y + layout.cardHeight / 2;
              const x2 = layout.targetPos.x;
              const y2 = layout.targetPos.y + layout.cardHeight / 2;
              return (
                <path
                  key={`in-${idx}`}
                  d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  markerEnd="url(#call-arrow)"
                />
              );
            })}

            {/* Outbound Call Edges: Target -> Callee */}
            {layout.calleePositions.map((pos, idx) => {
              const x1 = layout.targetPos.x + layout.cardWidth;
              const y1 = layout.targetPos.y + layout.cardHeight / 2;
              const x2 = pos.x;
              const y2 = pos.y + layout.cardHeight / 2;
              return (
                <path
                  key={`out-${idx}`}
                  d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  markerEnd="url(#call-arrow)"
                />
              );
            })}

            {/* Caller Cards */}
            {incomingCallers.map((c, idx) => {
              const pos = layout.callerPositions[idx];
              return (
                <g
                  key={c.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => setSelectedMethodId(c.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect width={layout.cardWidth} height={layout.cardHeight} rx="6" fill="#0d1220" stroke="#10b981" strokeWidth="1" />
                  <rect width="4" height={layout.cardHeight} rx="2" fill="#10b981" />
                  <text x="14" y="22" fill="#ffffff" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">
                    {c.name}()
                  </text>
                  <text x="14" y="36" fill="var(--ref-mute)" fontSize="8.5" fontFamily="var(--font-mono)">
                    {c.parentClass.length > 32 ? '…' + c.parentClass.substring(c.parentClass.length - 30) : c.parentClass}
                  </text>
                </g>
              );
            })}

            {/* Center Target Method Card */}
            <g transform={`translate(${layout.targetPos.x}, ${layout.targetPos.y})`}>
              <rect width={layout.cardWidth} height={layout.cardHeight} rx="6" fill="rgba(232, 90, 43, 0.15)" stroke="#e85a2b" strokeWidth="2" />
              <rect width="4" height={layout.cardHeight} rx="2" fill="#e85a2b" />
              <text x="14" y="22" fill="#ffffff" fontSize="12" fontWeight="700" fontFamily="var(--font-mono)">
                {activeMethod.name}()
              </text>
              <text x="14" y="38" fill="#cbd5e1" fontSize="9" fontFamily="var(--font-mono)">
                {activeMethod.returnType || 'void'} • {activeMethod.parameterCount} params
              </text>
            </g>

            {/* Callee Cards */}
            {outgoingCallees.map((c, idx) => {
              const pos = layout.calleePositions[idx];
              return (
                <g
                  key={c.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => setSelectedMethodId(c.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect width={layout.cardWidth} height={layout.cardHeight} rx="6" fill="#0d1220" stroke="#38bdf8" strokeWidth="1" />
                  <rect width="4" height={layout.cardHeight} rx="2" fill="#38bdf8" />
                  <text x="14" y="22" fill="#ffffff" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">
                    {c.name}()
                  </text>
                  <text x="14" y="36" fill="var(--ref-mute)" fontSize="8.5" fontFamily="var(--font-mono)">
                    {c.parentClass.length > 32 ? '…' + c.parentClass.substring(c.parentClass.length - 30) : c.parentClass}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};
