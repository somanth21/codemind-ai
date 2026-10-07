import React from 'react';
import { useRepository } from '../context/RepositoryContext';
import { SecurityAnalysisView } from '../components/security/SecurityAnalysisView';
import { NoRepoSelected } from '../components/common/NoRepoSelected';

export const SecurityPage: React.FC = () => {
  const { selectedRepo } = useRepository();

  if (!selectedRepo) {
    return (
      <NoRepoSelected
        moduleName="Deterministic Security Analysis"
        description="Select an ingested repository from the header dropdown to run rule-based AST security scanning for hardcoded credentials, command execution, path traversal, injection, and broken cryptography."
      />
    );
  }

  return (
    <div className="feature-view-container relative space-y-6" data-testid="security-page">
      <div className="cm-ambient-glow" style={{ top: -60, left: 100, opacity: 0.6 }} />
      <SecurityAnalysisView repositoryId={selectedRepo.id} />
    </div>
  );
};

