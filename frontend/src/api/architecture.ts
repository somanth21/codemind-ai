import { apiClient, getStoredToken } from './client';
import { ArchitectureAnalysis, ArchitectureGraph, ArchitectureAnalysisRequest } from '../types/architecture';
import { PageResponse } from '../types/api';

export const analyzeArchitecture = async (
  repositoryId: string,
  request?: ArchitectureAnalysisRequest
): Promise<ArchitectureAnalysis> => {
  return apiClient<ArchitectureAnalysis>(`/api/v1/repositories/${repositoryId}/architecture/analyze`, {
    method: 'POST',
    body: request ? JSON.stringify(request) : undefined,
  });
};

export const getArchitectureAnalyses = async (
  repositoryId: string,
  page = 0,
  size = 20
): Promise<PageResponse<ArchitectureAnalysis>> => {
  return apiClient<PageResponse<ArchitectureAnalysis>>(
    `/api/v1/repositories/${repositoryId}/architecture?page=${page}&size=${size}`
  );
};

export const getArchitectureAnalysis = async (
  repositoryId: string,
  analysisId: string
): Promise<ArchitectureAnalysis> => {
  return apiClient<ArchitectureAnalysis>(
    `/api/v1/repositories/${repositoryId}/architecture/${analysisId}`
  );
};

export const getArchitectureGraph = async (
  repositoryId: string,
  analysisId: string
): Promise<ArchitectureGraph> => {
  return apiClient<ArchitectureGraph>(
    `/api/v1/repositories/${repositoryId}/architecture/${analysisId}/graph`
  );
};

export const downloadArchitectureReportPdf = async (
  repositoryId: string,
  analysisId: string
): Promise<Blob> => {
  const token = getStoredToken();
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`/api/v1/repositories/${repositoryId}/architecture/${analysisId}/report/pdf`, {
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to generate architecture report PDF');
  }
  return response.blob();
};
