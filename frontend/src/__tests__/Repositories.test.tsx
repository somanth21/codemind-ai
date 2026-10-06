import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { RepositoriesPage } from '../pages/RepositoriesPage';
import { repositoryApi } from '../api/repositories';
import { RepositorySummary } from '../types/repository';

describe('RepositoriesPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRepos: RepositorySummary[] = [
    {
      id: 'repo-1',
      name: 'Spring PetClinic',
      sourceType: 'LOCAL_ZIP',
      status: 'READY',
      fileCount: 42,
      totalSizeBytes: 204800,
      createdAt: new Date().toISOString(),
      ingestionCompletedAt: new Date().toISOString(),
    },
    {
      id: 'repo-2',
      name: 'Hostile Project',
      sourceType: 'LOCAL_ZIP',
      status: 'FAILED',
      fileCount: 0,
      totalSizeBytes: 0,
      createdAt: new Date().toISOString(),
    },
  ];

  it('renders repository upload form and listed repositories', async () => {
    vi.spyOn(repositoryApi, 'list').mockResolvedValue(mockRepos);

    render(
      <BrowserRouter>
        <RepositoriesPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Repository Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Select ZIP Archive/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Spring PetClinic')).toBeInTheDocument();
      expect(screen.getByText('Hostile Project')).toBeInTheDocument();
      expect(screen.getByText('READY')).toBeInTheDocument();
      expect(screen.getByText('FAILED')).toBeInTheDocument();
      expect(screen.getByText('Analysis')).toBeInTheDocument();
    });
  });
});
