import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AuthProvider } from '../context/AuthContext';
import * as clientModule from '../api/client';

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('redirects unauthenticated users to /login', async () => {
    vi.spyOn(clientModule, 'getStoredToken').mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page Target</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Secret Vault Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Unauthenticated user should not see secret content, should be redirected to login
    expect(await screen.findByText(/Login Page Target/i)).toBeInTheDocument();
    expect(screen.queryByText(/Secret Vault Content/i)).not.toBeInTheDocument();
  });
});
