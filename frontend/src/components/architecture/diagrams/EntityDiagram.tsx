import React, { useState, useMemo, useRef } from 'react';
import { ArchitectureGraph, ArchitectureAnalysis } from '../../../types/architecture';
import { SymbolItem, RelationshipItem } from '../../../types/analysis';
import { Database, ZoomIn, ZoomOut, RotateCcw, Download, Info } from 'lucide-react';
import { exportSvg, exportPng } from '../exportUtils';

interface EntityDiagramProps {
  graph: ArchitectureGraph;
  analysis?: ArchitectureAnalysis | null;
  symbols?: SymbolItem[];
  relationships?: RelationshipItem[];
}

interface EntityModel {
  id: string;
  name: string;
  fqn: string;
  tableName: string;
  fields: { name: string; type: string; isPk: boolean }[];
}

export const EntityDiagram: React.FC<EntityDiagramProps> = ({
  graph: _graph,
  analysis: _analysis,
  symbols = [],
  relationships: _relationships,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Extract entity models
  const entities: EntityModel[] = useMemo(() => {
    const entitySymbols = symbols.filter(
      (s) =>
        (s.kind === 'CLASS' || s.kind === 'RECORD') &&
        (s.name.endsWith('Entity') ||
          s.name.endsWith('Model') ||
          s.filePath.toLowerCase().includes('/entity/') ||
          s.filePath.toLowerCase().includes('/entities/') ||
          s.filePath.toLowerCase().includes('/model/'))
    );

    return entitySymbols.map((es) => {
      // Find fields for this entity
      const fields = symbols
        .filter((s) => s.parentSymbolId === es.id && s.kind === 'FIELD')
        .map((f) => ({
          name: f.name,
          type: f.returnType || 'Object',
          isPk: f.name.toLowerCase() === 'id' || f.name.toLowerCase().endsWith('id'),
        }));

      // Infer table name (e.g. UserEntity -> users)
      const baseName = es.name.replace(/Entity$/, '').replace(/Model$/, '');
      const tableName = baseName.toLowerCase() + 's';

      return {
        id: es.id,
        name: es.name,
        fqn: es.fqn || es.name,
        tableName,
        fields: fields.length > 0 ? fields : [{ name: 'id', type: 'UUID', isPk: true }],
      };
    });
  }, [symbols]);

  // Layout entities in a grid
  const layout = useMemo(() => {
    const cardWidth = 240;
    const cardHeight = 170;
    const gapX = 50;
    const gapY = 50;
    const cols = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(entities.length))));

    const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
    entities.forEach((ent, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      positions.set(ent.id, {
        x: 60 + col * (cardWidth + gapX),
        y: 60 + row * (cardHeight + gapY),
        width: cardWidth,
        height: cardHeight,
      });
    });

    const totalWidth = 60 + cols * (cardWidth + gapX);
    const totalHeight = 80 + Math.ceil(entities.length / cols) * (cardHeight + gapY);

    return {
      positions,
      width: Math.max(900, totalWidth),
      height: Math.max(550, totalHeight),
    };
  }, [entities]);

  const selectedEntity = useMemo(() => {
    return entities.find((e) => e.id === selectedEntityId) || null;
  }, [entities, selectedEntityId]);

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
          <Database size={14} style={{ color: '#10b981' }} />
          <span style={{ color: '#ffffff', fontWeight: 600 }}>Entity-Relationship Model (ERD)</span>
          <span style={{ color: 'var(--ref-mute)', fontSize: '0.7rem' }}>
            ({entities.length} persistent domain entities identified)
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => svgRef.current && exportSvg(svgRef.current, 'entity-diagram')}
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
            onClick={() => svgRef.current && exportPng(svgRef.current, 'entity-diagram')}
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

      {/* Notice */}
      <div
        style={{
          padding: '6px 16px',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderBottom: '1px solid rgba(16, 185, 129, 0.15)',
          color: '#94a3b8',
          fontSize: '0.72rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Info size={13} style={{ color: '#10b981' }} />
        <span>
          Schema entities and attributes extracted deterministically from entity declarations and field AST representations.
        </span>
      </div>

      {/* Main Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#070a12', display: 'flex' }}>
        {entities.length === 0 ? (
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
            <Database size={32} />
            <span style={{ color: '#ffffff', fontWeight: 600 }}>No entity model detected in this repository</span>
            <span style={{ fontSize: '0.74rem' }}>
              The repository does not contain ORM Entity or domain persistence models matching standard conventions.
            </span>
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
              <pattern id="erd-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="14" cy="14" r="1" fill="rgba(255, 255, 255, 0.04)" />
              </pattern>
            </defs>

            <rect width={layout.width} height={layout.height} fill="url(#erd-grid)" />

            {/* Entity Boxes */}
            {entities.map((ent) => {
              const pos = layout.positions.get(ent.id);
              if (!pos) return null;

              const isSelected = selectedEntityId === ent.id;

              return (
                <g
                  key={ent.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => setSelectedEntityId(ent.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outer Card */}
                  <rect
                    width={pos.width}
                    height={pos.height}
                    rx="6"
                    fill="#0d1220"
                    stroke={isSelected ? '#ffffff' : '#10b981'}
                    strokeWidth={isSelected ? 2 : 1}
                  />

                  {/* Header */}
                  <rect
                    width={pos.width}
                    height="36"
                    rx="6"
                    fill="rgba(16, 185, 129, 0.12)"
                  />
                  <line x1="0" y1="36" x2={pos.width} y2="36" stroke="#10b981" strokeWidth="1" />

                  <text x="12" y="22" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">
                    {ent.name}
                  </text>
                  <text x={pos.width - 12} y="22" textAnchor="end" fill="#10b981" fontSize="9" fontFamily="var(--font-mono)">
                    [{ent.tableName}]
                  </text>

                  {/* Fields */}
                  <g transform="translate(10, 48)">
                    {ent.fields.slice(0, 5).map((f, i) => (
                      <g key={i} transform={`translate(0, ${i * 18})`}>
                        {f.isPk && (
                          <text x="0" y="10" fill="#f59e0b" fontSize="8" fontWeight="700" fontFamily="var(--font-mono)">
                            PK
                          </text>
                        )}
                        <text
                          x={f.isPk ? 20 : 0}
                          y="10"
                          fill={f.isPk ? '#ffffff' : '#cbd5e1'}
                          fontSize="9"
                          fontFamily="var(--font-mono)"
                        >
                          {f.name}
                        </text>
                        <text
                          x={pos.width - 24}
                          y="10"
                          textAnchor="end"
                          fill="var(--ref-mute)"
                          fontSize="8.5"
                          fontFamily="var(--font-mono)"
                        >
                          {f.type}
                        </text>
                      </g>
                    ))}
                    {ent.fields.length > 5 && (
                      <text y={5 * 18 + 10} fill="var(--ref-mute)" fontSize="8">
                        +{ent.fields.length - 5} more fields...
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </svg>
        )}

        {/* Side Inspector */}
        {selectedEntity && (
          <div
            style={{
              width: '300px',
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
              <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                Entity Inspector
              </span>
              <button
                onClick={() => setSelectedEntityId(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>
              {selectedEntity.name}
            </h4>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Table: <span style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>{selectedEntity.tableName}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
              {selectedEntity.fqn}
            </div>

            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '0.74rem', color: '#ffffff', fontWeight: 600 }}>
                Entity Attributes ({selectedEntity.fields.length})
              </span>
              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedEntity.fields.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 6px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    <span>
                      {f.isPk && <span style={{ color: '#f59e0b', marginRight: '4px' }}>[PK]</span>}
                      {f.name}
                    </span>
                    <span style={{ color: 'var(--ref-mute)' }}>{f.type}</span>
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
