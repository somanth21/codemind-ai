import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const renderLoginPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders login form with email and password inputs', () => {
    renderLoginPage();

    expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('allows user input for email and password', () => {
    renderLoginPage();

    const emailInput = screen.getByLabelText(/^Email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'developer@codemind.ai' } });
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });

    expect(emailInput.value).toBe('developer@codemind.ai');
    expect(passwordInput.value).toBe('Secret123!');
  });

  it('displays RFC 7807 error message on failed login attempt', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValueOnce(
      new ApiError({
        type: 'https://codemind.ai/errors/bad-credentials',
        title: 'Authentication Failed',
        status: 401,
        detail: 'Invalid email or password',
      })
    );

    renderLoginPage();

    const emailInput = screen.getByLabelText(/^Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@codemind.ai' } });
    fireEvent.change(passwordInput, { target: { value: 'badpass' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toBeInTheDocument();
      expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
    });
  });
});
