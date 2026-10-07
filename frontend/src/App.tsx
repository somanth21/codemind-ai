import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RepositoryProvider } from './context/RepositoryContext';
import { SidebarProvider } from './context/SidebarContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { DashboardPage } from './pages/DashboardPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { SearchPage } from './pages/SearchPage';
import { ReusePage } from './pages/ReusePage';
import { SecurityPage } from './pages/SecurityPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { AiInsightsPage } from './pages/AiInsightsPage';
import { PonytailPage } from './pages/PonytailPage';
import { NotFoundPage } from './pages/NotFoundPage';

const AuthLoadingFallback: React.FC = () => (
  <div style={{ minHeight: '100vh', backgroundColor: '#070A12', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.85rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e85a2b' }} />
      <span>Loading CodeMind AI...</span>
    </div>
  </div>
);

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AuthLoadingFallback />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AuthLoadingFallback />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <RepositoryProvider>
          <SidebarProvider>
            <Routes>
              {/* Public Routes - No JWT required */}
              <Route path="/" element={<RootRedirect />} />
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicOnlyRoute>
                    <RegisterPage />
                  </PublicOnlyRoute>
                }
              />

              {/* Protected Routes - JWT required */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <ProfilePage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <AdminPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <DashboardPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/repositories"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <RepositoriesPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analysis"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <AnalysisPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <SearchPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reuse"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <ReusePage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/security"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <SecurityPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/architecture"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <ArchitecturePage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ai"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <AiInsightsPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ponytail"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <PonytailPage />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </SidebarProvider>
        </RepositoryProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;