import { apiClient } from './client';
import {
  AnalysisRun,
  SymbolItem,
  RelationshipItem,
  FileMetricsItem,
  QualityFindingItem,
  SecretFindingItem,
  SymbolKind,
  RelationshipType,
  Severity,
} from '../types/analysis';
import { PageResponse } from '../types/api';

export const triggerAnalysis = async (repositoryId: string): Promise<AnalysisRun> => {
  return apiClient<AnalysisRun>(`/api/v1/repositories/${repositoryId}/analyze`, {
    method: 'POST',
  });
};

export const getAnalysisRuns = async (
  repositoryId: string,
  page = 0,
  size = 20
): Promise<PageResponse<AnalysisRun>> => {
  return apiClient<PageResponse<AnalysisRun>>(
    `/api/v1/repositories/${repositoryId}/analyses?page=${page}&size=${size}`
  );
};

export const getAnalysisRun = async (
  repositoryId: string,
  analysisId: string
): Promise<AnalysisRun> => {
  return apiClient<AnalysisRun>(`/api/v1/repositories/${repositoryId}/analyses/${analysisId}`);
};

export const getSymbols = async (
  repositoryId: string,
  analysisId: string,
  page = 0,
  size = 50,
  kind?: SymbolKind
): Promise<PageResponse<SymbolItem>> => {
  const kindParam = kind ? `&kind=${encodeURIComponent(kind)}` : '';
  return apiClient<PageResponse<SymbolItem>>(
    `/api/v1/repositories/${repositoryId}/analyses/${analysisId}/symbols?page=${page}&size=${size}${kindParam}`
  );
};

export const getRelationships = async (
  repositoryId: string,
  analysisId: string,
  page = 0,
  size = 50,
  type?: RelationshipType
): Promise<PageResponse<RelationshipItem>> => {
  const typeParam = type ? `&type=${encodeURIComponent(type)}` : '';
  return apiClient<PageResponse<RelationshipItem>>(
    `/api/v1/repositories/${repositoryId}/analyses/${analysisId}/relationships?page=${page}&size=${size}${typeParam}`
  );
};

export const getFileMetrics = async (
  repositoryId: string,
  analysisId: string,
  page = 0,
  size = 50
): Promise<PageResponse<FileMetricsItem>> => {
  return apiClient<PageResponse<FileMetricsItem>>(
    `/api/v1/repositories/${repositoryId}/analyses/${analysisId}/metrics?page=${page}&size=${size}`
  );
};

export const getQualityFindings = async (
  repositoryId: string,
  analysisId: string,
  page = 0,
  size = 50,
  severity?: Severity,
  ruleId?: string
): Promise<PageResponse<QualityFindingItem>> => {
  let query = `?page=${page}&size=${size}`;
  if (severity) query += `&severity=${encodeURIComponent(severity)}`;
  if (ruleId) query += `&ruleId=${encodeURIComponent(ruleId)}`;
  return apiClient<PageResponse<QualityFindingItem>>(
    `/api/v1/repositories/${repositoryId}/analyses/${analysisId}/findings${query}`
  );
};

export const getSecretFindings = async (
  repositoryId: string,
  analysisId: string,
  page = 0,
  size = 50
): Promise<PageResponse<SecretFindingItem>> => {
  return apiClient<PageResponse<SecretFindingItem>>(
    `/api/v1/repositories/${repositoryId}/analyses/${analysisId}/secrets?page=${page}&size=${size}`
  );
};
