import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { repositoryApi } from '../api/repositories';
import { RepositorySummary } from '../types/repository';

interface RepositoryContextType {
  repositories: RepositorySummary[];
  selectedRepoId: string | null;
  selectedRepo: RepositorySummary | null;
  isLoading: boolean;
  error: string | null;
  selectRepo: (id: string | null) => void;
  refreshRepositories: () => Promise<void>;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

const STORAGE_KEY = 'codemind_active_repo_id';

export const RepositoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [repositories, setRepositories] = useState<RepositorySummary[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY) || null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRepositories = useCallback(async () => {
    // Never probe repositories if unauthenticated
    if (!isAuthenticated) {
      setRepositories([]);
      setSelectedRepoId(null);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const list = await repositoryApi.list();
      setRepositories(list);

      // Verify or update active selection
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (list.length > 0) {
        const found = list.find((r) => r.id === savedId);
        if (found) {
          setSelectedRepoId(found.id);
        } else {
          // Default to first READY repository or first repository
          const readyRepo = list.find((r) => r.status === 'READY') || list[0];
          setSelectedRepoId(readyRepo.id);
          localStorage.setItem(STORAGE_KEY, readyRepo.id);
        }
      } else {
        setSelectedRepoId(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err: any) {
      // Don't show auth errors if unauthenticated
      if (err?.problemDetail?.status === 401) {
        setRepositories([]);
        setSelectedRepoId(null);
      } else {
        setError(err?.message || 'Failed to fetch repositories');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshRepositories();
    } else {
      setRepositories([]);
      setSelectedRepoId(null);
      setError(null);
    }
  }, [isAuthenticated, refreshRepositories]);

  const selectRepo = useCallback((id: string | null) => {
    setSelectedRepoId(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const selectedRepo = useMemo(() => {
    if (!selectedRepoId) return null;
    return repositories.find((r) => r.id === selectedRepoId) || null;
  }, [repositories, selectedRepoId]);

  const value = useMemo(
    () => ({
      repositories,
      selectedRepoId,
      selectedRepo,
      isLoading,
      error,
      selectRepo,
      refreshRepositories,
    }),
    [repositories, selectedRepoId, selectedRepo, isLoading, error, selectRepo, refreshRepositories]
  );

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
};

export const useRepository = (): RepositoryContextType => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
};