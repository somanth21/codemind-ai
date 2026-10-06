import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { Shield, Lock, Mail, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.problemDetail.detail || err.problemDetail.title || 'Invalid email or password');
      } else {
        setErrorMsg('Unable to connect to the backend security gateway.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card cm-card" style={{ maxWidth: '420px', padding: '36px 32px' }}>
        <div className="cm-card-corner-accent" style={{ opacity: 1 }} />
        <div style={{ marginBottom: '20px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
          >
            <ArrowLeft size={14} />
            <span>&larr; Back to CodeMind</span>
          </Link>
        </div>

        <div className="login-header">
          <div className="login-badge-icon" style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent-blue)', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
            <Shield size={30} />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>Sign In to CodeMind AI</h2>
          <p className="login-subtitle">Repository intelligence &amp; developer workspace</p>
        </div>

        {errorMsg && (
          <div className="alert-error" role="alert" data-testid="login-error">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="cm-input-wrapper">
              <Mail size={16} className="cm-input-icon" />
              <input
                id="email"
                type="email"
                required
                className="cm-input-dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="cm-input-wrapper" style={{ position: 'relative' }}>
              <Lock size={16} className="cm-input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="cm-input-dev"
                style={{ paddingRight: '40px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide secret' : 'Show secret'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="cm-btn cm-btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '6px' }}
          >
            {isSubmitting ? (
              <>
                <div className="cm-loader-orbit" style={{ width: '16px', height: '16px' }}>
                  <div className="cm-loader-orbit-ring" />
                  <div className="cm-loader-orbit-ring" />
                </div>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p style={{ color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};