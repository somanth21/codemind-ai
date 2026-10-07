import React from 'react';
import { useRepository } from '../context/RepositoryContext';
import { ReuseAnalysisView } from '../components/reuse/ReuseAnalysisView';
import { NoRepoSelected } from '../components/common/NoRepoSelected';

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
    <div className="feature-view-container cm-canvas-grain space-y-6 relative overflow-hidden" data-testid="reuse-page">
      <div className="cm-ambient-glow" style={{ top: -60, left: 100, opacity: 0.6 }} />
      <div className="cm-ambient-glow-teal" style={{ top: 120, right: 60, opacity: 0.4 }} />

      {/* Main Reuse Analysis View */}
      <ReuseAnalysisView repositoryId={selectedRepo.id} />
    </div>
  );
};

