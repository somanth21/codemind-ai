import React, { useState, useMemo } from 'react';
import { ArchitectureGraph, ArchitectureGraphNode } from '../../types/architecture';
import { Layers, Search, Filter, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface DependencyGraphViewerProps {
  graph: ArchitectureGraph;
}

export const DependencyGraphViewer: React.FC<DependencyGraphViewerProps> = ({ graph }) => {
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState<ArchitectureGraphNode | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [zoom, setZoom] = useState(1);

  const filteredNodes = useMemo(() => {
    return (graph.nodes || []).filter((node) => {
      const matchesSearch =
        node.id.toLowerCase().includes(search.toLowerCase()) ||
        node.label.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'ALL' || node.type.toUpperCase() === typeFilter.toUpperCase();
      return matchesSearch && matchesType;
    });
  }, [graph.nodes, search, typeFilter]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return (graph.edges || []).filter(
      (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );
  }, [graph.edges, filteredNodeIds]);

  // Layout calculation: circular / grid layout
  const layout = useMemo(() => {
    const width = 800;
    const height = 550;
    const radius = Math.min(width, height) * 0.38;
    const centerX = width / 2;
    const centerY = height / 2;
    const total = filteredNodes.length;

    const positions = new Map<string, { x: number; y: number }>();
    filteredNodes.forEach((node, index) => {
      if (total === 1) {
        positions.set(node.id, { x: centerX, y: centerY });
      } else {
        const angle = (2 * Math.PI * index) / total;
        positions.set(node.id, {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      }
    });

    return { width, height, positions };
  }, [filteredNodes]);

  const getNodeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PACKAGE':
        return '#8b5cf6'; // purple
      case 'INTERFACE':
        return '#06b6d4'; // cyan
      case 'RECORD':
        return '#10b981'; // emerald
      default:
        return '#3b82f6'; // blue (class)
    }
  };

  const selectedConnectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return (graph.edges || []).filter(
      (e) => e.source === selectedNode.id || e.target === selectedNode.id
    );
  }, [selectedNode, graph.edges]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbols..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="ALL">All Types</option>
              <option value="CLASS">Classes</option>
              <option value="INTERFACE">Interfaces</option>
              <option value="PACKAGE">Packages</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-[480px]">
        {/* SVG Canvas */}
        <div className="flex-1 overflow-hidden relative flex items-center justify-center p-2 bg-slate-950">
          {filteredNodes.length === 0 ? (
            <div className="text-slate-500 text-sm">No graph nodes match current filters</div>
          ) : (
            <svg
              width="100%"
              height="480"
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              className="transition-transform duration-100"
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="14"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
                </marker>
                <marker
                  id="arrowhead-active"
                  markerWidth="8"
                  markerHeight="6"
                  refX="14"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#a855f7" />
                </marker>
              </defs>

              {/* Graph Edges */}
              {filteredEdges.map((edge) => {
                const srcPos = layout.positions.get(edge.source);
                const tgtPos = layout.positions.get(edge.target);
                if (!srcPos || !tgtPos) return null;

                const isConnected =
                  selectedNode &&
                  (edge.source === selectedNode.id || edge.target === selectedNode.id);

                return (
                  <line
                    key={edge.id}
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke={isConnected ? '#a855f7' : '#334155'}
                    strokeWidth={isConnected ? 2.5 : 1.2}
                    strokeDasharray={edge.relationshipType === 'IMPLEMENTS' ? '4 3' : undefined}
                    markerEnd={isConnected ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                    className="transition-all"
                  />
                );
              })}

              {/* Graph Nodes */}
              {filteredNodes.map((node) => {
                const pos = layout.positions.get(node.id);
                if (!pos) return null;

                const isSelected = selectedNode?.id === node.id;
                const color = getNodeColor(node.type);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer group"
                  >
                    <circle
                      r={isSelected ? 16 : 12}
                      fill={color}
                      stroke={isSelected ? '#ffffff' : '#1e293b'}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="transition-all hover:brightness-125"
                    />
                    <text
                      y={24}
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize="10"
                      fontFamily="monospace"
                      className="pointer-events-none select-none font-medium"
                    >
                      {node.label.length > 18 ? node.label.substring(0, 16) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Selected Node Details Drawer */}
        <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900 flex flex-col justify-between text-xs">
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: getNodeColor(selectedNode.type) }}
                  />
                  <span className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    {selectedNode.type}
                  </span>
                </div>
                <h4 className="font-mono font-bold text-slate-800 dark:text-slate-100 break-all text-sm">
                  {selectedNode.label}
                </h4>
                <p className="font-mono text-slate-500 text-[11px] break-all mt-0.5">
                  {selectedNode.id}
                </p>
              </div>

              {selectedNode.metadata && (
                <div className="space-y-1 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Metadata:</span>
                  {Object.entries(selectedNode.metadata).map(([k, v]) => (
                    <div key={k} className="text-slate-500 font-mono text-[11px] truncate">
                      {k}: <span className="text-slate-700 dark:text-slate-300">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Connected Dependencies ({selectedConnectedEdges.length}):
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {selectedConnectedEdges.map((e) => (
                    <div
                      key={e.id}
                      className="p-1.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]"
                    >
                      <span className="text-indigo-500 font-bold">{e.relationshipType}</span>:{' '}
                      <span className="text-slate-700 dark:text-slate-300">
                        {e.source === selectedNode.id ? `-> ${e.target}` : `<- ${e.source}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-center py-12 flex flex-col items-center gap-2">
              <Layers className="w-8 h-8 opacity-40" />
              <span>Select any node on the graph to view dependency details</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex justify-between">
            <span>Nodes: {filteredNodes.length}</span>
            <span>Edges: {filteredEdges.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
