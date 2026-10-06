export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  timestamp?: string;
  correlationId?: string;
  errors?: Record<string, string>;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  pageable?: any;
  totalElements: number;
  totalPages: number;
  last: boolean;
  size: number;
  number: number;
  sort?: any;
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}
