import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FolderGit2,
  Activity,
  Search,
  GitFork,
  ShieldAlert,
  Network,
  BotMessageSquare,
  Sparkles,
  ShieldCheck,
  ArrowUpRight,
  Cpu,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // Mouse parallax state for hero cards
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setMousePos({
      x: (e.clientX - centerX) / (rect.width / 2),
      y: (e.clientY - centerY) / (rect.height / 2),
    });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // 8 Floating Hero Cards
  const heroCards = useMemo(() => [
    {
      id: 1,
      className: 'ref-card-1',
      rot: -9,
      depth: 14,
      title: 'SANDBOX STORAGE',
      tag: 'SANDBOX',
      accent: 'var(--ref-orange-1)',
      icon: <FolderGit2 size={16} className="text-orange-400" />,
      metric: 'ZIP & Git',
      sub: 'Isolated sandbox',
      to: '/register',
    },
    {
      id: 2,
      className: 'ref-card-2',
      rot: -5,
      depth: 10,
      title: 'AST PARSER',
      tag: 'AST',
      accent: 'var(--ref-orange-2)',
      icon: <Activity size={16} className="text-amber-400" />,
      metric: 'Symbols',
      sub: 'Classes & Methods',
      to: '/register',
    },
    {
      id: 3,
      className: 'ref-card-3',
      rot: -2,
      depth: 8,
      title: 'SEARCH RETRIEVAL',
      tag: 'HYBRID',
      accent: 'var(--accent-blue)',
      icon: <Search size={16} className="text-sky-400" />,
      metric: 'RRF Search',
      sub: 'Lexical + Vector',
      to: '/register',
    },
    {
      id: 4,
      className: 'ref-card-4',
      rot: 3,
      depth: 12,
      title: 'REUSE ENGINE',
      tag: 'CLONES',
      accent: 'var(--ref-orange-3)',
      icon: <GitFork size={16} className="text-orange-300" />,
      metric: '8-Dim Matrix',
      sub: 'Candidate Scoring',
      to: '/register',
    },
    {
      id: 5,
      className: 'ref-card-5',
      rot: 0,
      depth: 6,
      title: 'CORE ENGINE',
      tag: 'DETERMINISTIC FIRST',
      accent: 'var(--accent-green)',
      icon: <ShieldCheck size={20} className="text-emerald-400" />,
      metric: '100% Score',
      sub: 'Maintainability & AST',
      to: '/register',
      prominent: true,
    },
    {
      id: 6,
      className: 'ref-card-6',
      rot: 4,
      depth: 11,
      title: 'SECURITY GATE',
      tag: 'CWE SCAN',
      accent: 'var(--accent-red)',
      icon: <ShieldAlert size={16} className="text-rose-400" />,
      metric: '0 Critical',
      sub: 'Static Taint Flow',
      to: '/register',
    },
    {
      id: 7,
      className: 'ref-card-7',
      rot: 7,
      depth: 9,
      title: 'GRAPH ARCHITECTURE',
      tag: 'COUPLING',
      accent: 'var(--accent-purple)',
      icon: <Network size={16} className="text-purple-400" />,
      metric: 'Acyclic DAG',
      sub: 'Package Ca / Ce',
      to: '/register',
    },
    {
      id: 8,
      className: 'ref-card-8',
      rot: -4,
      depth: 13,
      title: 'REASONING AGENT',
      tag: 'VERIFIED',
      accent: 'var(--accent-indigo)',
      icon: <BotMessageSquare size={16} className="text-indigo-400" />,
      metric: 'Citation Bounded',
      sub: 'Zero Hallucination',
      to: '/register',
    },
  ], []);

  // Section 2 Modules Grid
  const modules = [
    {
      num: '01. INGESTION',
      title: 'Sandbox Repository Storage',
      desc: 'Traversal defense, multi-format ZIP unpacker, and GitHub branch checkout with file quota enforcement.',
      icon: <FolderGit2 className="h-5 w-5 text-orange-400" />,
      tag: 'ISOLATED',
      stat: 'Safe multi-tenant sandbox',
      to: '/register',
    },
    {
      num: '02. STATIC ANALYSIS',
      title: 'Deterministic AST & Metrics',
      desc: 'JavaParser symbol extraction, McCabe cyclomatic complexity, Halstead volume, and maintainability index.',
      icon: <Activity className="h-5 w-5 text-amber-400" />,
      tag: 'JAVAPARSER',
      stat: 'AST symbols & metrics',
      to: '/register',
    },
    {
      num: '03. RETRIEVAL',
      title: 'Hybrid Rank Fusion (RRF)',
      desc: 'Reciprocal rank fusion combining lexical token frequencies with dense vector embeddings.',
      icon: <Search className="h-5 w-5 text-sky-400" />,
      tag: 'HYBRID RRF',
      stat: 'Source-line provenance',
      to: '/register',
    },
    {
      num: '04. REUSE ADVISOR',
      title: 'Clone & Decision Matrix',
      desc: 'Multi-dimensional scoring evaluating structural similarity, interface stability, and security blockers.',
      icon: <GitFork className="h-5 w-5 text-orange-300" />,
      tag: '8-DIMENSION',
      stat: 'Candidate reuse matrix',
      to: '/register',
    },
    {
      num: '05. SECURITY AUDIT',
      title: 'Static Vulnerability Gate',
      desc: 'Deterministic taint flows and static rules for SQL injection, hardcoded secrets, and directory traversal.',
      icon: <ShieldAlert className="h-5 w-5 text-rose-400" />,
      tag: 'CWE RULES',
      stat: 'Hard gate security verification',
      to: '/register',
    },
    {
      num: '06. ARCHITECTURE',
      title: 'Package Coupling & Cycles',
      desc: 'Calculates Afferent/Efferent coupling, instability, abstractness, and detects dependency cycle paths.',
      icon: <Network className="h-5 w-5 text-purple-400" />,
      tag: 'ACYCLIC GRAPH',
      stat: 'Clean acyclic architecture',
      to: '/register',
    },
    {
      num: '07. GROUNDED AI',
      title: 'Citation-Verified Reasoning',
      desc: 'Downstream LLM synthesis strictly bounded by code evidence with line-exact citations.',
      icon: <BotMessageSquare className="h-5 w-5 text-indigo-400" />,
      tag: 'CITATION BOUND',
      stat: 'Zero hallucination invariant',
      to: '/register',
    },
    {
      num: '08. CODE HEALTH',
      title: 'Maintainability Index Matrix',
      desc: 'Comprehensive code maintainability and technical debt indicators calculated from physical AST measures.',
      icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
      tag: 'MAINTAINABILITY',
      stat: 'Deterministic physical baseline',
      to: '/register',
    },
  ];

  return (
    <div className="ref-dashboard" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="ref-grain" />

      {/* Top Header */}
      <header
        style={{
          borderBottom: '1px solid var(--ref-line)',
          padding: '16px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(7, 10, 18, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo.png" alt="CodeMind AI" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              CodeMind AI
            </span>
            <span className="cm-status-pill cm-status-pill-ready" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
              PROD
            </span>
          </div>

          <nav style={{ display: 'flex', gap: '24px', fontSize: '0.85rem' }} className="landing-nav">
            <a href="#product" style={{ color: 'var(--ref-ink-soft)', textDecoration: 'none' }}>Product</a>
            <a href="#matrix" style={{ color: 'var(--ref-ink-soft)', textDecoration: 'none' }}>Pipeline</a>
            <a href="#stats" style={{ color: 'var(--ref-ink-soft)', textDecoration: 'none' }}>Benchmarks</a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="ref-arrow-pill"
              style={{ padding: '8px 18px', fontSize: '0.82rem' }}
            >
              <span>Workspace</span>
              <span className="ref-ar" style={{ width: '22px', height: '22px' }}>
                <ArrowUpRight size={12} />
              </span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="cm-btn cm-btn-secondary"
                style={{ padding: '7px 16px', fontSize: '0.825rem' }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="ref-arrow-pill"
                style={{ padding: '7px 18px', fontSize: '0.825rem' }}
              >
                <span>Get Started</span>
                <span className="ref-ar" style={{ width: '22px', height: '22px' }}>
                  <ArrowUpRight size={12} />
                </span>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section (ref-ui interaction) */}
      <section
        id="product"
        className="ref-hero"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="ref-hero-eyebrow">
          <span className="dot" />
          <span>ENGINEERING INTELLIGENCE &bull; REPOSITORY AWARENESS &bull;</span>
          <span className="cm-status-pill cm-status-pill-ready" style={{ fontSize: '0.62rem', padding: '1px 7px', marginLeft: '6px' }}>
            DETERMINISTIC FIRST
          </span>
        </div>

        <h1 className="ref-hero-title">
          <span className="word"><span>Understand your codebase</span></span>&nbsp;<br />
          <span className="word" style={{ color: 'var(--ref-orange-3)' }}><span>before you change it.</span></span>
        </h1>

        {/* Faded giant backdrop text */}
        <div className="ref-big-wrap">
          <div className="ref-big-text">
            <span className="letter">c</span>
            <span className="letter">o</span>
            <span className="letter">d</span>
            <span className="letter">e</span>
            <span className="letter">m</span>
            <span className="letter">i</span>
            <span className="letter">n</span>
            <span className="letter">d</span>
            <span className="letter">&nbsp;</span>
            <span className="letter">a</span>
            <span className="letter">i</span>
          </div>
        </div>

        {/* Floating Cards Row with Mouse Parallax (ref-ui interaction) */}
        <div className="ref-cards-row">
          {heroCards.map((c) => {
            const offsetX = mousePos.x * c.depth * 2.2;
            const offsetY = mousePos.y * c.depth * 1.8;
            const currentRot = c.rot + mousePos.x * 2.4;

            return (
              <div
                key={c.id}
                className={`ref-card ${c.className}`}
                style={{
                  transform: `translate3d(${offsetX}px, ${offsetY}px, 0) rotate(${currentRot}deg)`,
                }}
              >
                <div className="ref-card-inner">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {c.icon}
                      <span style={{ fontSize: '0.62rem', fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', color: '#ffffff' }}>
                        {c.tag}
                      </span>
                    </div>
                    <ArrowUpRight size={13} style={{ color: 'var(--ref-mute)', opacity: 0.8 }} />
                  </div>

                  <div style={{ margin: 'auto 0' }}>
                    <div style={{ fontSize: c.prominent ? '1.25rem' : '0.95rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', fontFamily: 'var(--font-mono)' }}>
                      {c.metric}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--ref-ink-soft)', marginTop: '2px', lineHeight: 1.3 }}>
                      {c.sub}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px' }}>
                    <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-mono)', color: 'var(--ref-mute)', textTransform: 'uppercase' }}>
                      {c.title}
                    </span>
                    <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: c.accent }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Pills & Subline (ref-ui interaction) */}
        <div className="ref-subline">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              to="/register"
              className="ref-arrow-pill"
            >
              <span>Connect Repository</span>
              <span className="ref-ar">
                <ArrowUpRight size={14} />
              </span>
            </Link>

            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="ref-arrow-pill"
              style={{ background: 'rgba(232, 90, 43, 0.12)', borderColor: 'rgba(232, 90, 43, 0.4)' }}
            >
              <Cpu size={14} style={{ color: 'var(--ref-orange-3)' }} />
              <span>Explore Workspace</span>
              <span className="ref-ar">
                <ArrowUpRight size={14} />
              </span>
            </Link>
          </div>

          <div className="ref-subline-text">
            8 Analysis Dimensions &bull; 100% Deterministic &bull; Zero Hallucinations
          </div>
        </div>
      </section>

      {/* Section 2: Deterministic Modules Grid (ref-ui team grid) */}
      <section id="matrix" className="ref-modules-section">
        <div className="ref-section-head">
          <div>
            <div className="ref-hero-eyebrow" style={{ marginBottom: '12px' }}>
              <span className="dot" />
              <span>SYSTEMIC FRAMEWORK MATRIX</span>
            </div>
            <h2>
              Rigorous Integration of<br />
              <em>Code Structure</em> and <em>Grounded Intelligence</em>.
            </h2>
          </div>
          <p>
            Deterministic static analysis is the authoritative baseline. Downstream AI reasoning is strictly bounded by citation-verified code evidence.
          </p>
        </div>

        <div className="ref-modules-grid">
          {modules.map((m) => (
            <Link
              key={m.num}
              to={m.to}
              className="ref-t-card"
              style={{ textDecoration: 'none' }}
            >
              <div className="ref-t-card-content">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      {m.icon}
                    </div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--ref-orange-3)' }}>
                      {m.tag}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--ref-mute)' }}>
                    {m.num}
                  </span>
                </div>

                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
                    {m.title}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--ref-ink-soft)', lineHeight: 1.5 }}>
                    {m.desc}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)' }}>
                    {m.stat}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--ref-orange-3)', fontWeight: 600 }}>
                    <span>Explore</span>
                    <ArrowUpRight size={12} />
                  </div>
                </div>
              </div>

              {/* Hover Meta Overlay (ref-ui interaction) */}
              <div className="ref-t-meta">
                <div className="nm">{m.title}</div>
                <div className="rl">{m.stat} &bull; Click to explore module</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 3: High-Impact Stats Block (ref-ui stats block) */}
      <section id="stats" className="ref-stats">
        <div className="ref-stats-inner">
          <div>
            <div className="ref-hero-eyebrow" style={{ marginBottom: '12px', color: 'var(--ref-orange-3)' }}>
              <Sparkles size={13} style={{ color: 'var(--ref-orange-3)' }} />
              <span style={{ color: 'var(--ref-orange-3)' }}>PHYSICAL REPOSITORY TRUTH</span>
            </div>
            <h3>
              Deterministic Code<br />
              <em>Intelligence</em>.
            </h3>
          </div>

          <div className="ref-stat-block">
            <div className="num">
              <span>100</span>
              <small>%</small>
            </div>
            <div className="lbl">Deterministic Baseline</div>
          </div>

          <div className="ref-stat-block">
            <div className="num">
              <span>8</span>
              <small>engines</small>
            </div>
            <div className="lbl">Analysis Dimensions</div>
          </div>

          <div className="ref-stat-block">
            <div className="num">
              <span>0</span>
              <small>hallucinations</small>
            </div>
            <div className="lbl">Evidence Invariant</div>
          </div>

          <div className="ref-stat-block" style={{ gridColumn: 'span 1' }}>
            <div className="num">
              <span style={{ color: 'var(--accent-green)' }}>&lt;1s</span>
            </div>
            <div className="lbl">Hybrid RRF Retrieval</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--ref-line)',
          padding: '24px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.82rem',
          color: 'var(--ref-mute)',
          backgroundColor: '#070a12',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>&copy; 2026 CodeMind AI &bull; Empirical Software Engineering Intelligence Platform</div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <Link to="/login" style={{ color: 'var(--ref-ink-soft)', textDecoration: 'none' }}>
            Sign In
          </Link>
          <Link to="/register" style={{ color: 'var(--ref-ink-soft)', textDecoration: 'none' }}>
            Create Account
          </Link>
          <Link to="/privacy" style={{ color: 'var(--ref-ink-soft)', textDecoration: 'none' }}>
            Privacy
          </Link>
          <Link to="/terms" style={{ color: 'var(--ref-ink-soft)', textDecoration: 'none' }}>
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
};
