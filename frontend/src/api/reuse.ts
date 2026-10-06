import { apiClient } from './client';
import { ReuseAnalysis, ReuseAnalysisRequest, ReuseCandidate } from '../types/reuse';
import { PageResponse } from '../types/api';

export const analyzeReuse = async (
  repositoryId: string,
  request: ReuseAnalysisRequest
): Promise<ReuseAnalysis> => {
  return apiClient<ReuseAnalysis>(`/api/v1/repositories/${repositoryId}/reuse/analyze`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
};

export const getReuseAnalyses = async (
  repositoryId: string,
  page = 0,
  size = 20
): Promise<PageResponse<ReuseAnalysis>> => {
  return apiClient<PageResponse<ReuseAnalysis>>(
    `/api/v1/repositories/${repositoryId}/reuse?page=${page}&size=${size}`
  );
};

export const getReuseAnalysis = async (
  repositoryId: string,
  analysisId: string
): Promise<ReuseAnalysis> => {
  return apiClient<ReuseAnalysis>(`/api/v1/repositories/${repositoryId}/reuse/${analysisId}`);
};

export const getReuseCandidates = async (
  repositoryId: string,
  analysisId: string
): Promise<ReuseCandidate[]> => {
  return apiClient<ReuseCandidate[]>(
    `/api/v1/repositories/${repositoryId}/reuse/${analysisId}/candidates`
  );
};
