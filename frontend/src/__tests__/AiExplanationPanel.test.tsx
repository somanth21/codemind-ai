import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiExplanationPanel } from '../components/reuse/AiExplanationPanel';
import * as aiApi from '../api/ai';
import { AiReasoningResponse } from '../types/ai';

describe('AiExplanationPanel Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockResponse: AiReasoningResponse = {
    id: 'ai-req-1',
    repositoryId: 'repo-1',
    reuseAnalysisId: 'analysis-123',
    requestType: 'EXPLAIN_REUSE',
    provider: 'GEMINI',
    model: 'gemini-1.5-pro',
    summary: 'Candidate MathUtils::calculateGreatestCommonDivisor provides required Euclidean algorithm.',
    recommendation: 'Direct reuse is feasible and safe with zero modification required.',
    reasoning: [
      {
        claim: 'Method implements optimal Euclidean loop adhering to arithmetic bounds.',
        evidenceIds: ['E1'],
      },
      {
        claim: 'Static quality and security gates passed with zero warnings.',
        evidenceIds: ['E2'],
      },
    ],
    limitations: ['Ensure inputs are positive non-zero integers in client caller.'],
    confidence: 0.94,
    evidence: [
      {
        evidenceId: 'E1',
        filePath: 'src/MathUtils.java',
        symbolName: 'calculateGreatestCommonDivisor',
        startLine: 4,
        endLine: 12,
        evidenceType: 'REUSE_CANDIDATE_DIRECT_REUSE',
        sanitizedSnippet: 'public static int calculateGreatestCommonDivisor(int a, int b) { ... }',
      },
      {
        evidenceId: 'E2',
        filePath: 'src/MathUtils.java',
        symbolName: 'calculateGreatestCommonDivisor',
        startLine: 4,
        endLine: 12,
        evidenceType: 'SECURITY_GATE_SAFE',
        sanitizedSnippet: 'No vulnerabilities or hardcoded secrets detected.',
      },
    ],
    contextChars: 1240,
    contextTruncated: false,
    promptTokens: 350,
    completionTokens: 120,
    totalTokens: 470,
    latencyMs: 820,
    citationCoverage: 1.0,
    grounded: true,
    securityGatePreserved: true,
    createdAt: new Date().toISOString(),
  };

  it('renders initial state with button and downstream label', () => {
    render(
      <AiExplanationPanel
        repositoryId="repo-1"
        reuseAnalysisId="analysis-123"
      />
    );

    expect(screen.getByText(/Grounded AI Reasoning Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Downstream Layer/i)).toBeInTheDocument();
    expect(screen.getByTestId('request-ai-explanation-btn')).toBeInTheDocument();
  });

  it('triggers explainReuse on button click and renders grounded explanation with citations', async () => {
    vi.spyOn(aiApi, 'explainReuse').mockResolvedValueOnce(mockResponse);

    render(
      <AiExplanationPanel
        repositoryId="repo-1"
        reuseAnalysisId="analysis-123"
      />
    );

    fireEvent.click(screen.getByTestId('request-ai-explanation-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('ai-explanation-content')).toBeInTheDocument();
    });

    expect(screen.getByText(/Candidate MathUtils::calculateGreatestCommonDivisor/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct reuse is feasible/i)).toBeInTheDocument();
    expect(screen.getByText(/Method implements optimal Euclidean loop/i)).toBeInTheDocument();
    expect(screen.getByTestId('citation-verified-badge')).toBeInTheDocument();

    // Citation badge [E1]
    const e1Badge = screen.getByRole('button', { name: '[E1]' });
    expect(e1Badge).toBeInTheDocument();

    // Click citation badge to open modal
    fireEvent.click(e1Badge);
    expect(screen.getByText(/Evidence \[E1\]/i)).toBeInTheDocument();
    expect(screen.getByText(/src\/MathUtils.java:4-12/i)).toBeInTheDocument();
  });

  it('displays graceful fallback when LLM provider is unconfigured (503)', async () => {
    const error503 = new Error('LLM provider is not configured or unavailable');
    (error503 as any).status = 503;
    vi.spyOn(aiApi, 'explainReuse').mockRejectedValueOnce(error503);

    render(
      <AiExplanationPanel
        repositoryId="repo-1"
        reuseAnalysisId="analysis-123"
      />
    );

    fireEvent.click(screen.getByTestId('request-ai-explanation-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('ai-unavailable-state')).toBeInTheDocument();
    });

    expect(screen.getByText(/LLM Provider Not Configured \(503 Service Unavailable\)/i)).toBeInTheDocument();
    expect(screen.getByText(/CODEMIND_LLM_API_KEY/i)).toBeInTheDocument();
  });
});
