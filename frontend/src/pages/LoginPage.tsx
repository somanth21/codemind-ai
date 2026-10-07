import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { Lock, Mail, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

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
            ENGINEERING INTELLIGENCE
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', color: '#ffffff' }}>
            Repository intelligence, <br />
            <span style={{ color: 'var(--accent-blue)' }}>grounded in evidence.</span>
          </h1>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '14px' }}>
            Authoritative AST static analysis, verified citations, cyclomatic complexity calculations, and deterministic security gates for real-world software engineers.
          </p>

          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <div>&bull; Authoritative Syntactic AST Parsing</div>
            <div>&bull; Reciprocal Rank Fusion Hybrid Search</div>
            <div>&bull; Policy-Enforced Security Gates</div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          &copy; 2026 CodeMind AI &bull; Empirical Software Engineering Platform
        </div>
      </div>

      {/* Right Login Card Panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
        <div className="cm-card" style={{ width: '100%', maxWidth: '420px', padding: '36px 32px' }}>
          <div className="cm-card-corner-accent" style={{ opacity: 1 }} />
          <div style={{ marginBottom: '18px' }}>
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

          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)' }}>
              <img src="/logo.png" alt="CodeMind AI" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', margin: 0 }}>Sign In to CodeMind AI</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px', margin: 0 }}>
                Enter your credentials to access your engineering workspace.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="alert-error" role="alert" data-testid="login-error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {!errorMsg && Boolean((location.state as any)?.sessionExpired) && (
            <div className="alert-error" role="alert" style={{ marginBottom: '16px', backgroundColor: 'rgba(232, 90, 43, 0.08)', borderColor: 'rgba(232, 90, 43, 0.3)', color: '#fdba74' }}>
              <AlertCircle size={16} style={{ color: 'var(--ref-orange-3)' }} />
              <span>Authentication required. Please sign in to access your workspace.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="cm-input-wrapper">
                <Mail size={15} className="cm-input-icon" />
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
                <Lock size={15} className="cm-input-icon" />
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
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="cm-btn cm-btn-primary"
              style={{ width: '100%', padding: '11px', marginTop: '4px' }}
            >
              {isSubmitting ? (
                <>
                  <div className="cm-loader-orbit" style={{ width: '15px', height: '15px' }}>
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

          <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <p>
              Don&apos;t have an account?{' '}
              <Link to="/register" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};