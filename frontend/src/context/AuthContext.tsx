import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, LoginCredentials, RegisterCredentials } from '../types/auth';
import { authApi } from '../api/auth';
import { getStoredToken, clearStoredToken } from '../api/client';

export type AuthStatus = 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'LOADING';

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('LOADING');

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setStatus('UNAUTHENTICATED');
      return;
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      setStatus('AUTHENTICATED');
    } catch {
      // 401 on /me simply means invalid/expired token -> establish unauthenticated state silently
      clearStoredToken();
      setUser(null);
      setStatus('UNAUTHENTICATED');
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        setStatus('UNAUTHENTICATED');
        return;
      }
      await refreshUser();
    };

    initAuth();
  }, [refreshUser]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await authApi.login(credentials);
    setUser(response.user);
    setStatus('AUTHENTICATED');
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const response = await authApi.register(credentials);
    setUser(response.user);
    setStatus('AUTHENTICATED');
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setStatus('UNAUTHENTICATED');
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'AUTHENTICATED' && !!user,
      isLoading: status === 'LOADING',
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, status, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};