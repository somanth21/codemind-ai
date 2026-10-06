import { apiClient } from './client';
import { RepositoryDetail, RepositorySummary, RepositoryTreeNode, FileContentResponse } from '../types/repository';

export const repositoryApi = {
  upload: async (file: File, name?: string): Promise<RepositoryDetail> => {
    const formData = new FormData();
    formData.append('file', file);
    if (name && name.trim()) {
      formData.append('name', name.trim());
    }

    return apiClient<RepositoryDetail>('/api/v1/repositories', {
      method: 'POST',
      body: formData,
    });
  },

  connectGitHub: async (url: string, branch?: string): Promise<RepositoryDetail> => {
    return apiClient<RepositoryDetail>('/api/v1/repositories/github', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url.trim(), branch: branch?.trim() || undefined }),
    });
  },

  list: async (): Promise<RepositorySummary[]> => {
    return apiClient<RepositorySummary[]>('/api/v1/repositories');
  },

  get: async (id: string): Promise<RepositoryDetail> => {
    return apiClient<RepositoryDetail>(`/api/v1/repositories/${id}`);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient<void>(`/api/v1/repositories/${id}`, {
      method: 'DELETE',
    });
  },

  getTree: async (id: string): Promise<RepositoryTreeNode> => {
    return apiClient<RepositoryTreeNode>(`/api/v1/repositories/${id}/tree`);
  },

  getFileContent: async (id: string, path: string): Promise<FileContentResponse> => {
    const encodedPath = encodeURIComponent(path);
    return apiClient<FileContentResponse>(`/api/v1/repositories/${id}/files/content?path=${encodedPath}`);
  },
};
