import React, { useState, useMemo, useRef } from 'react';
import { ArchitectureGraph, ArchitectureAnalysis } from '../../../types/architecture';
import { SymbolItem, RelationshipItem } from '../../../types/analysis';
import { Layers, ZoomIn, ZoomOut, RotateCcw, Download, Info, Search, Filter } from 'lucide-react';
import { exportSvg, exportPng } from '../exportUtils';

interface ClassDiagramProps {
  graph: ArchitectureGraph;
  analysis?: ArchitectureAnalysis | null;
  symbols?: SymbolItem[];
  relationships?: RelationshipItem[];
}

interface ClassModel {
  id: string;
  name: string;
  fqn: string;
  kind: string;
  packageName: string;
  fields: { name: string; type: string; visibility: string }[];
  methods: { name: string; returnType: string; signature: string; visibility: string }[];
}

export const ClassDiagram: React.FC<ClassDiagramProps> = ({
  graph: _graph,
  analysis: _analysis,
  symbols = [],
  relationships = [],
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [search, setSearch] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Group symbols into class models
  const { classes, packages } = useMemo(() => {
    const classSymbols = symbols.filter(
      (s) => s.kind === 'CLASS' || s.kind === 'INTERFACE' || s.kind === 'RECORD' || s.kind === 'ENUM'
    );

    const pkgsSet = new Set<string>();

    const models: ClassModel[] = classSymbols.map((cs) => {
      // Derive package from fqn or file path
      let pkg = 'default';
      if (cs.fqn && cs.fqn.includes('.')) {
        pkg = cs.fqn.substring(0, cs.fqn.lastIndexOf('.'));
      } else if (cs.filePath) {
        pkg = cs.filePath.replace(/\/[^/]+$/, '').replace(/^src\/main\/java\//, '').replace(/\//g, '.');
      }
      pkgsSet.add(pkg);

      // Child fields
      const fields = symbols
        .filter((s) => s.parentSymbolId === cs.id && s.kind === 'FIELD')
        .map((f) => ({
          name: f.name,
          type: f.returnType || 'Object',
          visibility: f.visibility === 'PUBLIC' ? '+' : f.visibility === 'PRIVATE' ? '-' : '#',
        }));

      // Child methods
      const methods = symbols
        .filter((s) => s.parentSymbolId === cs.id && (s.kind === 'METHOD' || s.kind === 'CONSTRUCTOR'))
        .map((m) => ({
          name: m.name,
          returnType: m.returnType || 'void',
          signature: m.signature || `${m.name}()`,
          visibility: m.visibility === 'PUBLIC' ? '+' : m.visibility === 'PRIVATE' ? '-' : '#',
        }));

      return {
        id: cs.id,
        name: cs.name,
        fqn: cs.fqn || cs.name,
        kind: cs.kind,
        packageName: pkg,
        fields,
        methods,
      };
    });

    return { classes: models, packages: Array.from(pkgsSet).sort() };
  }, [symbols]);

  // Filter classes by package and search
  const visibleClasses = useMemo(() => {
    let result = classes;
    if (selectedPackage !== 'ALL') {
      result = result.filter((c) => c.packageName === selectedPackage);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q) || c.fqn.toLowerCase().includes(q));
    }
    // Cap to 20 classes for clean layout
    return result.slice(0, 24);
  }, [classes, selectedPackage, search]);

  const visibleClassIds = useMemo(() => new Set(visibleClasses.map((c) => c.id)), [visibleClasses]);

  // Filter relationships (EXTENDS, IMPLEMENTS, CALLS)
  const visibleRels = useMemo(() => {
    return relationships.filter(
      (r) =>
        r.sourceSymbolId &&
        r.targetSymbolId &&
        visibleClassIds.has(r.sourceSymbolId) &&
        visibleClassIds.has(r.targetSymbolId)
    );
  }, [relationships, visibleClassIds]);

  // Grid layout for classes
  const layout = useMemo(() => {
    const cardWidth = 260;
    const cardHeight = 180;
    const gapX = 40;
    const gapY = 50;
    const cols = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(visibleClasses.length * 1.5))));
    const positions = new Map<string, { x: number; y: number; width: number; height: number }>();

    visibleClasses.forEach((cls, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      positions.set(cls.id, {
        x: 60 + col * (cardWidth + gapX),
        y: 60 + row * (cardHeight + gapY),
        width: cardWidth,
        height: cardHeight,
      });
    });

    const totalWidth = 60 + cols * (cardWidth + gapX);
    const totalHeight = 80 + Math.ceil(visibleClasses.length / cols) * (cardHeight + gapY);

    return {
      positions,
      width: Math.max(1000, totalWidth),
      height: Math.max(650, totalHeight),
    };
  }, [visibleClasses]);

  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

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
          {/* Package filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} style={{ color: 'var(--ref-mute)' }} />
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              style={{
                background: '#0d1220',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '5px',
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <option value="ALL">All Packages ({packages.length})</option>
              {packages.map((pkg) => (
                <option key={pkg} value={pkg}>
                  {pkg}
                </option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '5px',
              padding: '2px 8px',
            }}
          >
            <Search size={12} style={{ color: 'var(--ref-mute)' }} />
            <input
              type="text"
              placeholder="Filter class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.72rem',
                outline: 'none',
                width: '130px',
              }}
            />
          </div>

          <span style={{ color: 'var(--ref-mute)', fontSize: '0.7rem' }}>
            Showing {visibleClasses.length} of {classes.length} classes
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => svgRef.current && exportSvg(svgRef.current, 'class-diagram')}
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
            onClick={() => svgRef.current && exportPng(svgRef.current, 'class-diagram')}
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

      {/* Legend & Notice */}
      <div
        style={{
          padding: '6px 16px',
          backgroundColor: 'rgba(56, 189, 248, 0.05)',
          borderBottom: '1px solid rgba(56, 189, 248, 0.12)',
          color: '#94a3b8',
          fontSize: '0.72rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={13} style={{ color: '#38bdf8' }} />
          <span>UML Class Specification extracted directly from JavaParser AST symbols.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 16, height: 2, background: '#38bdf8', display: 'inline-block' }} /> Extends (Inheritance)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 16, height: 2, borderTop: '2px dashed #10b981', display: 'inline-block' }} /> Implements (Realization)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 16, height: 2, background: '#64748b', display: 'inline-block' }} /> Calls / Uses
          </span>
        </div>
      </div>

      {/* Diagram Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#070a12', display: 'flex' }}>
        {visibleClasses.length === 0 ? (
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
            <Layers size={32} />
            <span>No class declarations matched the current filter.</span>
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
              {/* Hollow triangle for inheritance */}
              <marker id="uml-extends" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                <polygon points="0 0, 10 5, 0 10" fill="#070a12" stroke="#38bdf8" strokeWidth="1.5" />
              </marker>
              {/* Hollow triangle for implements */}
              <marker id="uml-implements" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                <polygon points="0 0, 10 5, 0 10" fill="#070a12" stroke="#10b981" strokeWidth="1.5" />
              </marker>
              {/* Open arrowhead for calls */}
              <marker id="uml-calls" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
              </marker>
              <pattern id="class-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="14" cy="14" r="1" fill="rgba(255, 255, 255, 0.04)" />
              </pattern>
            </defs>

            <rect width={layout.width} height={layout.height} fill="url(#class-grid)" />

            {/* Relationship Lines */}
            {visibleRels.map((rel, idx) => {
              const src = layout.positions.get(rel.sourceSymbolId || '');
              const tgt = layout.positions.get(rel.targetSymbolId || '');
              if (!src || !tgt) return null;

              const x1 = src.x + src.width / 2;
              const y1 = src.y + src.height / 2;
              const x2 = tgt.x + tgt.width / 2;
              const y2 = tgt.y + tgt.height / 2;

              const isExtends = rel.relationshipType === 'EXTENDS';
              const isImplements = rel.relationshipType === 'IMPLEMENTS';
              const marker = isExtends ? 'url(#uml-extends)' : isImplements ? 'url(#uml-implements)' : 'url(#uml-calls)';
              const stroke = isExtends ? '#38bdf8' : isImplements ? '#10b981' : 'rgba(255, 255, 255, 0.2)';

              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={stroke}
                  strokeWidth="1.5"
                  strokeDasharray={isImplements ? '4 3' : undefined}
                  markerEnd={marker}
                />
              );
            })}

            {/* UML Class Boxes */}
            {visibleClasses.map((cls) => {
              const pos = layout.positions.get(cls.id);
              if (!pos) return null;

              const isSelected = selectedClassId === cls.id;
              const isInterface = cls.kind === 'INTERFACE';

              return (
                <g
                  key={cls.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={() => setSelectedClassId(cls.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Card boundary */}
                  <rect
                    width={pos.width}
                    height={pos.height}
                    rx="5"
                    fill="#0d1220"
                    stroke={isSelected ? '#e85a2b' : isInterface ? '#10b981' : 'rgba(255, 255, 255, 0.15)'}
                    strokeWidth={isSelected ? 2 : 1}
                  />

                  {/* Header compartment */}
                  <rect
                    width={pos.width}
                    height="40"
                    rx="5"
                    fill={isInterface ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)'}
                  />
                  <line x1="0" y1="40" x2={pos.width} y2="40" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />

                  {/* Stereotype */}
                  <text
                    x={pos.width / 2}
                    y="14"
                    textAnchor="middle"
                    fill="var(--ref-mute)"
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                    fontStyle="italic"
                  >
                    «{cls.kind.toLowerCase()}»
                  </text>

                  {/* Class Name */}
                  <text
                    x={pos.width / 2}
                    y="30"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="var(--font-mono)"
                  >
                    {cls.name}
                  </text>

                  {/* Fields compartment */}
                  <g transform="translate(10, 48)">
                    {cls.fields.length === 0 ? (
                      <text fill="var(--ref-mute)" fontSize="8.5" fontStyle="italic">
                        (no fields)
                      </text>
                    ) : (
                      cls.fields.slice(0, 3).map((f, i) => (
                        <text key={i} y={i * 14 + 10} fill="#cbd5e1" fontSize="9" fontFamily="var(--font-mono)">
                          <tspan fill={f.visibility === '+' ? '#10b981' : '#f59e0b'}>{f.visibility} </tspan>
                          {f.name}: {f.type}
                        </text>
                      ))
                    )}
                    {cls.fields.length > 3 && (
                      <text y={3 * 14 + 10} fill="var(--ref-mute)" fontSize="8">
                        +{cls.fields.length - 3} more fields...
                      </text>
                    )}
                  </g>

                  {/* Divider line between fields and methods */}
                  <line x1="0" y1="104" x2={pos.width} y2="104" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />

                  {/* Methods compartment */}
                  <g transform="translate(10, 114)">
                    {cls.methods.length === 0 ? (
                      <text fill="var(--ref-mute)" fontSize="8.5" fontStyle="italic">
                        (no methods)
                      </text>
                    ) : (
                      cls.methods.slice(0, 3).map((m, i) => (
                        <text key={i} y={i * 14 + 10} fill="#94a3b8" fontSize="9" fontFamily="var(--font-mono)">
                          <tspan fill={m.visibility === '+' ? '#10b981' : '#f59e0b'}>{m.visibility} </tspan>
                          {m.name}(): {m.returnType}
                        </text>
                      ))
                    )}
                    {cls.methods.length > 3 && (
                      <text y={3 * 14 + 10} fill="var(--ref-mute)" fontSize="8">
                        +{cls.methods.length - 3} more methods...
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </svg>
        )}

        {/* Side Inspector */}
        {selectedClass && (
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
              <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                «{selectedClass.kind.toLowerCase()}»
              </span>
              <button
                onClick={() => setSelectedClassId(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>
              {selectedClass.name}
            </h4>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#94a3b8', wordBreak: 'break-all' }}>
              {selectedClass.fqn}
            </div>

            {/* Full Fields List */}
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '0.74rem', color: '#ffffff', fontWeight: 600 }}>
                Declared Fields ({selectedClass.fields.length})
              </span>
              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {selectedClass.fields.map((f, i) => (
                  <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#cbd5e1' }}>
                    <span style={{ color: f.visibility === '+' ? '#10b981' : '#f59e0b' }}>{f.visibility} </span>
                    <span>{f.name}</span>
                    <span style={{ color: '#94a3b8' }}>: {f.type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Full Methods List */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
              <span style={{ fontSize: '0.74rem', color: '#ffffff', fontWeight: 600 }}>
                Declared Methods ({selectedClass.methods.length})
              </span>
              <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedClass.methods.map((m, i) => (
                  <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#cbd5e1' }}>
                    <span style={{ color: m.visibility === '+' ? '#10b981' : '#f59e0b' }}>{m.visibility} </span>
                    <span style={{ color: '#ffffff' }}>{m.name}</span>
                    <span style={{ color: '#94a3b8' }}>(): {m.returnType}</span>
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
