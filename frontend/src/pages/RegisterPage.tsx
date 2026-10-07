import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { Lock, Mail, User, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

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
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Left Product Brand Panel */}
      <div
        style={{
          flex: 1,
          display: 'none',
          padding: '60px 48px',
          borderRight: '1px solid var(--border-color)',
          background: 'radial-gradient(ellipse at 20% 40%, rgba(56, 189, 248, 0.08) 0%, #070A12 70%)',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        className="login-brand-panel"
      >
        <div>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              color: '#ffffff',
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo.png" alt="CodeMind AI" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>CODEMIND AI</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>v0.9.0 &bull; PROD</div>
            </div>
          </Link>
        </div>

        <div style={{ maxWidth: '440px' }}>
          <div className="text-[11px] font-bold text-sky-400 font-mono tracking-widest uppercase mb-2">
            RESEARCH INVARIANTS
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#ffffff' }}>
            Empirical intelligence, <br />
            <span style={{ color: 'var(--accent-blue)' }}>deterministic by design.</span>
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '14px' }}>
            Join software engineers creating deterministic engineering maps with AST parsing, modular coupling metrics, and safe reuse recommendations.
          </p>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          &copy; 2026 CodeMind AI &bull; Empirical Software Engineering Platform
        </div>
      </div>

      {/* Right Registration Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div className="cm-card" style={{ width: '100%', maxWidth: '440px', padding: '32px 28px' }}>
          <div className="cm-card-corner-accent" style={{ opacity: 1 }} />
          <div style={{ marginBottom: '16px' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
            >
              <ArrowLeft size={13} />
              <span>Back to CodeMind</span>
            </Link>
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)' }}>
              <img src="/logo.png" alt="CodeMind AI" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', margin: 0 }}>Create your CodeMind account</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px', margin: 0 }}>Understand your codebase before you change it.</p>
            </div>
          </div>

          {errorMsg && (
            <div className="alert-error" role="alert" data-testid="register-error">
              <AlertCircle size={16} />
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
  </div>
  );
};