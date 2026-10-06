import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import * as healthApi from '../api/health';
import * as analysisApi from '../api/analysis';
import * as securityApi from '../api/security';
import * as reuseApi from '../api/reuse';
import { AuthContext } from '../context/AuthContext';
import { RepositoryProvider } from '../context/RepositoryContext';
import * as repoApi from '../api/repositories';

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

describe('DashboardPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockUser = {
    id: 'user-1',
    email: 'dev@codemind.ai',
    role: 'ROLE_DEVELOPER' as const,
    active: true,
  };

  const mockRepo = {
    id: 'repo-1',
    name: 'spring-petclinic',
    sourceType: 'ZIP',
    status: 'READY' as const,
    fileCount: 42,
    totalSizeBytes: 2048576,
    createdAt: new Date().toISOString(),
  };

  const mockAnalysis = {
    id: 'run-1',
    repositoryId: 'repo-1',
    status: 'COMPLETED' as const,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    filesAnalyzed: 42,
    filesSkipped: 0,
    errorCount: 0,
    warningCount: 0,
    totalLoc: 3840,
    totalClasses: 28,
    totalMethods: 112,
    averageComplexity: 1.85,
    maintainabilityIndex: 88.4,
    createdAt: new Date().toISOString(),
  };

  const mockSecurity = {
    id: 'sec-1',
    repositoryId: 'repo-1',
    analysisId: 'run-1',
    totalFindings: 2,
    criticalCount: 0,
    highCount: 1,
    mediumCount: 1,
    lowCount: 0,
    infoCount: 0,
    riskScore: 25.0,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  };

  it('renders engineering overview with active repository and deterministic metrics', async () => {
    vi.spyOn(healthApi.healthApi, 'check').mockResolvedValue({
      status: 'UP',
      service: 'codemind-backend',
      version: '0.9.0',
      timestamp: new Date().toISOString(),
    });
    vi.spyOn(repoApi.repositoryApi, 'list').mockResolvedValue([mockRepo]);
    vi.spyOn(analysisApi, 'getAnalysisRuns').mockResolvedValue(mockPage([mockAnalysis]));
    vi.spyOn(securityApi, 'getSecurityAnalyses').mockResolvedValue(mockPage([mockSecurity]));
    vi.spyOn(reuseApi, 'getReuseAnalyses').mockResolvedValue(mockPage([]));

    render(
      <BrowserRouter>
        <AuthContext.Provider
          value={{
            user: mockUser,
            status: 'AUTHENTICATED',
            isLoading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            refreshUser: vi.fn(),
            isAuthenticated: true,
          }}
        >
          <RepositoryProvider>
            <DashboardPage />
          </RepositoryProvider>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    // Initial greeting
    expect(screen.getByText(/Engineering Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Core Research Invariant/i)).toBeInTheDocument();
    expect(screen.getByText(/DETERMINISTIC FIRST/i)).toBeInTheDocument();

    await waitFor(() => {
      // Repository name & status
      expect(screen.getByText('spring-petclinic')).toBeInTheDocument();

      // LOC and Classes
      expect(screen.getByText('3,840')).toBeInTheDocument();
      expect(screen.getByText('28C / 112M')).toBeInTheDocument();

      // Maintainability Index
      expect(screen.getByText('88.4 / 100')).toBeInTheDocument();

      // Security findings count
      expect(screen.getByText('2 findings')).toBeInTheDocument();

      // Pipeline stepper steps
      expect(screen.getByText(/01\. INGESTION/i)).toBeInTheDocument();
      expect(screen.getByText(/02\. STATIC ANALYSIS/i)).toBeInTheDocument();
      expect(screen.getByText(/03\. RETRIEVAL/i)).toBeInTheDocument();
      expect(screen.getByText(/04\. REUSE ADVISOR/i)).toBeInTheDocument();
      expect(screen.getByText(/05\. SECURITY AUDIT/i)).toBeInTheDocument();
      expect(screen.getByText(/06\. ARCHITECTURE/i)).toBeInTheDocument();
      expect(screen.getByText(/07\. GROUNDED AI/i)).toBeInTheDocument();
    });
  });

  it('renders clean empty state when no repositories exist', async () => {
    vi.spyOn(healthApi.healthApi, 'check').mockResolvedValue({
      status: 'UP',
      service: 'codemind-backend',
      version: '0.9.0',
      timestamp: new Date().toISOString(),
    });
    vi.spyOn(repoApi.repositoryApi, 'list').mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AuthContext.Provider
          value={{
            user: mockUser,
            status: 'AUTHENTICATED',
            isLoading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            refreshUser: vi.fn(),
            isAuthenticated: true,
          }}
        >
          <RepositoryProvider>
            <DashboardPage />
          </RepositoryProvider>
        </AuthContext.Provider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No Active Repository Selected/i)).toBeInTheDocument();
      expect(screen.getByText(/Upload Repository Archive/i)).toBeInTheDocument();
    });
  });
});
