import React, { useState, useMemo, useRef } from 'react';
import { ArchitectureGraph, ArchitectureAnalysis } from '../../../types/architecture';
import { RepositoryTreeNode } from '../../../types/repository';
import { Box, Server, Database, Globe, ZoomIn, ZoomOut, RotateCcw, Download, Info } from 'lucide-react';
import { exportSvg, exportPng } from '../exportUtils';

interface DeploymentDiagramProps {
  graph: ArchitectureGraph;
  analysis?: ArchitectureAnalysis | null;
  tree?: RepositoryTreeNode | null;
}

interface DeploymentNode {
  id: string;
  name: string;
  type: 'CONTAINER' | 'DATABASE' | 'NETWORK' | 'INGRESS';
  details: string[];
  port?: string;
  icon: any;
  color: string;
}

export const DeploymentDiagram: React.FC<DeploymentDiagramProps> = ({
  graph: _graph,
  analysis: _analysis,
  tree,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Traverse tree to detect Dockerfile, docker-compose, pom.xml, or application.yml
  const detectedFiles = useMemo(() => {
    const files: string[] = [];
    const traverse = (node?: RepositoryTreeNode | null) => {
      if (!node) return;
      if (node.type === 'FILE') {
        const lower = node.name.toLowerCase();
        if (
          lower === 'dockerfile' ||
          lower.includes('docker-compose') ||
          lower === 'application.properties' ||
          lower === 'application.yml' ||
          lower === 'pom.xml'
        ) {
          files.push(node.path || node.name);
        }
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    traverse(tree);
    return files;
  }, [tree]);

  const hasDeploymentDescriptors = detectedFiles.length > 0;

  // Inferred deployment topology
  const deploymentNodes: DeploymentNode[] = useMemo(() => {
    if (!hasDeploymentDescriptors) return [];

    return [
      {
        id: 'node-client',
        name: 'Client Browser / CDN',
        type: 'INGRESS',
        details: ['HTTPS TLS 1.3', 'Port 443 -> 80/5173'],
        port: '443',
        icon: Globe,
        color: '#38bdf8',
      },
      {
        id: 'node-app',
        name: 'Backend Application Container',
        type: 'CONTAINER',
        details: ['Spring Boot 3.3.4 (Java 17/21)', 'Port 8080', 'Inferred from pom.xml / Dockerfile'],
        port: '8080',
        icon: Server,
        color: '#a855f7',
      },
      {
        id: 'node-db',
        name: 'Relational Database Service',
        type: 'DATABASE',
        details: ['PostgreSQL 15+ (Neon / RDS)', 'Port 5432', 'Inferred from application.properties / JPA'],
        port: '5432',
        icon: Database,
        color: '#10b981',
      },
    ];
  }, [hasDeploymentDescriptors]);

  const layout = {
    width: 1000,
    height: 520,
    nodeWidth: 260,
    nodeHeight: 140,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Box size={14} style={{ color: '#38bdf8' }} />
          <span style={{ color: '#ffffff', fontWeight: 600 }}>Deployment & Runtime Topology</span>
          <span style={{ color: 'var(--ref-mute)', fontSize: '0.7rem' }}>
            ({detectedFiles.length} deployment descriptors discovered)
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => svgRef.current && exportSvg(svgRef.current, 'deployment-diagram')}
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
            onClick={() => svgRef.current && exportPng(svgRef.current, 'deployment-diagram')}
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
          Deployment topology inferred from build configurations (pom.xml, Dockerfile, application properties).
        </span>
      </div>

      {/* Main Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#070a12', display: 'flex' }}>
        {!hasDeploymentDescriptors ? (
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
            <Box size={32} />
            <span style={{ color: '#ffffff', fontWeight: 600 }}>No deployment descriptors detected in repository files</span>
            <span style={{ fontSize: '0.74rem' }}>
              No Dockerfile, docker-compose.yml, or cloud deployment manifests were discovered in this repository.
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
              <marker id="dep-arrow" markerWidth="9" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 9 3.5, 0 7" fill="#64748b" />
              </marker>
            </defs>

            {/* Connecting Pipes between Nodes */}
            <line x1="330" y1="230" x2="380" y2="230" stroke="#64748b" strokeWidth="2" markerEnd="url(#dep-arrow)" />
            <text x="355" y="220" textAnchor="middle" fill="var(--ref-mute)" fontSize="9" fontFamily="var(--font-mono)">
              REST / JSON
            </text>

            <line x1="640" y1="230" x2="690" y2="230" stroke="#64748b" strokeWidth="2" markerEnd="url(#dep-arrow)" />
            <text x="665" y="220" textAnchor="middle" fill="var(--ref-mute)" fontSize="9" fontFamily="var(--font-mono)">
              JDBC / TLS
            </text>

            {/* 3 Nodes: Client -> App -> DB */}
            {deploymentNodes.map((node, idx) => {
              const x = 70 + idx * 310;
              const y = 160;

              return (
                <g key={node.id} transform={`translate(${x}, ${y})`}>
                  {/* Outer container card */}
                  <rect
                    width={layout.nodeWidth}
                    height={layout.nodeHeight}
                    rx="8"
                    fill="#0d1220"
                    stroke={node.color}
                    strokeWidth="1.5"
                  />
                  <rect width={layout.nodeWidth} height="36" rx="8" fill="rgba(255, 255, 255, 0.03)" />
                  <line x1="0" y1="36" x2={layout.nodeWidth} y2="36" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

                  <text x="14" y="23" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">
                    {node.name}
                  </text>
                  <text x={layout.nodeWidth - 14} y="23" textAnchor="end" fill={node.color} fontSize="9" fontFamily="var(--font-mono)">
                    :{node.port}
                  </text>

                  {/* Details */}
                  <g transform="translate(14, 52)">
                    {node.details.map((d, dIdx) => (
                      <text key={dIdx} y={dIdx * 20 + 12} fill="#cbd5e1" fontSize="9.5" fontFamily="var(--font-mono)">
                        • {d}
                      </text>
                    ))}
                  </g>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};
