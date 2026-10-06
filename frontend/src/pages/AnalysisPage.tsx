import React, { useEffect, useState } from 'react';
import { useRepository } from '../context/RepositoryContext';
import { NoRepoSelected } from '../components/common/NoRepoSelected';
import {
  triggerAnalysis,
  getAnalysisRuns,
  getSymbols,
  getFileMetrics,
  getQualityFindings,
  getSecretFindings,
} from '../api/analysis';
import {
  AnalysisRun,
  SymbolItem,
  FileMetricsItem,
  QualityFindingItem,
  SecretFindingItem,
  SymbolKind,
} from '../types/analysis';
import {
  Activity,
  AlertTriangle,
  Code2,
  Layers,
  Loader2,
  Play,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

type TabType = 'overview' | 'symbols' | 'metrics' | 'quality' | 'secrets';

export const AnalysisPage: React.FC = () => {
  const { selectedRepo } = useRepository();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AnalysisRun | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab Data States
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  const [symbolKindFilter, setSymbolKindFilter] = useState<string>('');
  const [fileMetrics, setFileMetrics] = useState<FileMetricsItem[]>([]);
  const [qualityFindings, setQualityFindings] = useState<QualityFindingItem[]>([]);
  const [secretFindings, setSecretFindings] = useState<SecretFindingItem[]>([]);
  const [tabLoading, setTabLoading] = useState<boolean>(false);

  const fetchRuns = async (repoId: string) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await getAnalysisRuns(repoId, 0, 10);
      setRuns(res.content);
      if (res.content.length > 0) {
        setSelectedRun(res.content[0]);
      } else {
        setSelectedRun(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch analysis runs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      fetchRuns(selectedRepo.id);
    }
  }, [selectedRepo]);

  const handleTriggerAnalysis = async () => {
    if (!selectedRepo) return;
    try {
      setIsAnalyzing(true);
      setErrorMsg(null);
      const newRun = await triggerAnalysis(selectedRepo.id);
      setSelectedRun(newRun);
      await fetchRuns(selectedRepo.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Analysis run failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!selectedRepo || !selectedRun) return;

    const loadTabData = async () => {
      setTabLoading(true);
      try {
        if (activeTab === 'symbols') {
          const kindParam = symbolKindFilter ? (symbolKindFilter as SymbolKind) : undefined;
          const data = await getSymbols(selectedRepo.id, selectedRun.id, 0, 50, kindParam);
          setSymbols(data.content);
        } else if (activeTab === 'metrics') {
          const data = await getFileMetrics(selectedRepo.id, selectedRun.id, 0, 50);
          setFileMetrics(data.content);
        } else if (activeTab === 'quality') {
          const data = await getQualityFindings(selectedRepo.id, selectedRun.id, 0, 50);
          setQualityFindings(data.content);
        } else if (activeTab === 'secrets') {
          const data = await getSecretFindings(selectedRepo.id, selectedRun.id, 0, 50);
          setSecretFindings(data.content);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load tab data');
      } finally {
        setTabLoading(false);
      }
    };

    loadTabData();
  }, [selectedRepo, selectedRun, activeTab, symbolKindFilter]);

  if (!selectedRepo) {
    return (
      <NoRepoSelected
        moduleName="Deterministic Static Analysis"
        description="Select an ingested repository from the header dropdown to run JavaParser AST extraction, cyclomatic complexity calculations, Halstead maintainability scoring, and secret scanning."
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="analysis-page">
      {/* Page Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Deterministic Static Analysis</h1>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {selectedRepo.name}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  AST Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                JavaParser AST parsing, McCabe cyclomatic complexity, Halstead metrics, maintainability index, and deterministic secret audit.
              </p>
            </div>
          </div>

          <button
            onClick={handleTriggerAnalysis}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition shadow"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Parsing AST...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Run Analysis</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg bg-rose-950/40 border border-rose-800/50 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Runs Bar */}
        {runs.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-3 text-xs overflow-x-auto">
            <span className="text-slate-400 font-medium shrink-0">Historical Runs:</span>
            {runs.map((run) => (
              <button
                key={run.id}
                onClick={() => setSelectedRun(run)}
                className={`flex items-center space-x-2 rounded px-2.5 py-1 transition ${
                  selectedRun?.id === run.id
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{new Date(run.startedAt).toLocaleTimeString()}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] uppercase ${
                    run.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : run.status === 'ANALYZING'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {run.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-900/50 rounded-t-xl px-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`border-b-2 py-3 px-4 flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="h-4 w-4" /> Overview &amp; Metrics
        </button>
        <button
          onClick={() => setActiveTab('symbols')}
          className={`border-b-2 py-3 px-4 flex items-center gap-2 ${
            activeTab === 'symbols'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="h-4 w-4" /> Symbol Table
        </button>
        <button
          onClick={() => setActiveTab('metrics')}
          className={`border-b-2 py-3 px-4 flex items-center gap-2 ${
            activeTab === 'metrics'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" /> File Metrics
        </button>
        <button
          onClick={() => setActiveTab('quality')}
          className={`border-b-2 py-3 px-4 flex items-center gap-2 ${
            activeTab === 'quality'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="h-4 w-4" /> Quality Findings
        </button>
        <button
          onClick={() => setActiveTab('secrets')}
          className={`border-b-2 py-3 px-4 flex items-center gap-2 ${
            activeTab === 'secrets'
              ? 'border-indigo-500 text-indigo-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="h-4 w-4" /> Secret Scanner
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="rounded-b-xl border border-t-0 border-slate-800 bg-slate-900/40 p-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : !selectedRun ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <Activity className="h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-200">No static analysis runs yet</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Click &quot;Run Analysis&quot; above to parse the repository AST, calculate cyclomatic complexity, Halstead metrics, and inspect code quality.
            </p>
          </div>
        ) : (
          <div>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-slate-900 p-4 border border-slate-800 shadow-sm">
                    <div className="text-xs text-slate-400 font-medium">Physical Lines of Code (LOC)</div>
                    <div className="mt-2 text-2xl font-bold text-slate-100">{selectedRun.totalLoc.toLocaleString()}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{selectedRun.filesAnalyzed} files parsed via AST</div>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-4 border border-slate-800 shadow-sm">
                    <div className="text-xs text-slate-400 font-medium">Classes &amp; Methods</div>
                    <div className="mt-2 text-2xl font-bold text-slate-100">
                      {selectedRun.totalClasses} <span className="text-xs font-normal text-slate-400">classes</span> / {selectedRun.totalMethods} <span className="text-xs font-normal text-slate-400">methods</span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">Extracted AST symbol declarations</div>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-4 border border-slate-800 shadow-sm">
                    <div className="text-xs text-slate-400 font-medium">Avg Cyclomatic Complexity</div>
                    <div className="mt-2 text-2xl font-bold text-indigo-400">{selectedRun.averageComplexity}</div>
                    <div className="mt-1 text-[11px] text-slate-500">McCabe decision point count</div>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-4 border border-slate-800 shadow-sm">
                    <div className="text-xs text-slate-400 font-medium">Maintainability Index (MI)</div>
                    <div className="mt-2 text-2xl font-bold text-emerald-400">{selectedRun.maintainabilityIndex} / 100</div>
                    <div className="mt-1 text-[11px] text-slate-500">Halstead + CC + LOC bounded index</div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-200">Run Execution Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Status:</span>
                      <span className="font-medium text-emerald-400">{selectedRun.status}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Started:</span>
                      <span className="text-slate-200">{new Date(selectedRun.startedAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Errors / Warnings:</span>
                      <span className="text-amber-400">{selectedRun.errorCount} errors, {selectedRun.warningCount} warnings</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Skipped / Binary Files:</span>
                      <span className="text-slate-300">{selectedRun.filesSkipped} files</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SYMBOLS TAB */}
            {activeTab === 'symbols' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">Extracted Compilation Units and AST Symbols</div>
                  <select
                    value={symbolKindFilter}
                    onChange={(e) => setSymbolKindFilter(e.target.value)}
                    className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">All Symbol Kinds</option>
                    <option value="CLASS">Class</option>
                    <option value="INTERFACE">Interface</option>
                    <option value="ENUM">Enum</option>
                    <option value="RECORD">Record</option>
                    <option value="METHOD">Method</option>
                    <option value="CONSTRUCTOR">Constructor</option>
                    <option value="FIELD">Field</option>
                  </select>
                </div>

                {tabLoading ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Kind</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Visibility</th>
                          <th className="py-2.5 px-3">File / Lines</th>
                          <th className="py-2.5 px-3">Signature / FQN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {symbols.map((sym) => (
                          <tr key={sym.id} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3">
                              <span className="rounded bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 text-[10px]">
                                {sym.kind}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-200 font-semibold">{sym.name}</td>
                            <td className="py-2 px-3 text-slate-400">{sym.visibility || '-'}</td>
                            <td className="py-2 px-3 text-slate-400 truncate max-w-xs">
                              {sym.filePath}:{sym.startLine}-{sym.endLine}
                            </td>
                            <td className="py-2 px-3 text-slate-300 truncate max-w-md">
                              {sym.signature || sym.fqn}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* METRICS TAB */}
            {activeTab === 'metrics' && (
              <div className="space-y-4">
                {tabLoading ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">File</th>
                          <th className="py-2.5 px-3">LOC</th>
                          <th className="py-2.5 px-3">LLOC</th>
                          <th className="py-2.5 px-3">Complexity (CC)</th>
                          <th className="py-2.5 px-3">Classes</th>
                          <th className="py-2.5 px-3">Methods</th>
                          <th className="py-2.5 px-3">Halstead Vol</th>
                          <th className="py-2.5 px-3">MI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {fileMetrics.map((fm) => (
                          <tr key={fm.id} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3 text-slate-200">{fm.filePath}</td>
                            <td className="py-2 px-3 text-slate-300">{fm.loc}</td>
                            <td className="py-2 px-3 text-slate-400">{fm.lloc}</td>
                            <td className="py-2 px-3 text-indigo-400 font-semibold">{fm.cyclomaticComplexity}</td>
                            <td className="py-2 px-3 text-slate-300">{fm.classCount}</td>
                            <td className="py-2 px-3 text-slate-300">{fm.methodCount}</td>
                            <td className="py-2 px-3 text-slate-400">{fm.halsteadVolume}</td>
                            <td className="py-2 px-3 text-emerald-400 font-semibold">{fm.maintainabilityIndex}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* QUALITY FINDINGS TAB */}
            {activeTab === 'quality' && (
              <div className="space-y-4">
                {tabLoading ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                ) : qualityFindings.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <span>No quality rule violations detected in this analysis run.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Severity</th>
                          <th className="py-2.5 px-3">Rule ID</th>
                          <th className="py-2.5 px-3">Title</th>
                          <th className="py-2.5 px-3">Location</th>
                          <th className="py-2.5 px-3">Evidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {qualityFindings.map((qf) => (
                          <tr key={qf.id} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                  qf.severity === 'CRITICAL'
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : qf.severity === 'HIGH'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : qf.severity === 'MEDIUM'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}
                              >
                                {qf.severity}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-300">{qf.ruleId}</td>
                            <td className="py-2 px-3 text-slate-200">{qf.title}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">
                              {qf.filePath}:{qf.lineNumber}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-400 truncate max-w-xs">{qf.evidence}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SECRET SCANNER TAB */}
            {activeTab === 'secrets' && (
              <div className="space-y-4">
                {tabLoading ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                ) : secretFindings.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <span>No hardcoded credentials or secret tokens detected.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Severity</th>
                          <th className="py-2.5 px-3">Secret Type</th>
                          <th className="py-2.5 px-3">Location</th>
                          <th className="py-2.5 px-3">Redacted Evidence (Masked)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {secretFindings.map((sf) => (
                          <tr key={sf.id} className="hover:bg-slate-800/40">
                            <td className="py-2 px-3">
                              <span className="rounded bg-rose-500/20 text-rose-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                                {sf.severity}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-200">{sf.ruleId}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">
                              {sf.filePath}:{sf.lineNumber}
                            </td>
                            <td className="py-2 px-3 font-mono text-amber-300/90 truncate max-w-lg">
                              {sf.redactedEvidence}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
