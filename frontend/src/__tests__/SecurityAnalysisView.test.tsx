import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityAnalysisView } from '../components/security/SecurityAnalysisView';
import * as securityApi from '../api/security';
import { SecurityAnalysis, SecurityFinding } from '../types/security';

function mockPage<T>(items: T[]) {
  return {
    content: items,
    pageable: { pageNumber: 0, pageSize: 10, sort: { empty: true, sorted: false, unsorted: true }, offset: 0, unpaged: false, paged: true },
    totalElements: items.length,
    totalPages: 1,
    last: true,
    size: 10,
    number: 0,
    sort: { empty: true, sorted: false, unsorted: true },
    numberOfElements: items.length,
    first: true,
    empty: items.length === 0,
  };
}

describe('SecurityAnalysisView Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockAnalysis: SecurityAnalysis = {
    id: 'sec-analysis-1',
    repositoryId: 'repo-1',
    analysisId: 'run-1',
    totalFindings: 3,
    criticalCount: 1,
    highCount: 1,
    mediumCount: 1,
    lowCount: 0,
    infoCount: 0,
    riskScore: 65,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  };

  const mockFindings: SecurityFinding[] = [
    {
      id: 'finding-1',
      repositoryId: 'repo-1',
      analysisId: 'run-1',
      ruleId: 'SEC-SQL-001',
      ruleName: 'Potential SQL Injection',
      severity: 'CRITICAL',
      category: 'INJECTION',
      message: 'Potential SQL Injection via Raw Statement Concatenation',
      remediation: 'Use parameterized queries with PreparedStatement or JPA named parameters.',
      filePath: 'src/main/java/com/example/UserDao.java',
      lineNumber: 42,
      endLineNumber: 45,
      evidenceSnippet: 'String query = "SELECT * FROM users WHERE id = " + userId;',
      confidence: 'HIGH',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'finding-2',
      repositoryId: 'repo-1',
      analysisId: 'run-1',
      ruleId: 'SEC-CMD-001',
      ruleName: 'Command Execution',
      severity: 'HIGH',
      category: 'INJECTION',
      message: 'Command Execution via ProcessBuilder or Runtime.exec',
      remediation: 'Avoid invoking OS-level shells; validate input against strict allowlists.',
      filePath: 'src/main/java/com/example/SystemRunner.java',
      lineNumber: 25,
      endLineNumber: 26,
      evidenceSnippet: 'Runtime.getRuntime().exec("ping " + host);',
      confidence: 'HIGH',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'finding-3',
      repositoryId: 'repo-1',
      analysisId: 'run-1',
      ruleId: 'SEC-CRYPTO-001',
      ruleName: 'Broken Crypto',
      severity: 'MEDIUM',
      category: 'CRYPTOGRAPHY',
      message: 'Use of Broken Cryptographic Algorithm',
      remediation: 'Upgrade cryptographic algorithms to SHA-256, SHA-3, or Argon2.',
      filePath: 'src/main/java/com/example/CryptoUtils.java',
      lineNumber: 12,
      endLineNumber: 12,
      evidenceSnippet: 'MessageDigest.getInstance("MD5");',
      confidence: 'HIGH',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    },
  ];

  it('renders security overview KPI cards and finding items', async () => {
    vi.spyOn(securityApi, 'getSecurityAnalyses').mockResolvedValue(mockPage([mockAnalysis]));
    vi.spyOn(securityApi, 'getSecurityFindings').mockResolvedValue(mockPage(mockFindings));

    render(<SecurityAnalysisView repositoryId="repo-1" />);

    expect(screen.getByText(/Deterministic Repository Security Analysis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run Security Scan/i })).toBeInTheDocument();

    await waitFor(() => {
      // Check KPI counters
      expect(screen.getAllByText('Critical').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Total Findings')).toBeInTheDocument();
      expect(screen.getByText('Risk Score')).toBeInTheDocument();

      // Check findings rendered
      expect(screen.getByText('Potential SQL Injection via Raw Statement Concatenation')).toBeInTheDocument();
      expect(screen.getByText('Command Execution via ProcessBuilder or Runtime.exec')).toBeInTheDocument();
      expect(screen.getByText('Use of Broken Cryptographic Algorithm')).toBeInTheDocument();

      // Check rule IDs
      expect(screen.getByText('SEC-SQL-001')).toBeInTheDocument();
      expect(screen.getByText('SEC-CMD-001')).toBeInTheDocument();
      expect(screen.getByText('SEC-CRYPTO-001')).toBeInTheDocument();
    });
  });

  it('filters findings by severity', async () => {
    vi.spyOn(securityApi, 'getSecurityAnalyses').mockResolvedValue(mockPage([mockAnalysis]));
    const findingsSpy = vi.spyOn(securityApi, 'getSecurityFindings');
    findingsSpy.mockResolvedValueOnce(mockPage(mockFindings));
    // Filtered result
    findingsSpy.mockResolvedValueOnce(mockPage([mockFindings[0]]));

    render(<SecurityAnalysisView repositoryId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText('Potential SQL Injection via Raw Statement Concatenation')).toBeInTheDocument();
    });

    const severityFilter = screen.getByDisplayValue('All Severities');
    fireEvent.change(severityFilter, { target: { value: 'CRITICAL' } });

    await waitFor(() => {
      expect(findingsSpy).toHaveBeenCalledWith('repo-1', 'sec-analysis-1', 'CRITICAL', undefined, 0, 100);
      expect(screen.getByText('Potential SQL Injection via Raw Statement Concatenation')).toBeInTheDocument();
      expect(screen.queryByText('Command Execution via ProcessBuilder or Runtime.exec')).not.toBeInTheDocument();
    });
  });

  it('triggers a new security scan successfully', async () => {
    vi.spyOn(securityApi, 'getSecurityAnalyses').mockResolvedValue(mockPage([]));
    const analyzeSpy = vi.spyOn(securityApi, 'analyzeSecurity').mockResolvedValue(mockAnalysis);
    vi.spyOn(securityApi, 'getSecurityFindings').mockResolvedValue(mockPage(mockFindings));

    render(<SecurityAnalysisView repositoryId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Zero Security Vulnerabilities Detected/i)).toBeInTheDocument();
    });

    const scanButton = screen.getByRole('button', { name: /Run Security Scan/i });
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(analyzeSpy).toHaveBeenCalledWith('repo-1');
    });
  });
});
