import React, { useState, useMemo, useRef } from 'react';
import { ArchitectureGraph, ArchitectureAnalysis } from '../../../types/architecture';
import { SymbolItem, RelationshipItem } from '../../../types/analysis';
import { Workflow, ZoomIn, ZoomOut, RotateCcw, Download, Info } from 'lucide-react';
import { exportSvg, exportPng } from '../exportUtils';

interface DataFlowDiagramProps {
  graph: ArchitectureGraph;
  analysis?: ArchitectureAnalysis | null;
  symbols?: SymbolItem[];
  relationships?: RelationshipItem[];
}

interface FlowStage {
  id: string;
  stageName: string;
  role: string;
  color: string;
  elements: { name: string; detail: string; fqn: string }[];
}

export const DataFlowDiagram: React.FC<DataFlowDiagramProps> = ({
  graph: _graph,
  analysis: _analysis,
  symbols = [],
  relationships: _relationships,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedStage, setSelectedStage] = useState<FlowStage | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Group symbols into pipeline stages deterministically
  const stages: FlowStage[] = useMemo(() => {
    // 1. Ingress / Controllers
    const controllers = symbols
      .filter((s) => s.kind === 'CLASS' && (s.name.toLowerCase().includes('controller') || s.filePath.toLowerCase().includes('controller')))
      .map((s) => ({ name: s.name, detail: `${s.parameterCount || 0} endpoints/methods`, fqn: s.fqn || s.name }));

    // 2. Request DTOs
    const dtos = symbols
      .filter((s) => (s.kind === 'CLASS' || s.kind === 'RECORD') && (s.name.toLowerCase().includes('dto') || s.name.toLowerCase().includes('request') || s.name.toLowerCase().includes('command')))
      .map((s) => ({ name: s.name, detail: 'Data Transfer Object', fqn: s.fqn || s.name }));

    // 3. Application Services / Business Processing
    const services = symbols
      .filter((s) => s.kind === 'CLASS' && (s.name.toLowerCase().includes('service') || s.name.toLowerCase().includes('manager') || s.name.toLowerCase().includes('handler')))
      .map((s) => ({ name: s.name, detail: 'Domain Business Logic', fqn: s.fqn || s.name }));

    // 4. Persistence / Repositories
    const repos = symbols
      .filter((s) => (s.kind === 'CLASS' || s.kind === 'INTERFACE') && (s.name.toLowerCase().includes('repo') || s.name.toLowerCase().includes('dao')))
      .map((s) => ({ name: s.name, detail: 'Repository / DAO Interface', fqn: s.fqn || s.name }));

    // 5. Entities / Data Storage Models
    const entities = symbols
      .filter((s) => s.kind === 'CLASS' && (s.name.toLowerCase().includes('entity') || s.name.toLowerCase().includes('model') || s.filePath.toLowerCase().includes('entity')))
      .map((s) => ({ name: s.name, detail: 'Persistent Entity Model', fqn: s.fqn || s.name }));

    return [
      {
        id: 'stage-ingress',
        stageName: '1. Ingress & HTTP Routing',
        role: 'REST Controller Endpoints',
        color: '#38bdf8',
        elements: controllers.length > 0 ? controllers.slice(0, 6) : [{ name: 'Web Controller Layer', detail: 'HTTP Request Demux', fqn: 'web.controller' }],
      },
      {
        id: 'stage-dto',
        stageName: '2. Request DTO / Validation',
        role: 'Input Deserialization & Schema Binding',
        color: '#a855f7',
        elements: dtos.length > 0 ? dtos.slice(0, 6) : [{ name: 'Input DTOs & Records', detail: 'Payload Validation', fqn: 'dto.request' }],
      },
      {
        id: 'stage-service',
        stageName: '3. Business Logic Execution',
        role: 'Service Orchestration & Transactions',
        color: '#ec4899',
        elements: services.length > 0 ? services.slice(0, 6) : [{ name: 'Service Layer Orchestrator', detail: 'Transaction Boundary', fqn: 'service.core' }],
      },
      {
        id: 'stage-repo',
        stageName: '4. Repository & Query Boundary',
        role: 'Data Access & Query Execution',
        color: '#f59e0b',
        elements: repos.length > 0 ? repos.slice(0, 6) : [{ name: 'Persistence Gateway', detail: 'ORM / DAO Access', fqn: 'repository.data' }],
      },
      {
        id: 'stage-entity',
        stageName: '5. Entity State & Persistence',
        role: 'Relational / State Storage',
        color: '#10b981',
        elements: entities.length > 0 ? entities.slice(0, 6) : [{ name: 'Domain Entities', detail: 'Database Table Mapping', fqn: 'domain.entity' }],
      },
    ];
  }, [symbols]);

  const layout = useMemo(() => {
    const colWidth = 200;
    const colGap = 40;
    const startX = 60;
    const startY = 80;
    const width = startX * 2 + stages.length * colWidth + (stages.length - 1) * colGap;
    const height = 580;

    return { colWidth, colGap, startX, startY, width, height };
  }, [stages]);

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
          <Workflow size={14} style={{ color: '#38bdf8' }} />
          <span style={{ color: '#ffffff', fontWeight: 600 }}>Data Flow Architecture Pipeline</span>
          <span style={{ color: 'var(--ref-mute)', fontSize: '0.7rem' }}>
            (5 data transformation boundaries)
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => svgRef.current && exportSvg(svgRef.current, 'dataflow-diagram')}
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
            onClick={() => svgRef.current && exportPng(svgRef.current, 'dataflow-diagram')}
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
          Data Flow Pipeline inferred from controller routes, DTO transformations, domain services, and persistence models.
        </span>
      </div>

      {/* Main Canvas */}
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
            <marker id="df-arrow" markerWidth="9" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 9 3.5, 0 7" fill="#64748b" />
            </marker>
          </defs>

          {/* Pipeline Connector Arrows between columns */}
          {stages.slice(0, stages.length - 1).map((_, idx) => {
            const x1 = layout.startX + idx * (layout.colWidth + layout.colGap) + layout.colWidth;
            const x2 = layout.startX + (idx + 1) * (layout.colWidth + layout.colGap);
            const y = layout.startY + 160;

            return (
              <g key={`arrow-${idx}`}>
                <line
                  x1={x1 + 4}
                  y1={y}
                  x2={x2 - 8}
                  y2={y}
                  stroke="#475569"
                  strokeWidth="2"
                  markerEnd="url(#df-arrow)"
                />
              </g>
            );
          })}

          {/* Stage Columns */}
          {stages.map((stage, colIdx) => {
            const x = layout.startX + colIdx * (layout.colWidth + layout.colGap);
            const isSelected = selectedStage?.id === stage.id;

            return (
              <g
                key={stage.id}
                transform={`translate(${x}, ${layout.startY})`}
                onClick={() => setSelectedStage(stage)}
                style={{ cursor: 'pointer' }}
              >
                {/* Stage Header Card */}
                <rect
                  width={layout.colWidth}
                  height="70"
                  rx="6"
                  fill="#0d1220"
                  stroke={isSelected ? '#ffffff' : stage.color}
                  strokeWidth={isSelected ? 2 : 1}
                />
                <rect width="4" height="70" rx="2" fill={stage.color} />
                <text x="14" y="24" fill={stage.color} fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">
                  {stage.stageName}
                </text>
                <text x="14" y="44" fill="#cbd5e1" fontSize="9" fontFamily="var(--font-mono)">
                  {stage.role}
                </text>

                {/* Elements inside stage */}
                <g transform="translate(0, 85)">
                  {stage.elements.map((el, elIdx) => (
                    <g key={elIdx} transform={`translate(0, ${elIdx * 56})`}>
                      <rect
                        width={layout.colWidth}
                        height="48"
                        rx="5"
                        fill="rgba(255, 255, 255, 0.03)"
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="1"
                      />
                      <text x="10" y="20" fill="#ffffff" fontSize="10" fontWeight="600" fontFamily="var(--font-mono)">
                        {el.name.length > 22 ? el.name.substring(0, 20) + '…' : el.name}
                      </text>
                      <text x="10" y="36" fill="var(--ref-mute)" fontSize="8.5" fontFamily="var(--font-mono)">
                        {el.detail}
                      </text>
                    </g>
                  ))}
                </g>
              </g>
            );
          })}
        </svg>

        {/* Side Inspector Drawer */}
        {selectedStage && (
          <div
            style={{
              width: '320px',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: '#0b0f19',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: selectedStage.color, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                Stage Inspection
              </span>
              <button
                onClick={() => setSelectedStage(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1rem' }}>{selectedStage.stageName}</h4>
            <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{selectedStage.role}</div>

            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '0.74rem', color: '#ffffff', fontWeight: 600 }}>
                Participating Components ({selectedStage.elements.length})
              </span>
              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedStage.elements.map((el, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ color: '#ffffff', fontSize: '0.76rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {el.name}
                    </div>
                    <div style={{ color: 'var(--ref-mute)', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                      {el.fqn}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
