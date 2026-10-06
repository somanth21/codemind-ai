import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { RepositorySearchView } from '../components/search/RepositorySearchView';
import * as analysisApi from '../api/analysis';
import { AnalysisRun, SymbolItem } from '../types/analysis';

function mockPage<T>(items: T[]) {
  return {
    content: items,
    pageable: { pageNumber: 0, pageSize: 50, sort: { empty: true, sorted: false, unsorted: true }, offset: 0, unpaged: false, paged: true },
    totalElements: items.length,
    totalPages: 1,
    last: true,
    size: 50,
    number: 0,
    sort: { empty: true, sorted: false, unsorted: true },
    numberOfElements: items.length,
    first: true,
    empty: items.length === 0,
  };
}

describe('RepositorySearchView Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRun: AnalysisRun = {
    id: 'run-101',
    repositoryId: 'repo-1',
    status: 'COMPLETED',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    filesAnalyzed: 5,
    filesSkipped: 0,
    errorCount: 0,
    warningCount: 0,
    totalLoc: 850,
    totalClasses: 3,
    totalMethods: 12,
    averageComplexity: 1.5,
    maintainabilityIndex: 92.0,
    createdAt: new Date().toISOString(),
  };

  const mockSymbols: SymbolItem[] = [
    {
      id: 'sym-1',
      repositoryId: 'repo-1',
      analysisId: 'run-101',
      name: 'OrderService',
      kind: 'CLASS',
      filePath: 'src/main/java/com/example/OrderService.java',
      startLine: 10,
      endLine: 65,
      signature: 'public class OrderService implements IOrderService',
      docstring: 'Core domain service handling customer order lifecycle.',
      fqn: 'com.example.OrderService',
      visibility: 'PUBLIC',
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      parameterCount: 0,
    },
    {
      id: 'sym-2',
      repositoryId: 'repo-1',
      analysisId: 'run-101',
      name: 'calculateDiscount',
      kind: 'METHOD',
      filePath: 'src/main/java/com/example/OrderService.java',
      startLine: 28,
      endLine: 35,
      signature: 'public BigDecimal calculateDiscount(Order order, CustomerTier tier)',
      docstring: 'Calculates tiered percentage discount for order items.',
      fqn: 'com.example.OrderService.calculateDiscount',
      visibility: 'PUBLIC',
      isStatic: false,
      isFinal: false,
      isAbstract: false,
      parameterCount: 2,
    },
    {
      id: 'sym-3',
      repositoryId: 'repo-1',
      analysisId: 'run-101',
      name: 'IOrderService',
      kind: 'INTERFACE',
      filePath: 'src/main/java/com/example/IOrderService.java',
      startLine: 5,
      endLine: 20,
      signature: 'public interface IOrderService',
      fqn: 'com.example.IOrderService',
      visibility: 'PUBLIC',
      isStatic: false,
      isFinal: false,
      isAbstract: true,
      parameterCount: 0,
    },
  ];

  it('renders search view and lists initial symbol evidence', async () => {
    vi.spyOn(analysisApi, 'getAnalysisRuns').mockResolvedValue(mockPage([mockRun]));
    vi.spyOn(analysisApi, 'getSymbols').mockResolvedValue(mockPage(mockSymbols));

    render(
      <BrowserRouter>
        <RepositorySearchView repositoryId="repo-1" repositoryName="TestRepo" />
      </BrowserRouter>
    );

    expect(screen.getByText(/Hybrid Repository Search/i)).toBeInTheDocument();
    expect(screen.getByText('TestRepo')).toBeInTheDocument();
    expect(screen.getByText(/Deterministic Index/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('OrderService')).toBeInTheDocument();
      expect(screen.getByText('calculateDiscount')).toBeInTheDocument();
      expect(screen.getByText('IOrderService')).toBeInTheDocument();
      expect(screen.getAllByText(/CLASS/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/METHOD/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/INTERFACE/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('performs query search and filters results with RRF scores', async () => {
    vi.spyOn(analysisApi, 'getAnalysisRuns').mockResolvedValue(mockPage([mockRun]));
    vi.spyOn(analysisApi, 'getSymbols').mockResolvedValue(mockPage(mockSymbols));

    render(
      <BrowserRouter>
        <RepositorySearchView repositoryId="repo-1" repositoryName="TestRepo" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('OrderService')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'discount' } });

    await waitFor(() => {
      expect(screen.getByText('calculateDiscount')).toBeInTheDocument();
      expect(screen.queryByText('IOrderService')).not.toBeInTheDocument();
      expect(screen.getByText(/RRF:/i)).toBeInTheDocument();
    });
  });

  it('switches between search modes: Hybrid, Lexical, Semantic', async () => {
    vi.spyOn(analysisApi, 'getAnalysisRuns').mockResolvedValue(mockPage([mockRun]));
    vi.spyOn(analysisApi, 'getSymbols').mockResolvedValue(mockPage(mockSymbols));

    render(
      <BrowserRouter>
        <RepositorySearchView repositoryId="repo-1" repositoryName="TestRepo" />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('OrderService')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'order' } });

    // Switch to Lexical
    const lexicalBtn = screen.getByRole('button', { name: 'Lexical' });
    fireEvent.click(lexicalBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Lexical: Score/i).length).toBeGreaterThanOrEqual(1);
    });

    // Switch to Semantic
    const semanticBtn = screen.getByRole('button', { name: 'Semantic' });
    fireEvent.click(semanticBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Semantic: Score/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
