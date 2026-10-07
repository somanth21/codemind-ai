import React, { useState, useMemo, useRef } from 'react';
import { ArchitectureGraph, ArchitectureAnalysis } from '../../../types/architecture';
import { SymbolItem, RelationshipItem } from '../../../types/analysis';
import { ListOrdered, ZoomIn, ZoomOut, RotateCcw, Download, AlertCircle } from 'lucide-react';
import { exportSvg, exportPng } from '../exportUtils';

interface SequenceDiagramProps {
  graph: ArchitectureGraph;
  analysis?: ArchitectureAnalysis | null;
  symbols?: SymbolItem[];
  relationships?: RelationshipItem[];
}

interface Participant {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface SequenceStep {
  fromId: string;
  toId: string;
  methodName: string;
  returnType: string;
  stepNumber: number;
}

export const SequenceDiagram: React.FC<SequenceDiagramProps> = ({
  graph: _graph,
  analysis: _analysis,
  symbols = [],
  relationships = [],
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedEntrypointId, setSelectedEntrypointId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Identify candidate entry points (e.g. Controller methods or top service methods)
  const entrypoints = useMemo(() => {
    const methods = symbols.filter((s) => s.kind === 'METHOD');
    // Prioritize controller methods, else methods with outgoing CALLS
    const callSources = new Set(
      relationships.filter((r) => r.relationshipType === 'CALLS').map((r) => r.sourceSymbolId || r.sourceFqn)
    );

    const candidates = methods.filter((m) => {
      const isCallSource = callSources.has(m.id) || callSources.has(m.fqn);
      const isController =
        m.filePath.toLowerCase().includes('controller') ||
        m.name.startsWith('get') ||
        m.name.startsWith('post') ||
        m.name.startsWith('handle') ||
        m.name.startsWith('analyze');
      return isCallSource || isController;
    });

    return candidates.length > 0 ? candidates : methods.slice(0, 15);
  }, [symbols, relationships]);

  // Current active entrypoint
  const activeEntrypoint = useMemo(() => {
    if (selectedEntrypointId) {
      return entrypoints.find((e) => e.id === selectedEntrypointId) || entrypoints[0] || null;
    }
    return entrypoints[0] || null;
  }, [entrypoints, selectedEntrypointId]);

  // Trace static sequence steps from active entrypoint
  const { participants, steps } = useMemo(() => {
    if (!activeEntrypoint) {
      return { participants: [], steps: [] };
    }

    const partMap = new Map<string, Participant>();
    // Add Client / Caller
    partMap.set('client', { id: 'client', name: 'HTTP Client', type: 'CLIENT', color: '#94a3b8' });

    // Entrypoint's parent class
    const parentClass = symbols.find((s) => s.id === activeEntrypoint.parentSymbolId);
    const entryClassName = parentClass ? parentClass.name : 'EntryPoint';
    partMap.set('entry', { id: 'entry', name: entryClassName, type: 'CONTROLLER', color: '#38bdf8' });

    const traceSteps: SequenceStep[] = [];
    traceSteps.push({
      fromId: 'client',
      toId: 'entry',
      methodName: `${activeEntrypoint.name}()`,
      returnType: activeEntrypoint.returnType || 'Response',
      stepNumber: 1,
    });

    // Find outgoing calls from entrypoint method or its class
    const callsFromEntry = relationships.filter(
      (r) =>
        r.relationshipType === 'CALLS' &&
        (r.sourceSymbolId === activeEntrypoint.id ||
          r.sourceSymbolId === parentClass?.id ||
          r.sourceFqn === activeEntrypoint.fqn ||
          r.sourceFqn === parentClass?.fqn)
    );

    let currentFrom = 'entry';
    let stepCount = 2;

    callsFromEntry.slice(0, 5).forEach((call) => {
      const targetSymbol = symbols.find((s) => s.id === call.targetSymbolId || s.fqn === call.targetFqn);
      const targetClass = symbols.find((s) => s.id === targetSymbol?.parentSymbolId) || targetSymbol;
      const targetName = targetClass ? targetClass.name : call.targetFqn?.split('.').pop() || 'Collaborator';
      const targetId = `part-${targetName}`;

      if (!partMap.has(targetId)) {
        let type = 'SERVICE';
        let color = '#a855f7';
        if (targetName.toLowerCase().includes('repo')) {
          type = 'REPOSITORY';
          color = '#f59e0b';
        } else if (targetName.toLowerCase().includes('client') || targetName.toLowerCase().includes('api')) {
          type = 'CLIENT';
          color = '#ec4899';
        }
        partMap.set(targetId, { id: targetId, name: targetName, type, color });
      }

      const methodName = targetSymbol ? `${targetSymbol.name}()` : call.targetFqn?.split('.').pop() + '()' || 'invoke()';
      traceSteps.push({
        fromId: currentFrom,
        toId: targetId,
        methodName,
        returnType: targetSymbol?.returnType || 'void',
        stepNumber: stepCount++,
      });

      // Also check 1 hop deeper from target
      const secondaryCalls = relationships.filter(
        (r) =>
          r.relationshipType === 'CALLS' &&
          (r.sourceSymbolId === targetSymbol?.id || r.sourceSymbolId === targetClass?.id)
      );

      secondaryCalls.slice(0, 2).forEach((secCall) => {
        const secTarget = symbols.find((s) => s.id === secCall.targetSymbolId || s.fqn === secCall.targetFqn);
        const secName = secTarget ? secTarget.name : secCall.targetFqn?.split('.').pop() || 'Store';
        const secId = `part-${secName}`;
        if (!partMap.has(secId)) {
          partMap.set(secId, { id: secId, name: secName, type: 'DATA_STORE', color: '#10b981' });
        }
        traceSteps.push({
          fromId: targetId,
          toId: secId,
          methodName: secTarget ? `${secTarget.name}()` : 'query()',
          returnType: secTarget?.returnType || 'Result',
          stepNumber: stepCount++,
        });
      });
    });

    return {
      participants: Array.from(partMap.values()),
      steps: traceSteps,
    };
  }, [activeEntrypoint, symbols, relationships]);

  // Compute Layout coordinates
  const layout = useMemo(() => {
    const colSpacing = 220;
    const startX = 100;
    const headerHeight = 70;
    const stepHeight = 55;
    const lifelineHeight = headerHeight + steps.length * stepHeight + 90;
    const totalWidth = Math.max(950, startX * 2 + Math.max(0, participants.length - 1) * colSpacing);

    const positions = new Map<string, number>();
    participants.forEach((p, idx) => {
      positions.set(p.id, startX + idx * colSpacing);
    });

    return {
      positions,
      headerHeight,
      stepHeight,
      lifelineHeight,
      width: totalWidth,
      height: lifelineHeight + 60,
    };
  }, [participants, steps]);

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
          <span style={{ color: 'var(--ref-mute)', fontWeight: 600 }}>Execution Entrypoint:</span>
          <select
            value={activeEntrypoint?.id || ''}
            onChange={(e) => setSelectedEntrypointId(e.target.value)}
            style={{
              background: '#0d1220',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: '5px',
              fontSize: '0.74rem',
              fontFamily: 'var(--font-mono)',
              maxWidth: '340px',
            }}
          >
            {entrypoints.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}() — {e.filePath.split('/').pop()}
              </option>
            ))}
          </select>
          <span style={{ color: 'var(--ref-mute)', fontSize: '0.7rem' }}>
            ({steps.length} call invocations in sequence flow)
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => svgRef.current && exportSvg(svgRef.current, 'sequence-diagram')}
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
            onClick={() => svgRef.current && exportPng(svgRef.current, 'sequence-diagram')}
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

      {/* Prominent Required Disclaimer Banner */}
      <div
        style={{
          padding: '6px 16px',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
          color: '#f59e0b',
          fontSize: '0.72rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <AlertCircle size={14} style={{ flexShrink: 0 }} />
        <span>
          Sequence inferred from static call relationships; runtime behavior may differ depending on dynamic polymorphism, dependency injection, and execution paths.
        </span>
      </div>

      {/* Main Diagram Canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#070a12', display: 'flex' }}>
        {participants.length === 0 ? (
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
            <ListOrdered size={32} />
            <span>No sequence invocation flow could be determined for the selected entrypoint.</span>
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
              <marker id="seq-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
              </marker>
              <marker id="seq-return" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
              </marker>
            </defs>

            {/* Lifelines and Participant Headers */}
            {participants.map((p) => {
              const x = layout.positions.get(p.id) || 100;
              return (
                <g key={p.id}>
                  {/* Vertical Lifeline */}
                  <line
                    x1={x}
                    y1={layout.headerHeight}
                    x2={x}
                    y2={layout.lifelineHeight}
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                  />

                  {/* Header Box */}
                  <rect
                    x={x - 65}
                    y={16}
                    width={130}
                    height={40}
                    rx="6"
                    fill="#0d1220"
                    stroke={p.color}
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={34}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="var(--font-mono)"
                  >
                    {p.name.length > 15 ? p.name.substring(0, 13) + '…' : p.name}
                  </text>
                  <text
                    x={x}
                    y={48}
                    textAnchor="middle"
                    fill="var(--ref-mute)"
                    fontSize="8"
                    fontFamily="var(--font-mono)"
                  >
                    «{p.type}»
                  </text>
                </g>
              );
            })}

            {/* Invocations / Steps */}
            {steps.map((step) => {
              const x1 = layout.positions.get(step.fromId) || 100;
              const x2 = layout.positions.get(step.toId) || 200;
              const y = layout.headerHeight + step.stepNumber * layout.stepHeight;

              // Activation bar on receiver
              const isForward = x2 > x1;
              const arrowOffset = isForward ? -5 : 5;

              return (
                <g key={step.stepNumber}>
                  {/* Activation box on target lifeline */}
                  <rect
                    x={x2 - 5}
                    y={y - 12}
                    width={10}
                    height={30}
                    fill="#1e293b"
                    stroke="#38bdf8"
                    strokeWidth="1"
                    rx="2"
                  />

                  {/* Call Arrow */}
                  <line
                    x1={x1}
                    y1={y}
                    x2={x2 + arrowOffset}
                    y2={y}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    markerEnd="url(#seq-arrow)"
                  />

                  {/* Step method label */}
                  <text
                    x={(x1 + x2) / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="var(--font-mono)"
                  >
                    {step.stepNumber}. {step.methodName}
                  </text>

                  {/* Return Dashed Line */}
                  <line
                    x1={x2}
                    y1={y + 16}
                    x2={x1 - arrowOffset}
                    y2={y + 16}
                    stroke="#64748b"
                    strokeWidth="1"
                    strokeDasharray="4 3"
                    markerEnd="url(#seq-return)"
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={y + 26}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="8.5"
                    fontFamily="var(--font-mono)"
                  >
                    return {step.returnType}
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
