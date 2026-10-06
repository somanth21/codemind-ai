import React, { useState, useEffect } from 'react';
import {
  analyzeArchitecture,
  getArchitectureAnalyses,
  getArchitectureAnalysis,
  getArchitectureGraph,
} from '../../api/architecture';
import {
  ArchitectureAnalysis,
  ArchitectureGraph,
} from '../../types/architecture';
import { DependencyGraphViewer } from './DependencyGraphViewer';
import {
  GitFork,
  Layers,
  Repeat,
  Flame,
  AlertTriangle,
  RefreshCw,
  Share2,
  CheckCircle2,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface ArchitectureAnalysisViewProps {
  repositoryId: string;
}

export const ArchitectureAnalysisView: React.FC<ArchitectureAnalysisViewProps> = ({ repositoryId }) => {
  const [currentAnalysis, setCurrentAnalysis] = useState<ArchitectureAnalysis | null>(null);
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'coupling' | 'cycles' | 'hotspots' | 'smells' | 'graph'>('coupling');

  const fetchLatest = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getArchitectureAnalyses(repositoryId, 0, 10);
      if (res.content.length > 0) {
        const latest = res.content[0];
        const full = await getArchitectureAnalysis(repositoryId, latest.id);
        setCurrentAnalysis(full);
        const g = await getArchitectureGraph(repositoryId, latest.id);
        setGraph(g);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load architecture data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
  }, [repositoryId]);

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      const result = await analyzeArchitecture(repositoryId);
      setCurrentAnalysis(result);
      const g = await getArchitectureGraph(repositoryId, result.id);
      setGraph(g);
    } catch (err: any) {
      setError(err?.message || 'Architecture analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const getCouplingBadge = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'CENTRAL':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            CENTRAL
          </span>
        );
      case 'DEPENDENCY_HEAVY':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            DEP HEAVY
          </span>
        );
      case 'HIGHLY_COUPLED':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-800">
            HIGHLY COUPLED
          </span>
        );
      case 'ISOLATED':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            ISOLATED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            BALANCED
          </span>
        );
    }
  };

  const getHotspotBadge = (type: string) => {
    switch (type) {
      case 'HUB':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-400">CENTRAL HUB</span>;
      case 'HIGH_FAN_OUT':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400">HIGH FAN-OUT</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400">CORE ABSTRACTION</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              <GitFork className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deterministic Architecture Intelligence</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Package coupling (Ca, Ce, Instability), cycle detection, architectural hotspots, and dependency graphs
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRunAnalysis}
          disabled={analyzing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
          {analyzing ? 'Analyzing Architecture...' : 'Analyze Architecture'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      )}

      {/* Overview Metrics Cards */}
      {currentAnalysis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Packages</span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{currentAnalysis.totalPackages}</div>
            <div className="text-[11px] text-slate-400">Modules indexed</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Classes</span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{currentAnalysis.totalClasses}</div>
            <div className="text-[11px] text-slate-400">{currentAnalysis.totalInterfaces} interfaces</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Dependencies</span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{currentAnalysis.totalDependencies}</div>
            <div className="text-[11px] text-slate-400">Directed edges</div>
          </div>

          <div className={`bg-white dark:bg-slate-900 p-3.5 rounded-xl border shadow-sm ${currentAnalysis.cycleCount > 0 ? 'border-red-200 dark:border-red-900/50' : 'border-slate-200 dark:border-slate-800'}`}>
            <span className={`text-[11px] font-semibold uppercase ${currentAnalysis.cycleCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>Cycles</span>
            <div className={`mt-1 text-2xl font-bold ${currentAnalysis.cycleCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{currentAnalysis.cycleCount}</div>
            <div className="text-[11px] text-slate-400">Cyclic chains</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold uppercase text-purple-600 dark:text-purple-400">Hotspots</span>
            <div className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">{currentAnalysis.hotspotCount}</div>
            <div className="text-[11px] text-slate-400">Hubs & abstractions</div>
          </div>

          <div className={`bg-white dark:bg-slate-900 p-3.5 rounded-xl border shadow-sm ${currentAnalysis.smellCount > 0 ? 'border-amber-200 dark:border-amber-900/50' : 'border-slate-200 dark:border-slate-800'}`}>
            <span className={`text-[11px] font-semibold uppercase ${currentAnalysis.smellCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>Smells</span>
            <div className={`mt-1 text-2xl font-bold ${currentAnalysis.smellCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>{currentAnalysis.smellCount}</div>
            <div className="text-[11px] text-slate-400">God class / fan-out</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Avg Complexity</span>
            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{currentAnalysis.averageComplexity.toFixed(1)}</div>
            <div className="text-[11px] text-slate-400">Maintain: {currentAnalysis.averageMaintainability.toFixed(0)}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('coupling')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'coupling'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          Package Coupling ({currentAnalysis?.packageMetrics?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('cycles')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'cycles'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Repeat className="w-4 h-4" />
          Cycles ({currentAnalysis?.cycles?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('hotspots')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'hotspots'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Flame className="w-4 h-4" />
          Hotspots ({currentAnalysis?.hotspots?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('smells')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'smells'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Smells ({currentAnalysis?.smells?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'graph'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Share2 className="w-4 h-4" />
          Dependency Graph
        </button>
      </div>

      {/* Tab 1: Package Coupling */}
      {activeTab === 'coupling' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs text-slate-500">
            Robert C. Martin's Package Coupling Metrics: Afferent Coupling (Ca = incoming callers), Efferent Coupling (Ce = outgoing dependencies), Instability I = Ce / (Ca + Ce)
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Package Name</th>
                  <th className="py-3 px-3 font-semibold text-center">Classes</th>
                  <th className="py-3 px-3 font-semibold text-center">Interfaces</th>
                  <th className="py-3 px-3 font-semibold text-center">Ca (Incoming)</th>
                  <th className="py-3 px-3 font-semibold text-center">Ce (Outgoing)</th>
                  <th className="py-3 px-3 font-semibold text-center">Instability (I)</th>
                  <th className="py-3 px-4 font-semibold text-right">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(currentAnalysis?.packageMetrics || []).map((m) => (
                  <tr key={m.packageName} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      {m.packageName}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">{m.classCount}</td>
                    <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-300">{m.interfaceCount}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">{m.afferentCoupling}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{m.efferentCoupling}</td>
                    <td className="py-3 px-3 text-center font-mono font-medium">
                      <span className={m.instability > 0.7 ? 'text-red-500 font-bold' : m.instability < 0.3 ? 'text-emerald-500 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                        {m.instability.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{getCouplingBadge(m.couplingCategory)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Cycles */}
      {activeTab === 'cycles' && (
        <div className="space-y-4">
          {(currentAnalysis?.cycles || []).length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Acyclic Dependency Architecture</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                No cyclical dependencies detected between classes or packages. The architecture satisfies the Acyclic Dependencies Principle (ADP).
              </p>
            </div>
          ) : (
            currentAnalysis?.cycles.map((cycle, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/50 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400">
                      {cycle.cycleType} CYCLE
                    </span>
                    <span className="text-xs text-slate-500">Length: {cycle.length} nodes</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Cycle Chain:</div>
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-xs">
                    {cycle.members.map((member, mIdx) => (
                      <React.Fragment key={mIdx}>
                        <span className="font-bold text-red-600 dark:text-red-400">{member}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </React.Fragment>
                    ))}
                    <span className="font-bold text-red-600 dark:text-red-400">{cycle.members[0]}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Hotspots */}
      {activeTab === 'hotspots' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(currentAnalysis?.hotspots || []).length === 0 ? (
            <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No Critical Hotspots Identified</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                No classes exceed the high fan-out or hub thresholds. Coupling is uniformly distributed.
              </p>
            </div>
          ) : (
            currentAnalysis?.hotspots.map((h, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  {getHotspotBadge(h.hotspotType)}
                  <span className="text-xs text-slate-400 font-mono">Degree: {h.totalDegree} (In: {h.fanIn}, Out: {h.fanOut})</span>
                </div>

                <div>
                  <h4 className="font-mono font-bold text-slate-900 dark:text-white text-sm break-all">{h.symbolFqn}</h4>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">{h.filePath}</p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  {h.description}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Smells */}
      {activeTab === 'smells' && (
        <div className="space-y-4">
          {(currentAnalysis?.smells || []).length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Zero Architecture Smells Detected</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                The repository satisfies clean modularity boundaries without god classes or fragile fan-out hubs.
              </p>
            </div>
          ) : (
            currentAnalysis?.smells.map((smell, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/40 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                      {smell.smellType}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 font-mono">
                      {smell.severity}
                    </span>
                  </div>
                </div>

                <div className="font-mono font-bold text-slate-900 dark:text-white text-sm break-all">
                  {smell.affectedElement}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {smell.description}
                </p>

                {smell.metricsSnippet && (
                  <div className="text-xs font-mono text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded">
                    {smell.metricsSnippet}
                  </div>
                )}

                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-300 text-xs leading-relaxed">
                  <span className="font-bold">Architectural Remediation: </span>
                  {smell.remediation}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Dependency Graph */}
      {activeTab === 'graph' && graph && (
        <DependencyGraphViewer graph={graph} />
      )}
    </div>
  );
};
