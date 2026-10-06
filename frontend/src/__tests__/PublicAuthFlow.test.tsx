import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';

describe('Public Authentication & Flow Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('1. Landing page loads without authentication and displays core message', async () => {
    window.history.pushState({}, 'Landing Page', '/');
    render(<App />);

    expect(screen.getAllByText(/CodeMind AI/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Understand your codebase/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Sign In/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Get Started/i })).toBeInTheDocument();
  });

  it('2. Login page loads without authentication and has no dev credentials', async () => {
    window.history.pushState({}, 'Login Page', '/login');
    render(<App />);

    expect(screen.getByRole('heading', { name: /Sign In to CodeMind AI/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.queryByText(/developer@codemind.ai/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DevSecure123!/i)).not.toBeInTheDocument();
  });

  it('3. Registration page loads without authentication and displays correct branding', async () => {
    window.history.pushState({}, 'Register Page', '/register');
    render(<App />);

    expect(screen.getByRole('heading', { name: /Create your CodeMind account/i })).toBeInTheDocument();
    expect(screen.getByText(/Understand your codebase before you change it\./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Work Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password \(min 8 chars\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByText(/Developer/i)).toBeInTheDocument();
    expect(screen.getByText(/Standard permissions/i)).toBeInTheDocument();
    expect(screen.getByText(/Back to CodeMind/i)).toBeInTheDocument();
    expect(screen.getByText(/Already have an account/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('4. 401 from auth/me does not create a visible error banner on public registration page', async () => {
    localStorage.setItem('codemind_auth_token', 'expired_token');
    vi.spyOn(authApi, 'getCurrentUser').mockRejectedValueOnce(
      new ApiError({
        type: 'https://codemind.ai/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication is required to access this resource.',
      })
    );

    window.history.pushState({}, 'Register Page', '/register');
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText(/Authentication is required to access this resource/i)).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Create your CodeMind account/i })).toBeInTheDocument();
    });
  });

  it('5. Protected route without authentication redirects to /login', async () => {
    window.history.pushState({}, 'Dashboard Page', '/dashboard');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Sign In to CodeMind AI/i })).toBeInTheDocument();
    });
  });
});