export type Role = 'ROLE_ADMIN' | 'ROLE_DEVELOPER' | 'ROLE_AUDITOR';

export interface User {
  id: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInMs: number;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  totalRepositories: number;
  totalAnalyses: number;
  totalSecurityFindings: number;
  totalAuditEvents: number;
}

export interface UserAdmin {
  id: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  repositoryCount: number;
}

export interface RepositoryAdmin {
  id: string;
  name: string;
  sourceType: string;
  status: string;
  ownerId: string | null;
  ownerEmail: string;
  fileCount: number;
  totalSizeBytes: number;
  createdAt: string;
  lastAnalyzedAt: string | null;
}

export interface SecurityAdminOverview {
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  categoryCounts: Record<string, number>;
}

export interface AuditAdminItem {
  id: string;
  principal: string;
  eventType: string;
  outcome: string;
  ipAddress: string;
  correlationId: string;
  details: string;
  timestamp: string;
}

export interface AiTelemetry {
  totalRequests: number;
  groundedRequests: number;
  failedRequests: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  queryTypeCounts: Record<string, number>;
}

export interface SystemHealth {
  status: string;
  databaseStatus: string;
  databaseLatencyMs: number;
  uptimeSeconds: number;
  totalMemoryBytes: number;
  freeMemoryBytes: number;
  activeCores: number;
  timestamp: string;
}