import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AnalysisPage } from '../pages/AnalysisPage';
import * as repoContext from '../context/RepositoryContext';
import * as analysisApi from '../api/analysis';
import {
  AnalysisRun,
  QualityFindingItem,
  SymbolItem,
  FileMetricsItem,
  RelationshipItem,
} from '../types/analysis';
import { RepositorySummary } from '../types/repository';

describe('AnalysisPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRepo: RepositorySummary = {
    id: 'repo-1',
    name: 'PetClinic',
    sourceType: 'GITHUB',
    status: 'READY',
    fileCount: 42,
    totalSizeBytes: 1048576,
    createdAt: new Date().toISOString(),
  };

  const mockRun: AnalysisRun = {
    id: 'run-1',
    repositoryId: 'repo-1',
    status: 'COMPLETED',
    startedAt: '2026-10-07T10:00:00Z',
    completedAt: '2026-10-07T10:02:00Z',
    filesAnalyzed: 42,
    filesSkipped: 0,
    errorCount: 0,
    warningCount: 2,
    totalLoc: 1540,
    totalClasses: 12,
    totalMethods: 48,
    averageComplexity: 2.35,
    maintainabilityIndex: 82.5,
    createdAt: '2026-10-07T10:00:00Z',
  };

  const mockFindings: QualityFindingItem[] = [
    {
      id: 'qf-1',
      repositoryId: 'repo-1',
      analysisId: 'run-1',
      filePath: 'src/main/java/org/springframework/samples/petclinic/owner/PetService.java',
      ruleId: 'ARCH-CYCLO',
      severity: 'HIGH',
      title: 'High Cyclomatic Complexity',
      description: 'Method exceeds threshold with 14 branching decision paths.',
      lineNumber: 45,
      evidence: 'public Pet processPayment(Payment p) {\n    if (p != null) {\n        return service.pay(p);\n    }\n}',
    },
  ];

  const mockSymbols: SymbolItem[] = [
    {
      id: 'sym-class-1',
      repositoryId: 'repo-1',
      analysisId: 'run-1',
      filePath: 'src/main/java/org/springframework/samples/petclinic/owner/PetService.java',
      name: 'PetService',
      kind: 'CLASS',
      startLine: 12,
      endLine: 120,
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      parameterCount: 0,
    },
    {
      id: 'sym-method-1',
      repositoryId: 'repo-1',
      analysisId: 'run-1',
      filePath: 'src/main/java/org/springframework/samples/petclinic/owner/PetService.java',
      parentSymbolId: 'sym-class-1',
      name: 'processPayment',
      kind: 'METHOD',
      signature: 'public Pet processPayment(Payment p)',
      startLine: 45,
      endLine: 60,
      visibility: 'public',
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      parameterCount: 1,
    },
  ];

  const mockMetrics: FileMetricsItem[] = [
    {
      id: 'fm-1',
      repositoryId: 'repo-1',
      analysisId: 'run-1',
      filePath: 'src/main/java/org/springframework/samples/petclinic/owner/PetService.java',
      loc: 120,
      lloc: 95,
      classCount: 1,
      methodCount: 4,
      halsteadVolume: 420,
      cyclomaticComplexity: 14,
      maintainabilityIndex: 78.5,
    },
  ];

  const mockRelationships: RelationshipItem[] = [
    {
      id: 'rel-1',
      repositoryId: 'repo-1',
      analysisId: 'run-1',
      sourceSymbolId: 'sym-method-1',
      targetSymbolId: 'sym-method-2',
      sourceFqn: 'PetService.processPayment',
      targetFqn: 'PaymentService.charge',
      relationshipType: 'CALLS',
      confidence: 'RESOLVED',
    },
  ];

  const setupDefaultMocks = () => {
    vi.spyOn(repoContext, 'useRepository').mockReturnValue({
      repositories: [mockRepo],
      selectedRepoId: mockRepo.id,
      selectedRepo: mockRepo,
      isLoading: false,
      error: null,
      selectRepo: vi.fn(),
      refreshRepositories: vi.fn().mockResolvedValue(undefined),
    });

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

    vi.spyOn(analysisApi, 'getQualityFindings').mockResolvedValue({
      content: mockFindings,
      pageable: { pageNumber: 0, pageSize: 100, sort: { empty: true, sorted: false, unsorted: true }, offset: 0, unpaged: false, paged: true },
      totalElements: 1,
      totalPages: 1,
      last: true,
      size: 100,
      number: 0,
      sort: { empty: true, sorted: false, unsorted: true },
      numberOfElements: 1,
      first: true,
      empty: false,
    });

    vi.spyOn(analysisApi, 'getSymbols').mockResolvedValue({
      content: mockSymbols,
      pageable: { pageNumber: 0, pageSize: 100, sort: { empty: true, sorted: false, unsorted: true }, offset: 0, unpaged: false, paged: true },
      totalElements: 2,
      totalPages: 1,
      last: true,
      size: 100,
      number: 0,
      sort: { empty: true, sorted: false, unsorted: true },
      numberOfElements: 2,
      first: true,
      empty: false,
    });

    vi.spyOn(analysisApi, 'getFileMetrics').mockResolvedValue({
      content: mockMetrics,
      pageable: { pageNumber: 0, pageSize: 100, sort: { empty: true, sorted: false, unsorted: true }, offset: 0, unpaged: false, paged: true },
      totalElements: 1,
      totalPages: 1,
      last: true,
      size: 100,
      number: 0,
      sort: { empty: true, sorted: false, unsorted: true },
      numberOfElements: 1,
      first: true,
      empty: false,
    });

    vi.spyOn(analysisApi, 'getRelationships').mockResolvedValue({
      content: mockRelationships,
      pageable: { pageNumber: 0, pageSize: 100, sort: { empty: true, sorted: false, unsorted: true }, offset: 0, unpaged: false, paged: true },
      totalElements: 1,
      totalPages: 1,
      last: true,
      size: 100,
      number: 0,
      sort: { empty: true, sorted: false, unsorted: true },
      numberOfElements: 1,
      first: true,
      empty: false,
    });
  };

  it('renders NoRepoSelected when no repository is chosen', () => {
    vi.spyOn(repoContext, 'useRepository').mockReturnValue({
      repositories: [],
      selectedRepoId: null,
      selectedRepo: null,
      isLoading: false,
      error: null,
      selectRepo: vi.fn(),
      refreshRepositories: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <BrowserRouter>
        <AnalysisPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Deterministic Static Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Select an ingested repository/i)).toBeInTheDocument();
  });

  it('renders engineering overview, complexity analytics, maintainability threshold, and findings table', async () => {
    setupDefaultMocks();

    render(
      <BrowserRouter>
        <AnalysisPage />
      </BrowserRouter>
    );

    // 1. Header checks
    expect(screen.getByText('CODE ANALYSIS')).toBeInTheDocument();
    expect(screen.getByText('Understand the health, complexity and structure of your repository.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeInTheDocument();

    // 2. Section A: Engineering Overview strip (scoped via within)
    await waitFor(() => {
      const overviewStrip = screen.getByLabelText('Engineering Overview');
      expect(within(overviewStrip).getByText('Files')).toBeInTheDocument();
      expect(within(overviewStrip).getByText('LOC')).toBeInTheDocument();
      expect(within(overviewStrip).getByText('1,540')).toBeInTheDocument();
      expect(within(overviewStrip).getByText('Average Complexity')).toBeInTheDocument();
      expect(within(overviewStrip).getByText('2.35')).toBeInTheDocument();
      expect(within(overviewStrip).getByText('82.5')).toBeInTheDocument();
    });

    // 3. Section B: Complexity Analytics & Top Complex Units
    await waitFor(() => {
      expect(screen.getByText('Complexity Analytics')).toBeInTheDocument();
      expect(screen.getByText('Complexity Distribution')).toBeInTheDocument();
      expect(screen.getByText('Top Complex Units')).toBeInTheDocument();
    });

    // 4. Section C: Maintainability with reference threshold
    expect(screen.getAllByText(/CodeMind reference threshold: 65.0/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('File Maintainability Distribution')).toBeInTheDocument();

    // 5. Section D: Codebase Scale
    expect(screen.getByText('LOC by Package / Module')).toBeInTheDocument();

    // 6. Section E: Findings Severity & Diagnostic Details
    await waitFor(() => {
      expect(screen.getByText('High Cyclomatic Complexity')).toBeInTheDocument();
      expect(screen.getByText('ARCH-CYCLO')).toBeInTheDocument();
      expect(screen.getAllByText('.../petclinic/owner/PetService.java').length).toBeGreaterThanOrEqual(1);
    });

    // 7. Click finding row to open Inspector
    const findingRow = screen.getByText('High Cyclomatic Complexity');
    fireEvent.click(findingRow);

    await waitFor(() => {
      const inspector = screen.getByRole('dialog', { name: 'Item Details' });
      expect(within(inspector).getByText('FINDING INSPECTOR')).toBeInTheDocument();
      expect(within(inspector).getByText(/Code Evidence/i)).toBeInTheDocument();
      expect(within(inspector).getByText(/public Pet processPayment/i)).toBeInTheDocument();
    });

    // Close Inspector
    const closeBtn = screen.getByRole('button', { name: /close inspector/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('FINDING INSPECTOR')).not.toBeInTheDocument();
    });
  });

  it('renders symbol explorer and opens symbol detail inspector with relationships', async () => {
    setupDefaultMocks();

    render(
      <BrowserRouter>
        <AnalysisPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Symbol Explorer')).toBeInTheDocument();
      expect(screen.getByText('PetService')).toBeInTheDocument();
      expect(screen.getByText('public Pet processPayment(Payment p)')).toBeInTheDocument();
    });

    // Click on a symbol to open inspector
    const symbolRow = screen.getByText('public Pet processPayment(Payment p)');
    fireEvent.click(symbolRow);

    await waitFor(() => {
      expect(screen.getByText('SYMBOL INSPECTOR')).toBeInTheDocument();
      expect(screen.getByText('Relationships (1)')).toBeInTheDocument();
      expect(screen.getByText('CALLS')).toBeInTheDocument();
      expect(screen.getByText(/PaymentService\.charge/)).toBeInTheDocument();
    });
  });
});
