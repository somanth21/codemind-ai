import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { Shield, Lock, Mail, User, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ name, email, password, confirmPassword });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.problemDetail.detail || err.problemDetail.title || 'Registration failed');
      } else {
        setErrorMsg('Unable to connect to the backend registration gateway.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card cm-card" style={{ maxWidth: '440px', padding: '36px 32px' }}>
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
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>Create your CodeMind account</h2>
          <p className="login-subtitle">Understand your codebase before you change it.</p>
        </div>

        {errorMsg && (
          <div className="alert-error" role="alert" data-testid="register-error">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="cm-input-wrapper">
              <User size={16} className="cm-input-icon" />
              <input
                id="name"
                type="text"
                required
                className="cm-input-dev"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Developer"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Work Email</label>
            <div className="cm-input-wrapper">
              <Mail size={16} className="cm-input-icon" />
              <input
                id="email"
                type="email"
                required
                className="cm-input-dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password (min 8 chars)</label>
            <div className="cm-input-wrapper" style={{ position: 'relative' }}>
              <Lock size={16} className="cm-input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                className="cm-input-dev"
                style={{ paddingRight: '40px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
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

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="cm-input-wrapper">
              <Lock size={16} className="cm-input-icon" />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                className="cm-input-dev"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Role badge (Fixed to Developer per requirements) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Account Role</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Standard permissions: engineering workspace access</div>
            </div>
            <span className="cm-status-pill cm-status-pill-deterministic">Developer</span>
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
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};