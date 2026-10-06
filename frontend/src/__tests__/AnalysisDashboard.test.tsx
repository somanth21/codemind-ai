import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisDashboard } from '../components/analysis/AnalysisDashboard';
import * as analysisApi from '../api/analysis';
import { AnalysisRun } from '../types/analysis';

describe('AnalysisDashboard Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRun: AnalysisRun = {
    id: 'run-1',
    repositoryId: 'repo-1',
    status: 'COMPLETED',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    filesAnalyzed: 10,
    filesSkipped: 0,
    errorCount: 0,
    warningCount: 2,
    totalLoc: 1540,
    totalClasses: 12,
    totalMethods: 48,
    averageComplexity: 2.35,
    maintainabilityIndex: 82.5,
    createdAt: new Date().toISOString(),
  };

  it('renders analysis dashboard metrics and tabs', async () => {
    vi.spyOn(analysisApi, 'getAnalysisRuns').mockResolvedValue({
      content: [mockRun],
      pageable: { pageNumber: 0, pageSize: 10, sort: { empty: true, sorted: false, unsorted: true }, offset: 0, unpaged: false, paged: true },
      totalElements: 1,
      totalPages: 1,
      last: true,
      size: 10,
      number: 0,
      sort: { empty: true, sorted: false, unsorted: true },
      numberOfElements: 1,
      first: true,
      empty: false,
    });

    render(
      <AnalysisDashboard
        repositoryId="repo-1"
        repositoryName="PetClinic"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/Deterministic Static Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Run Analysis/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Physical Lines of Code/i)).toBeInTheDocument();
      expect(screen.getByText('1,540')).toBeInTheDocument();
      expect(screen.getByText(/2.35/)).toBeInTheDocument();
      expect(screen.getByText(/82.5 \/ 100/)).toBeInTheDocument();
      expect(screen.getByText('Security Analysis')).toBeInTheDocument();
      expect(screen.getByText('Architecture Intelligence')).toBeInTheDocument();
    });
  });
});
