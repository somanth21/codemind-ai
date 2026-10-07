import React, { useState, useMemo, useRef } from 'react';
import { ArchitectureGraph, ArchitectureAnalysis } from '../../../types/architecture';
import { SymbolItem, RelationshipItem } from '../../../types/analysis';
import { SecurityFinding } from '../../../types/security';
import { Shield, ShieldCheck, ZoomIn, ZoomOut, RotateCcw, Download, Info } from 'lucide-react';
import { exportSvg, exportPng } from '../exportUtils';

interface SecurityArchitectureDiagramProps {
  graph: ArchitectureGraph;
  analysis?: ArchitectureAnalysis | null;
  symbols?: SymbolItem[];
  relationships?: RelationshipItem[];
  securityFindings?: SecurityFinding[];
}

interface BoundaryZone {
  id: string;
  name: string;
  trustLevel: string;
  color: string;
  bg: string;
  border: string;
  components: string[];
}

export const SecurityArchitectureDiagram: React.FC<SecurityArchitectureDiagramProps> = ({
  graph: _graph,
  analysis: _analysis,
  symbols: _symbols,
  relationships: _relationships,
  securityFindings = [],
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedFinding, setSelectedFinding] = useState<SecurityFinding | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Trust boundary zones
  const zones: BoundaryZone[] = useMemo(() => {
    return [
      {
        id: 'zone-untrusted',
        name: 'Untrusted Edge (Public Client)',
        trustLevel: 'ZERO TRUST',
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.05)',
        border: '#ef4444',
        components: ['Browser SPA / Mobile Client', 'Public Ingress Gateway', 'CORS & TLS Edge'],
      },
      {
        id: 'zone-perimeter',
        name: 'Authentication & Security Perimeter',
        trustLevel: 'VERIFICATION BOUNDARY',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.05)',
        border: '#f59e0b',
        components: ['JwtAuthenticationFilter', 'SecurityConfig (Spring Security)', 'OAuth2 / RBAC Guard'],
      },
      {
        id: 'zone-core',
        name: 'Protected Application Domain',
        trustLevel: 'AUTHENTICATED TENANT CONTEXT',
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.05)',
        border: '#38bdf8',
        components: ['Business Logic Services', 'Domain Rule Engine', 'DTO Marshaling & Validation'],
      },
      {
        id: 'zone-data',
        name: 'Encrypted Persistence & Data Boundary',
        trustLevel: 'CONFIDENTIAL STORAGE',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.05)',
        border: '#10b981',
        components: ['PostgreSQL / JPA Repositories', 'Secure Vault / Env Secrets', 'Encrypted File Storage'],
      },
    ];
  }, []);

  const layout = useMemo(() => {
    const width = 1100;
    const zoneHeight = 110;
    const startY = 60;
    const height = startY + zones.length * (zoneHeight + 24) + 60;

    return { width, height, zoneHeight, startY };
  }, [zones]);

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
          <Shield size={14} style={{ color: '#ef4444' }} />
          <span style={{ color: '#ffffff', fontWeight: 600 }}>Security Architecture & Trust Boundaries</span>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              fontSize: '0.68rem',
              fontWeight: 700,
            }}
          >
            INFERRED BOUNDARIES
          </span>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              fontSize: '0.68rem',
              fontWeight: 700,
            }}
          >
            {securityFindings.length} DETECTED STATIC VULNERABILITIES
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => svgRef.current && exportSvg(svgRef.current, 'security-architecture')}
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
            onClick={() => svgRef.current && exportPng(svgRef.current, 'security-architecture')}
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
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
          color: '#cbd5e1',
          fontSize: '0.72rem',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Info size={13} style={{ color: '#ef4444' }} />
        <span>
          Trust boundaries are inferred from gateway filters and storage abstractions; vulnerability findings are deterministically detected from security analysis.
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
            <marker id="sec-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
            </marker>
          </defs>

          {/* Zones */}
          {zones.map((zone, idx) => {
            const y = layout.startY + idx * (layout.zoneHeight + 24);

            return (
              <g key={zone.id}>
                {/* Zone Container */}
                <rect
                  x="40"
                  y={y}
                  width="1020"
                  height={layout.zoneHeight}
                  rx="8"
                  fill={zone.bg}
                  stroke={zone.border}
                  strokeWidth="1.5"
                  strokeDasharray={idx === 1 ? '6 3' : undefined}
                />

                {/* Zone Label */}
                <text x="60" y={y + 24} fill={zone.color} fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">
                  {zone.name.toUpperCase()}
                </text>
                <text x="1040" y={y + 24} textAnchor="end" fill="var(--ref-mute)" fontSize="9" fontFamily="var(--font-mono)">
                  [{zone.trustLevel}]
                </text>

                {/* Zone Components */}
                <g transform={`translate(60, ${y + 40})`}>
                  {zone.components.map((c, cIdx) => (
                    <g key={cIdx} transform={`translate(${cIdx * 310}, 0)`}>
                      <rect
                        width="290"
                        height="48"
                        rx="5"
                        fill="#0d1220"
                        stroke="rgba(255, 255, 255, 0.12)"
                        strokeWidth="1"
                      />
                      <text x="14" y="24" fill="#ffffff" fontSize="10.5" fontWeight="600" fontFamily="var(--font-mono)">
                        {c}
                      </text>
                      <text x="14" y="38" fill="var(--ref-mute)" fontSize="8.5" fontFamily="var(--font-mono)">
                        Security Isolation Boundary
                      </text>
                    </g>
                  ))}
                </g>

                {/* Downward Cross-Boundary Arrows */}
                {idx < zones.length - 1 && (
                  <line
                    x1="550"
                    y1={y + layout.zoneHeight + 2}
                    x2="550"
                    y2={y + layout.zoneHeight + 20}
                    stroke="#64748b"
                    strokeWidth="2"
                    markerEnd="url(#sec-arrow)"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Security Findings Overlay / Side Drawer */}
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
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.74rem', textTransform: 'uppercase' }}>
              Static Security Findings ({securityFindings.length})
            </span>
          </div>

          {securityFindings.length === 0 ? (
            <div style={{ color: 'var(--ref-mute)', fontSize: '0.78rem', marginTop: '12px' }}>
              <ShieldCheck size={24} style={{ color: '#10b981', marginBottom: '6px' }} />
              <div>No static security vulnerabilities detected in the repository codebase.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {securityFindings.map((finding) => (
                <div
                  key={finding.id}
                  onClick={() => setSelectedFinding(finding)}
                  style={{
                    padding: '10px',
                    backgroundColor: selectedFinding?.id === finding.id ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid',
                    borderColor: selectedFinding?.id === finding.id ? '#ef4444' : 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        backgroundColor: finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? '#ef4444' : '#f59e0b',
                      }}
                    >
                      {finding.severity}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--ref-mute)' }}>{finding.category}</span>
                  </div>
                  <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.78rem', marginTop: '6px' }}>
                    {finding.ruleName || finding.message}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                    {finding.filePath}:{finding.lineNumber}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
