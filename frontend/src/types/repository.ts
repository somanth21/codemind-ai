export type RepositoryStatus = 'REGISTERED' | 'INGESTING' | 'READY' | 'FAILED' | 'DELETED';

export interface RepositorySummary {
  id: string;
  name: string;
  sourceType: string;
  status: RepositoryStatus;
  fileCount: number;
  totalSizeBytes: number;
  createdAt: string;
  ingestionCompletedAt?: string;
}

export interface RepositoryDetail extends RepositorySummary {
  updatedAt: string;
  ingestionStartedAt?: string;
  failureReason?: string;
  ownerId: string;
  ownerEmail: string;
}

export interface RepositoryTreeNode {
  name: string;
  path: string;
  type: 'DIRECTORY' | 'FILE';
  sizeBytes?: number;
  language?: string;
  binary?: boolean;
  children: RepositoryTreeNode[];
}

export interface FileContentResponse {
  relativePath: string;
  content: string;
  sizeBytes: number;
}
