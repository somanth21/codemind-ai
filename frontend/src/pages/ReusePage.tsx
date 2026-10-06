import React from 'react';
import { useRepository } from '../context/RepositoryContext';
import { ReuseAnalysisView } from '../components/reuse/ReuseAnalysisView';
import { NoRepoSelected } from '../components/common/NoRepoSelected';
import { GitFork, ShieldCheck } from 'lucide-react';

export const ReusePage: React.FC = () => {
  const { selectedRepo } = useRepository();

  if (!selectedRepo) {
    return (
      <NoRepoSelected
        moduleName="Reuse-First Decision Advisor"
        description="Select an ingested repository from the header dropdown to run multi-criteria component reuse evaluation, calculate maintainability impact, and enforce security blocker gates before writing new code."
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="reuse-page">
      {/* Top Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <GitFork className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">Reuse-First Decision Advisor</h1>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {selectedRepo.name}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                  8-Dimension Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Deterministic candidate ranking based on functional relevance, AST similarity, cyclomatic complexity penalty, and hard security blocker gating.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Zero-Tolerance Security Gate Active</span>
          </div>
        </div>
      </div>

      {/* Main Reuse Analysis View */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
        <ReuseAnalysisView repositoryId={selectedRepo.id} />
      </div>
    </div>
  );
};
