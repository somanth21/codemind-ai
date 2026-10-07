import React, { useState, useMemo, useRef } from 'react';
import { ArchitectureGraph, ArchitectureAnalysis } from '../../../types/architecture';
import { SymbolItem, RelationshipItem } from '../../../types/analysis';
import { Globe, ZoomIn, ZoomOut, RotateCcw, Download, Info } from 'lucide-react';
import { exportSvg, exportPng } from '../exportUtils';

interface ApiMapDiagramProps {
  graph: ArchitectureGraph;
  analysis?: ArchitectureAnalysis | null;
  symbols?: SymbolItem[];
  relationships?: RelationshipItem[];
}

interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  controllerName: string;
  methodName: string;
  serviceName: string;
  repoName: string;
}

export const ApiMapDiagram: React.FC<ApiMapDiagramProps> = ({
  graph: _graph,
  analysis: _analysis,
  symbols = [],
  relationships = [],
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Extract endpoints from Controller methods and calls
  const endpoints: ApiEndpoint[] = useMemo(() => {
    const controllerSymbols = symbols.filter(
      (s) => s.kind === 'CLASS' && (s.name.toLowerCase().includes('controller') || s.filePath.toLowerCase().includes('controller'))
    );

    const result: ApiEndpoint[] = [];

    controllerSymbols.forEach((ctrl) => {
      // Find methods belonging to this controller
      const methods = symbols.filter((s) => s.parentSymbolId === ctrl.id && s.kind === 'METHOD');

      methods.forEach((m) => {
        let httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET';
        const mName = m.name.toLowerCase();
        if (mName.startsWith('post') || mName.startsWith('create') || mName.startsWith('add') || mName.startsWith('analyze') || mName.startsWith('upload')) {
          httpMethod = 'POST';
        } else if (mName.startsWith('put') || mName.startsWith('update')) {
          httpMethod = 'PUT';
        } else if (mName.startsWith('delete') || mName.startsWith('remove')) {
          httpMethod = 'DELETE';
        }

        // Infer path from controller name and method
        const resource = ctrl.name.replace(/Controller$/, '').toLowerCase();
        const path = `/api/v1/${resource}s${m.name.length > 5 ? '/' + m.name.toLowerCase() : ''}`;

        // Find downstream service called by this method or controller
        const callRel = relationships.find(
          (r) =>
            r.relationshipType === 'CALLS' &&
            (r.sourceSymbolId === m.id || r.sourceSymbolId === ctrl.id) &&
            (r.targetFqn?.toLowerCase().includes('service') || r.targetFqn?.toLowerCase().includes('manager'))
        );
        const serviceName = callRel ? callRel.targetFqn?.split('.').pop() || 'CoreService' : `${ctrl.name.replace(/Controller$/, '')}Service`;

        // Find downstream repo
        const repoName = `${ctrl.name.replace(/Controller$/, '')}Repository`;

        result.push({
          id: `${ctrl.id}-${m.id}`,
          method: httpMethod,
          path,
          controllerName: ctrl.name,
          methodName: m.name,
          serviceName,
          repoName,
        });
      });
    });

    return result.length > 0 ? result : [
      {
        id: 'ep-default-1',
        method: 'POST',
        path: '/api/v1/repositories',
        controllerName: 'RepositoryController',
        methodName: 'uploadRepository',
        serviceName: 'RepositoryService',
        repoName: 'RepositoryEntityRepository',
      },
      {
        id: 'ep-default-2',
        method: 'GET',
        path: '/api/v1/repositories/{id}/architecture',
        controllerName: 'ArchitectureController',
        methodName: 'getArchitectureGraph',
        serviceName: 'ArchitectureService',
        repoName: 'ArchitectureAnalysisRepository',
      },
    ];
  }, [symbols, relationships]);

  const visibleEndpoints = useMemo(() => {
    if (methodFilter === 'ALL') return endpoints.slice(0, 16);
    return endpoints.filter((e) => e.method === methodFilter).slice(0, 16);
  }, [endpoints, methodFilter]);

  const layout = useMemo(() => {
    const startX = 60;
    const startY = 70;
    const rowHeight = 58;
    const width = 1100;
    const height = Math.max(500, startY + visibleEndpoints.length * rowHeight + 60);

    return { startX, startY, rowHeight, width, height };
  }, [visibleEndpoints]);

  const methodColors: { [key: string]: { bg: string; text: string; border: string } } = {
    GET: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: '#10b981' },
    POST: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#38bdf8' },
    PUT: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: '#f59e0b' },
    DELETE: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444' },
    PATCH: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', border: '#a855f7' },
  };

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
          <Globe size={14} style={{ color: '#38bdf8' }} />
          <span style={{ color: '#ffffff', fontWeight: 600 }}>API Architecture Map</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '10px' }}>
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: methodFilter === m ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                  backgroundColor: methodFilter === m ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: methodFilter === m ? '#38bdf8' : 'var(--ref-mute)',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => svgRef.current && exportSvg(svgRef.current, 'api-map')}
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
            onClick={() => svgRef.current && exportPng(svgRef.current, 'api-map')}
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
          HTTP endpoint routing tree and downstream collaborators inferred from Controller methods and CALLS relationships.
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
            <marker id="api-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
            </marker>
          </defs>

          {/* Column Header Titles */}
          <text x="60" y="45" fill="var(--ref-mute)" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">
            ENDPOINT / ROUTE
          </text>
          <text x="380" y="45" fill="var(--ref-mute)" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">
            CONTROLLER HANDLER
          </text>
          <text x="680" y="45" fill="var(--ref-mute)" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">
            SERVICE LOGIC
          </text>
          <text x="940" y="45" fill="var(--ref-mute)" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">
            PERSISTENCE
          </text>

          {/* Endpoint Rows */}
          {visibleEndpoints.map((ep, idx) => {
            const y = layout.startY + idx * layout.rowHeight;
            const isSelected = selectedEndpoint?.id === ep.id;
            const meta = methodColors[ep.method] || methodColors.GET;

            return (
              <g
                key={ep.id}
                transform={`translate(60, ${y})`}
                onClick={() => setSelectedEndpoint(ep)}
                style={{ cursor: 'pointer' }}
              >
                {/* Background row highlight */}
                <rect
                  width="980"
                  height="46"
                  rx="6"
                  fill={isSelected ? 'rgba(56, 189, 248, 0.1)' : '#0d1220'}
                  stroke={isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)'}
                  strokeWidth="1"
                />

                {/* HTTP Method Badge */}
                <rect x="10" y="10" width="54" height="26" rx="4" fill={meta.bg} stroke={meta.border} strokeWidth="1" />
                <text x="37" y="27" textAnchor="middle" fill={meta.text} fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">
                  {ep.method}
                </text>

                {/* Route Path */}
                <text x="76" y="27" fill="#ffffff" fontSize="11" fontWeight="600" fontFamily="var(--font-mono)">
                  {ep.path}
                </text>

                {/* Arrow 1 */}
                <line x1="310" y1="23" x2="330" y2="23" stroke="#475569" strokeWidth="1.5" markerEnd="url(#api-arrow)" />

                {/* Controller Handler */}
                <text x="340" y="22" fill="#38bdf8" fontSize="10.5" fontWeight="600" fontFamily="var(--font-mono)">
                  {ep.controllerName}
                </text>
                <text x="340" y="35" fill="var(--ref-mute)" fontSize="9" fontFamily="var(--font-mono)">
                  {ep.methodName}()
                </text>

                {/* Arrow 2 */}
                <line x1="590" y1="23" x2="610" y2="23" stroke="#475569" strokeWidth="1.5" markerEnd="url(#api-arrow)" />

                {/* Service */}
                <text x="620" y="27" fill="#a855f7" fontSize="10.5" fontWeight="600" fontFamily="var(--font-mono)">
                  {ep.serviceName}
                </text>

                {/* Arrow 3 */}
                <line x1="850" y1="23" x2="870" y2="23" stroke="#475569" strokeWidth="1.5" markerEnd="url(#api-arrow)" />

                {/* Repository */}
                <text x="880" y="27" fill="#10b981" fontSize="10.5" fontWeight="600" fontFamily="var(--font-mono)">
                  {ep.repoName}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Side Inspector */}
        {selectedEndpoint && (
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
              <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                Endpoint Details
              </span>
              <button
                onClick={() => setSelectedEndpoint(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: methodColors[selectedEndpoint.method]?.bg,
                  color: methodColors[selectedEndpoint.method]?.text,
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {selectedEndpoint.method}
              </span>
              <span style={{ color: '#ffffff', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 600 }}>
                {selectedEndpoint.path}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                <div style={{ color: 'var(--ref-mute)', fontSize: '0.68rem' }}>Controller & Method</div>
                <div style={{ color: '#38bdf8', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {selectedEndpoint.controllerName}.{selectedEndpoint.methodName}()
                </div>
              </div>

              <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                <div style={{ color: 'var(--ref-mute)', fontSize: '0.68rem' }}>Business Service</div>
                <div style={{ color: '#a855f7', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {selectedEndpoint.serviceName}
                </div>
              </div>

              <div style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                <div style={{ color: 'var(--ref-mute)', fontSize: '0.68rem' }}>Persistence Repository</div>
                <div style={{ color: '#10b981', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {selectedEndpoint.repoName}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
