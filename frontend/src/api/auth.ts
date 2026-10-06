import { apiClient, setStoredToken, clearStoredToken } from './client';
import {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  ChangePasswordRequest,
  User,
  AdminOverview,
  UserAdmin,
  RepositoryAdmin,
  SecurityAdminOverview,
  AuditAdminItem,
  AiTelemetry,
  SystemHealth,
  Role,
} from '../types/auth';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const data = await apiClient<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setStoredToken(data.accessToken);
    return data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const data = await apiClient<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setStoredToken(data.accessToken);
    return data;
  },

  changePassword: async (request: ChangePasswordRequest): Promise<{ message: string }> => {
    return apiClient<{ message: string }>('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  getCurrentUser: async (): Promise<User> => {
    return apiClient<User>('/api/v1/auth/me');
  },

  logout: (): void => {
    clearStoredToken();
  },
};

export const adminApi = {
  getOverview: async (): Promise<AdminOverview> => {
    return apiClient<AdminOverview>('/api/v1/admin/overview');
  },

  getUsers: async (page = 0, size = 50, search?: string): Promise<{ content: UserAdmin[]; totalElements: number }> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (search) params.append('search', search);
    return apiClient<{ content: UserAdmin[]; totalElements: number }>(`/api/v1/admin/users?${params.toString()}`);
  },

  updateUserRole: async (userId: string, role: Role): Promise<UserAdmin> => {
    return apiClient<UserAdmin>(`/api/v1/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  updateUserStatus: async (userId: string, active: boolean): Promise<UserAdmin> => {
    return apiClient<UserAdmin>(`/api/v1/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  },

  getRepositories: async (page = 0, size = 50): Promise<{ content: RepositoryAdmin[]; totalElements: number }> => {
    return apiClient<{ content: RepositoryAdmin[]; totalElements: number }>(`/api/v1/admin/repositories?page=${page}&size=${size}`);
  },

  getSecurityOverview: async (): Promise<SecurityAdminOverview> => {
    return apiClient<SecurityAdminOverview>('/api/v1/admin/security');
  },

  getAuditLogs: async (page = 0, size = 50, eventType?: string, principal?: string): Promise<{ content: AuditAdminItem[]; totalElements: number }> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (eventType) params.append('eventType', eventType);
    if (principal) params.append('principal', principal);
    return apiClient<{ content: AuditAdminItem[]; totalElements: number }>(`/api/v1/admin/audit?${params.toString()}`);
  },

  getAiTelemetry: async (): Promise<AiTelemetry> => {
    return apiClient<AiTelemetry>('/api/v1/admin/ai');
  },

  getSystemHealth: async (): Promise<SystemHealth> => {
    return apiClient<SystemHealth>('/api/v1/admin/health');
  },
};