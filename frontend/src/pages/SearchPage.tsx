import React from 'react';
import { useRepository } from '../context/RepositoryContext';
import { RepositorySearchView } from '../components/search/RepositorySearchView';
import { NoRepoSelected } from '../components/common/NoRepoSelected';

export const SearchPage: React.FC = () => {
  const { selectedRepo } = useRepository();

  if (!selectedRepo) {
    return (
      <NoRepoSelected
        moduleName="Hybrid Repository Search"
        description="Select an ingested repository from the header dropdown to perform Reciprocal Rank Fusion (RRF) search across lexical tokens and AST symbol evidence with source-line provenance."
      />
    );
  }

  return (
    <div className="search-page relative" data-testid="search-page">
      <div className="cm-ambient-glow" style={{ top: -60, left: 80, opacity: 0.6 }} />
      <RepositorySearchView
        repositoryId={selectedRepo.id}
        repositoryName={selectedRepo.name}
      />
    </div>
  );
};
