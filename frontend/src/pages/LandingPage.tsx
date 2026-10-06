import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Search,
  Network,
  Cpu,
  Sparkles,
  ArrowRight,
  FolderGit2,
  Terminal,
  ShieldCheck,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-color)',
          padding: '16px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(9, 13, 22, 0.85)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={24} color="var(--accent-blue)" />
            <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              CodeMind AI
            </span>
            <span className="cm-status-pill cm-status-pill-deterministic" style={{ fontSize: '0.65rem' }}>
              PROD
            </span>
          </div>

          <nav style={{ display: 'flex', gap: '20px', fontSize: '0.875rem' }} className="landing-nav">
            <a href="#product" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}>Product</a>
            <a href="#research" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}>Research</a>
            <a href="#security" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}>Security</a>
            <a href="#docs" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}>Documentation</a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="cm-btn cm-btn-primary"
            >
              <span>Go to Workspace</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="cm-btn cm-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="cm-btn cm-btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                <span>Get Started</span>
                <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section
        id="product"
        style={{
          padding: '80px 24px 60px',
          maxWidth: '1150px',
          margin: '0 auto',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '999px',
            backgroundColor: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            fontSize: '0.85rem',
            color: 'var(--accent-blue)',
            marginBottom: '28px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <Sparkles size={15} />
          <span>Repository-Aware Intelligence &bull; Deterministic Invariants &bull; Grounded Citations</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.6rem, 5.5vw, 4.2rem)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            margin: '0 0 24px 0',
            textTransform: 'uppercase',
          }}
        >
          Understand your codebase. <br />
          <span style={{ color: 'var(--accent-blue)' }}>Before you change it.</span>
        </h1>

        <p
          style={{
            fontSize: '1.15rem',
            color: 'var(--text-secondary)',
            maxWidth: '780px',
            lineHeight: 1.6,
            margin: '0 0 36px 0',
          }}
        >
          Repository-aware intelligence for Code Understanding, Search, Reuse, Security, Architecture, and Grounded AI.
          Evaluate candidate functions with deterministic evidence, AST metrics, and verified citations.
        </p>

        {/* Primary CTAs with Uiverse adapted styling */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            to={isAuthenticated ? '/repositories' : '/register'}
            className="cm-btn cm-btn-primary"
            style={{ padding: '14px 28px', fontSize: '1rem' }}
          >
            <FolderGit2 size={18} />
            <span>Connect Repository</span>
            <ArrowRight size={18} />
          </Link>

          <Link
            to={isAuthenticated ? '/dashboard' : '/login'}
            className="cm-btn cm-btn-secondary"
            style={{ padding: '14px 28px', fontSize: '1rem' }}
          >
            <Terminal size={18} color="var(--accent-cyan)" />
            <span>Explore CodeMind</span>
          </Link>
        </div>

        {/* Interactive Ingestion & Verification Teaser */}
        <div
          className="cm-card"
          style={{
            marginTop: '56px',
            width: '100%',
            maxWidth: '920px',
            padding: 0,
            overflow: 'hidden',
            textAlign: 'left',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div className="cm-card-corner-accent" style={{ opacity: 1 }} />
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '12px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '10px', fontFamily: 'var(--font-mono)' }}>
                https://github.com/spring-projects/spring-petclinic
              </span>
            </div>
            <div className="cm-status-pill cm-status-pill-ready">READY</div>
          </div>

          <div style={{ padding: '24px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.8 }}>
            <div style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>&gt; codemind connect --github https://github.com/spring-projects/spring-petclinic</span>
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              [CONNECT] Validated GitHub host (SSRF-safe). Initiating archive stream...
            </div>
            <div style={{ color: 'var(--accent-green)' }}>
              [EXTRACT] 48 Java units safely unzipped into isolation sandbox. 0 symlinks detected.
            </div>
            <div style={{ color: 'var(--accent-cyan)' }}>
              [AST] 214 symbols extracted &bull; Cyclomatic complexity avg: 3.2 &bull; 0 circular dependencies.
            </div>
            <div style={{ color: 'var(--accent-amber)' }}>
              [SECURITY] Hard gate passed: 0 CRITICAL / 0 HIGH blockers. Static rule match verified.
            </div>
            <div style={{ color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={14} />
              <span>[AI GROUNDING] 3/3 claims cited directly to PaymentService.java:L42-68. Confidence: 0.94</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="research" style={{ padding: '60px 24px 80px', maxWidth: '1150px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '44px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 10px 0' }}>
            Built for Serious Engineering Teams
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Architectural certainty driven by deterministic static algorithms and grounded reasoning.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div className="cm-card cm-card-interactive">
            <div className="cm-card-corner-accent" />
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', marginBottom: '16px' }}>
              <Cpu size={22} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>Deterministic AST Parser</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Syntactic analysis, cyclomatic complexity, coupling metrics, and symbol indices without hallucinations.
            </p>
          </div>

          <div className="cm-card cm-card-interactive">
            <div className="cm-card-corner-accent" />
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-green)', marginBottom: '16px' }}>
              <Search size={22} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>Hybrid RRF Search</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Dual PostgreSQL lexical full-text and vector embeddings fused via Reciprocal Rank Fusion for optimal recall.
            </p>
          </div>

          <div className="cm-card cm-card-interactive">
            <div className="cm-card-corner-accent" />
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-red)', marginBottom: '16px' }}>
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>Deterministic Security Gates</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Policy engine blocks reuse recommendations whenever critical or high CWE vulnerabilities are detected.
            </p>
          </div>

          <div className="cm-card cm-card-interactive">
            <div className="cm-card-corner-accent" />
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)', marginBottom: '16px' }}>
              <Network size={22} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>Grounded AI Reasoning</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              LLM reasoning strictly bounded by repository evidence. Every generated claim includes line-range citations.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="docs"
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--border-color)',
          padding: '24px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div>&copy; 2026 CodeMind AI &bull; Empirical Software Engineering Platform</div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            Sign In
          </Link>
          <Link to="/register" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            Create Account
          </Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
};