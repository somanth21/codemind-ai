import { ProblemDetail } from '../types/api';

export class ApiError extends Error {
  public problemDetail: ProblemDetail;

  constructor(problemDetail: ProblemDetail) {
    super(problemDetail.detail || problemDetail.title || 'An API error occurred');
    this.name = 'ApiError';
    this.problemDetail = problemDetail;
  }
}

const TOKEN_KEY = 'codemind_auth_token';

export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage might be blocked or full
  }
};

export const clearStoredToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore error
  }
};

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail: ProblemDetail;
    try {
      errorDetail = await response.json();
    } catch {
      errorDetail = {
        type: 'https://codemind.ai/errors/unknown',
        title: response.statusText || 'Error',
        status: response.status,
        detail: `Request failed with HTTP status ${response.status}`,
      };
    }

    // When an authenticated request fails with 401 Unauthorized,
    // handle token expiration cleanly: clear stale token and notify application.
    if (response.status === 401) {
      const isAuthEndpoint =
        endpoint.includes('/api/v1/auth/login') ||
        endpoint.includes('/api/v1/auth/register');

      if (!isAuthEndpoint) {
        clearStoredToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('codemind:unauthorized', {
              detail: { endpoint, status: 401 },
            })
          );
        }
      }
    }

    throw new ApiError(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

