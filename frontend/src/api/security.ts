import { apiClient } from './client';
import { SecurityAnalysis, SecurityFinding, SecurityAnalysisRequest, Severity, SecurityCategory } from '../types/security';
import { PageResponse } from '../types/api';

export const analyzeSecurity = async (
  repositoryId: string,
  request?: SecurityAnalysisRequest
): Promise<SecurityAnalysis> => {
  return apiClient<SecurityAnalysis>(`/api/v1/repositories/${repositoryId}/security/analyze`, {
    method: 'POST',
    body: request ? JSON.stringify(request) : undefined,
  });
};

export const getSecurityAnalyses = async (
  repositoryId: string,
  page = 0,
  size = 20
): Promise<PageResponse<SecurityAnalysis>> => {
  return apiClient<PageResponse<SecurityAnalysis>>(
    `/api/v1/repositories/${repositoryId}/security?page=${page}&size=${size}`
  );
};

export const getLatestSecurityAnalysis = async (
  repositoryId: string
): Promise<SecurityAnalysis | null> => {
  try {
    return await apiClient<SecurityAnalysis>(`/api/v1/repositories/${repositoryId}/security/latest`);
  } catch (error) {
    return null;
  }
};

export const getSecurityFindings = async (
  repositoryId: string,
  analysisId: string,
  severity?: Severity,
  category?: SecurityCategory,
  page = 0,
  size = 50
): Promise<PageResponse<SecurityFinding>> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('size', size.toString());
  if (severity) params.append('severity', severity);
  if (category) params.append('category', category);

  return apiClient<PageResponse<SecurityFinding>>(
    `/api/v1/repositories/${repositoryId}/security/${analysisId}/findings?${params.toString()}`
  );
};
