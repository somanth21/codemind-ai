import { apiClient } from './client';
import { AiReasoningResponse, ExplainReusePayload, ExplainEvidencePayload } from '../types/ai';
import { PageResponse } from '../types/api';

export const explainReuse = async (
  repositoryId: string,
  payload: ExplainReusePayload = {}
): Promise<AiReasoningResponse> => {
  return apiClient<AiReasoningResponse>(`/api/v1/repositories/${repositoryId}/ai/explain-reuse`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const explainEvidence = async (
  repositoryId: string,
  payload: ExplainEvidencePayload
): Promise<AiReasoningResponse> => {
  return apiClient<AiReasoningResponse>(`/api/v1/repositories/${repositoryId}/ai/explain-evidence`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const getAiHistory = async (
  repositoryId: string,
  page = 0,
  size = 10
): Promise<PageResponse<AiReasoningResponse>> => {
  return apiClient<PageResponse<AiReasoningResponse>>(
    `/api/v1/repositories/${repositoryId}/ai/history?page=${page}&size=${size}`
  );
};
