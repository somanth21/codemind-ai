import { apiClient } from './client';
import { HealthStatus } from '../types/api';

export const healthApi = {
  check: async (): Promise<HealthStatus> => {
    return apiClient<HealthStatus>('/api/v1/health');
  },
};
