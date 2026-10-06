import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReuseAnalysisView } from '../components/reuse/ReuseAnalysisView';
import * as reuseApi from '../api/reuse';
import { ReuseAnalysis } from '../types/reuse';

describe('ReuseAnalysisView Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockAnalysis: ReuseAnalysis = {
    id: 'analysis-123',
    repositoryId: 'repo-1',
    analysisId: 'run-1',
    query: 'calculate greatest common divisor',
    decision: 'REUSE_DIRECTLY',
    overallScore: 0.88,
    confidence: 0.92,
    securityStatus: 'SAFE',
    explanation:
      "Found existing component 'calculateGreatestCommonDivisor' in src/MathUtils.java with 100% functional relevance and clean security profile.",
    configVersion: 'v1.0',
    createdAt: new Date().toISOString(),
    candidates: [
      {
        id: 'cand-1',
        symbolId: 'sym-1',
        filePath: 'src/MathUtils.java',
        symbolName: 'calculateGreatestCommonDivisor',
        symbolKind: 'METHOD',
        signature: 'int calculateGreatestCommonDivisor(int a, int b)',
        startLine: 4,
        endLine: 12,
        candidateType: 'DIRECT_REUSE',
        overallScore: 0.88,
        functionalRelevance: 1.0,
        structuralSimilarity: 0.85,
        maintainabilityScore: 0.9,
        complexityPenalty: 0.08,
        securityScore: 1.0,
        modificationEffort: 0.1,
        dependencyImpact: 0.0,
        duplicationRisk: 1.0,
        securityGate: 'SAFE',
        explanation: "Recommend DIRECT REUSE of 'calculateGreatestCommonDivisor'.",
        positiveSignals: [
          'High functional relevance (100%) matching query intent',
          'Clean security audit: 0 secrets or static quality warnings',
        ],
        negativeSignals: [],
        evidence: [
          {
            id: 'ev-1',
            candidateId: 'cand-1',
            evidenceType: 'SYMBOL_DECLARATION',
            description: "Symbol 'calculateGreatestCommonDivisor' located at src/MathUtils.java:4-12",
            sourceFile: 'src/MathUtils.java',
            startLine: 4,
            endLine: 12,
            metricValue: 1.0,
          },
        ],
      },
    ],
  };

  it('renders reuse analysis view and executes search successfully', async () => {
    vi.spyOn(reuseApi, 'getReuseAnalyses').mockResolvedValue({
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

    vi.spyOn(reuseApi, 'analyzeReuse').mockResolvedValue(mockAnalysis);

    render(<ReuseAnalysisView repositoryId="repo-1" />);

    expect(screen.getByText(/Deterministic Reuse-First Engine/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter intended functionality/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Enter intended functionality/i);
    fireEvent.change(input, { target: { value: 'calculate greatest common divisor' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('REUSE DIRECTLY')).toBeInTheDocument();
      expect(screen.getAllByText('GATE: SAFE').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('88.0%').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/calculateGreatestCommonDivisor/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/src\/MathUtils\.java:4-12/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/High functional relevance \(100%\)/i)).toBeInTheDocument();
      expect(screen.getByText(/\[SYMBOL_DECLARATION\]/i)).toBeInTheDocument();
    });
  });
});
