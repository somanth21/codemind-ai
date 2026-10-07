import React from 'react';
import { useRepository } from '../context/RepositoryContext';
import { ArchitectureAnalysisView } from '../components/architecture/ArchitectureAnalysisView';
import { NoRepoSelected } from '../components/common/NoRepoSelected';

export const ArchitecturePage: React.FC = () => {
  const { selectedRepo } = useRepository();

  if (!selectedRepo) {
    return (
      <NoRepoSelected
        moduleName="Architecture Intelligence & Coupling"
        description="Select an ingested repository from the header dropdown to analyze package coupling metrics (Afferent/Efferent), detect cyclic dependency chains, and explore interactive component graphs."
      />
    );
  }

  return (
    <div className="feature-view-container space-y-6" data-testid="architecture-page">
      <ArchitectureAnalysisView repositoryId={selectedRepo.id} />
    </div>
  );
};

