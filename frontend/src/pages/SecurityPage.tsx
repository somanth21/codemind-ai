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
    <div className="security-page space-y-6" data-testid="security-page">
      <SecurityAnalysisView repositoryId={selectedRepo.id} />
    </div>
  );
};
