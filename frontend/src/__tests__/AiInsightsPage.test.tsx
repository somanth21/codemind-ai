import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AiInsightsPage } from '../pages/AiInsightsPage';
import * as repoContext from '../context/RepositoryContext';
import * as aiApi from '../api/ai';
import { AiReasoningResponse } from '../types/ai';
import { RepositorySummary } from '../types/repository';

describe('AiInsightsPage Component', () => {
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

  const mockAnswer: AiReasoningResponse = {
    id: 'ai-resp-1',
    repositoryId: 'repo-1',
    reuseAnalysisId: 'analysis-1',
    requestType: 'EXPLAIN_REUSE',
    provider: 'GEMINI',
    model: 'gemini-1.5-flash',
    summary: 'Authentication and authorization are managed via Spring Security filter chains.',
    recommendation: 'Extend existing SecurityConfig rather than creating custom auth interceptors.',
    reasoning: [
      {
        claim: 'Spring Security WebSecurityConfigurerAdapter defines HTTP role access rules.',
        evidenceIds: ['E1'],
      },
    ],
    limitations: [
      'JWT token expiration requires server-side clock synchronization.',
    ],
    confidence: 0.95,
    evidence: [
      {
        evidenceId: 'E1',
        filePath: 'src/main/java/org/springframework/samples/petclinic/config/SecurityConfig.java',
        symbolName: 'configure',
        startLine: 28,
        endLine: 45,
        evidenceType: 'SECURITY_FILTER_CHAIN',
        sanitizedSnippet: '@Override\nprotected void configure(HttpSecurity http) throws Exception {\n  http.authorizeRequests().anyRequest().authenticated();\n}',
      },
    ],
    contextChars: 1200,
    contextTruncated: false,
    promptTokens: 400,
    completionTokens: 150,
    totalTokens: 550,
    latencyMs: 780,
    citationCoverage: 1.0,
    grounded: true,
    securityGatePreserved: true,
    createdAt: new Date().toISOString(),
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
        <AiInsightsPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Grounded AI Reasoning/i)).toBeInTheDocument();
    expect(screen.getByText(/Select an ingested repository/i)).toBeInTheDocument();
  });

  it('renders grounded header, prompt starters, and populates input when starter clicked', async () => {
    vi.spyOn(repoContext, 'useRepository').mockReturnValue({
      repositories: [mockRepo],
      selectedRepoId: mockRepo.id,
      selectedRepo: mockRepo,
      isLoading: false,
      error: null,
      selectRepo: vi.fn(),
      refreshRepositories: vi.fn().mockResolvedValue(undefined),
    });

    vi.spyOn(aiApi, 'getAiHistory').mockResolvedValue({
      content: [],
      pageable: { pageNumber: 0, pageSize: 10, sort: { empty: true, sorted: false, unsorted: true }, offset: 0, unpaged: false, paged: true },
      totalElements: 0,
      totalPages: 0,
      last: true,
      size: 10,
      number: 0,
      sort: { empty: true, sorted: false, unsorted: true },
      numberOfElements: 0,
      first: true,
      empty: true,
    });

    render(
      <BrowserRouter>
        <AiInsightsPage />
      </BrowserRouter>
    );

    expect(screen.getByText('GROUNDED AI')).toBeInTheDocument();
    expect(screen.getByText(/Ask questions about your repository using verified engineering evidence/i)).toBeInTheDocument();

    // Verify 5 example prompts are visible
    expect(screen.getByText('Where is authentication handled?')).toBeInTheDocument();
    expect(screen.getByText('Which classes are most complex?')).toBeInTheDocument();
    expect(screen.getByText('Can I reuse an existing implementation for payment processing?')).toBeInTheDocument();
    expect(screen.getByText('What are the biggest architecture risks?')).toBeInTheDocument();
    expect(screen.getByText('Which security findings should I investigate first?')).toBeInTheDocument();

    // Click an example prompt button and ensure input is populated
    const exampleBtn = screen.getByText('Where is authentication handled?');
    fireEvent.click(exampleBtn);

    const input = screen.getByPlaceholderText(/Ask about this repository/i) as HTMLInputElement;
    expect(input.value).toBe('Where is authentication handled?');
  });

  it('executes query and displays grounded answer layout with evidence and citations', async () => {
    vi.spyOn(repoContext, 'useRepository').mockReturnValue({
      repositories: [mockRepo],
      selectedRepoId: mockRepo.id,
      selectedRepo: mockRepo,
      isLoading: false,
      error: null,
      selectRepo: vi.fn(),
      refreshRepositories: vi.fn().mockResolvedValue(undefined),
    });

    vi.spyOn(aiApi, 'getAiHistory').mockResolvedValue({
      content: [],
      pageable: { pageNumber: 0, pageSize: 10, sort: { empty: true, sorted: false, unsorted: true }, offset: 0, unpaged: false, paged: true },
      totalElements: 0,
      totalPages: 0,
      last: true,
      size: 10,
      number: 0,
      sort: { empty: true, sorted: false, unsorted: true },
      numberOfElements: 0,
      first: true,
      empty: true,
    });

    const explainSpy = vi.spyOn(aiApi, 'explainEvidence').mockResolvedValue(mockAnswer);

    render(
      <BrowserRouter>
        <AiInsightsPage />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/Ask about this repository/i);
    fireEvent.change(input, { target: { value: 'Where is auth handled?' } });

    const submitBtn = screen.getByRole('button', { name: /Ask CodeMind/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(explainSpy).toHaveBeenCalledWith('repo-1', {
        query: 'Where is auth handled?',
        limit: 8,
      });

      // 1. User Question Card
      expect(screen.getByText(/Where is auth handled\?/)).toBeInTheDocument();

      // 2. AI Interpretation
      expect(screen.getByText(/Authentication and authorization are managed via Spring Security/i)).toBeInTheDocument();

      // 3. Grounding status badge
      expect(screen.getByText('GROUNDED')).toBeInTheDocument();

      // 4. Verified Repository Evidence
      expect(screen.getByText('configure')).toBeInTheDocument();
      expect(screen.getByText(/Lines 28/)).toBeInTheDocument();
      expect(screen.getByText(/SecurityConfig\.java/)).toBeInTheDocument();
      expect(screen.getAllByText('[E1]').length).toBeGreaterThanOrEqual(1);

      // 5. Why this matters recommendation
      expect(screen.getByText(/Extend existing SecurityConfig rather than creating custom auth interceptors/i)).toBeInTheDocument();
    });

    // 6. Click citation badge to open evidence modal
    const citationBtn = screen.getAllByText('[E1]')[0];
    fireEvent.click(citationBtn);

    await waitFor(() => {
      expect(screen.getByText(/Evidence \[E1\]/i)).toBeInTheDocument();
      expect(screen.getByText(/Source Code Evidence/i)).toBeInTheDocument();
      expect(screen.getByText(/http\.authorizeRequests\(\)/i)).toBeInTheDocument();
    });
  });

  it('handles 503 LLM service unavailable with informational fallback notice', async () => {
    vi.spyOn(repoContext, 'useRepository').mockReturnValue({
      repositories: [mockRepo],
      selectedRepoId: mockRepo.id,
      selectedRepo: mockRepo,
      isLoading: false,
      error: null,
      selectRepo: vi.fn(),
      refreshRepositories: vi.fn().mockResolvedValue(undefined),
    });

    vi.spyOn(aiApi, 'getAiHistory').mockResolvedValue({
      content: [],
      pageable: { pageNumber: 0, pageSize: 10, sort: { empty: true, sorted: false, unsorted: true }, offset: 0, unpaged: false, paged: true },
      totalElements: 0,
      totalPages: 0,
      last: true,
      size: 10,
      number: 0,
      sort: { empty: true, sorted: false, unsorted: true },
      numberOfElements: 0,
      first: true,
      empty: true,
    });

    vi.spyOn(aiApi, 'explainEvidence').mockRejectedValue({
      status: 503,
      message: 'LLM service unavailable or not configured',
    });

    render(
      <BrowserRouter>
        <AiInsightsPage />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/Ask about this repository/i);
    fireEvent.change(input, { target: { value: 'Any query' } });

    const submitBtn = screen.getByRole('button', { name: /Ask CodeMind/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/LLM Provider Not Configured \(503 Service Unavailable\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Deterministic static analysis, symbol indexing, and architecture calculations remain 100% operational/i)).toBeInTheDocument();
    });
  });
});
