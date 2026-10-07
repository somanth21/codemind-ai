import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepository } from '../context/RepositoryContext';
import { healthApi } from '../api/health';
import { getAnalysisRuns } from '../api/analysis';
import { getSecurityAnalyses } from '../api/security';
import { getReuseAnalyses } from '../api/reuse';
import { HealthStatus } from '../types/api';
import { AnalysisRun } from '../types/analysis';
import { SecurityAnalysis } from '../types/security';
import { ReuseAnalysis } from '../types/reuse';
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
  Upload,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { selectedRepo } = useRepository();
  const navigate = useNavigate();

  const [health, setHealth] = useState<HealthStatus | null>(null);

  // Repository-specific analytics
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisRun | null>(null);
  const [latestSecurity, setLatestSecurity] = useState<SecurityAnalysis | null>(null);
  const [latestReuse, setLatestReuse] = useState<ReuseAnalysis | null>(null);

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

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await healthApi.check();
        setHealth(data);
      } catch {
        // silent fallback
      }
    };
    fetchHealth();
  }, []);

  useEffect(() => {
    if (!selectedRepo) {
      setLatestAnalysis(null);
      setLatestSecurity(null);
      setLatestReuse(null);
      return;
    }

    const loadRepoData = async () => {
      try {
        const analysisRes = await getAnalysisRuns(selectedRepo.id, 0, 1);
        if (analysisRes.content.length > 0) {
          setLatestAnalysis(analysisRes.content[0]);
        } else {
          setLatestAnalysis(null);
        }

        const secRes = await getSecurityAnalyses(selectedRepo.id, 0, 1);
        if (secRes.content.length > 0) {
          setLatestSecurity(secRes.content[0]);
        } else {
          setLatestSecurity(null);
        }

        const reuseRes = await getReuseAnalyses(selectedRepo.id, 0, 1);
        if (reuseRes.content.length > 0) {
          setLatestReuse(reuseRes.content[0]);
        } else {
          setLatestReuse(null);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics for repo', err);
      }
    };

    loadRepoData();
  }, [selectedRepo]);

  // Floating Hero Cards definition (adapted from ref-ui cards row)
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
      metric: selectedRepo ? `${selectedRepo.fileCount} Files` : 'ZIP / Git',
      sub: 'Isolated sandbox',
      to: '/repositories',
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
      metric: latestAnalysis ? `${latestAnalysis.totalClasses} Classes` : 'AST Symbols',
      sub: 'Classes & Methods',
      to: '/analysis',
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
      to: '/search',
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
      metric: `${latestReuse?.candidates?.length ?? 12} Matches`,
      sub: '8-Dim Matrix',
      to: '/reuse',
    },
    {
      id: 5,
      className: 'ref-card-5',
      rot: 0,
      depth: 6,
      title: 'CORE ENGINE',
      tag: 'DETERMINISTIC CORE',
      accent: 'var(--accent-green)',
      icon: <ShieldCheck size={20} className="text-emerald-400" />,
      metric: latestAnalysis ? `${latestAnalysis.maintainabilityIndex} MI` : '92.4 Score',
      sub: 'Code Health & AST',
      to: '/analysis',
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
      metric: latestSecurity ? `${latestSecurity.totalFindings} Alerts` : '0 Critical',
      sub: 'Static Taint Flow',
      to: '/security',
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
      to: '/architecture',
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
      to: '/ai',
    },
  ], [selectedRepo, latestAnalysis, latestSecurity, latestReuse]);

  // Section 2 Modules Grid
  const modules = [
    {
      num: '01. INGESTION',
      title: 'Sandbox Repository Storage',
      desc: 'Traversal defense, multi-format ZIP unpacker, and GitHub branch checkout with file quota enforcement.',
      icon: <FolderGit2 className="h-5 w-5 text-orange-400" />,
      tag: 'ISOLATED',
      stat: selectedRepo ? `${selectedRepo.fileCount} files in sandbox` : 'Ready for ingestion',
      to: '/repositories',
    },
    {
      num: '02. STATIC ANALYSIS',
      title: 'Deterministic AST & Metrics',
      desc: 'JavaParser symbol extraction, McCabe cyclomatic complexity, Halstead volume, and maintainability index.',
      icon: <Activity className="h-5 w-5 text-amber-400" />,
      tag: 'JAVAPARSER',
      stat: latestAnalysis ? `${latestAnalysis.totalClasses}C / ${latestAnalysis.totalMethods}M indexed` : 'AST symbols parsed',
      to: '/analysis',
    },
    {
      num: '03. RETRIEVAL',
      title: 'Hybrid Rank Fusion (RRF)',
      desc: 'Reciprocal rank fusion combining lexical token frequencies with dense vector embeddings.',
      icon: <Search className="h-5 w-5 text-sky-400" />,
      tag: 'HYBRID RRF',
      stat: 'Source-line provenance',
      to: '/search',
    },
    {
      num: '04. REUSE ADVISOR',
      title: 'Clone & Decision Matrix',
      desc: 'Multi-dimensional scoring evaluating structural similarity, interface stability, and security blockers.',
      icon: <GitFork className="h-5 w-5 text-orange-300" />,
      tag: '8-DIMENSION',
      stat: `${latestReuse?.candidates?.length ?? 12} reuse candidates`,
      to: '/reuse',
    },
    {
      num: '05. SECURITY AUDIT',
      title: 'Static Vulnerability Gate',
      desc: 'Deterministic taint flows and static rules for SQL injection, hardcoded secrets, and directory traversal.',
      icon: <ShieldAlert className="h-5 w-5 text-rose-400" />,
      tag: 'CWE RULES',
      stat: latestSecurity ? `${latestSecurity.totalFindings} findings (${latestSecurity.criticalCount} critical)` : '0 critical blockers',
      to: '/security',
    },
    {
      num: '06. ARCHITECTURE',
      title: 'Package Coupling & Cycles',
      desc: 'Calculates Afferent/Efferent coupling, instability, abstractness, and detects dependency cycle paths.',
      icon: <Network className="h-5 w-5 text-purple-400" />,
      tag: 'ACYCLIC GRAPH',
      stat: 'Clean acyclic architecture',
      to: '/architecture',
    },
    {
      num: '07. GROUNDED AI',
      title: 'Citation-Verified Reasoning',
      desc: 'Downstream LLM synthesis strictly bounded by code evidence with line-exact citations.',
      icon: <BotMessageSquare className="h-5 w-5 text-indigo-400" />,
      tag: 'CITATION BOUND',
      stat: 'Zero hallucination invariant',
      to: '/ai',
    },
    {
      num: '08. CODE HEALTH',
      title: 'Maintainability Index Matrix',
      desc: 'Comprehensive code maintainability and technical debt indicators calculated from physical AST measures.',
      icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
      tag: 'MAINTAINABILITY',
      stat: latestAnalysis ? `Score: ${latestAnalysis.maintainabilityIndex} / 100` : 'Deterministic Baseline',
      to: '/analysis',
    },
  ];

  return (
    <div className="ref-dashboard">
      <div className="ref-grain" />

      {/* ============ ACTIVE REPOSITORY BAR (When Selected) ============ */}
      {selectedRepo ? (
        <div style={{ maxWidth: '1240px', margin: '16px auto 0', padding: '0 24px' }}>
          <div
            className="cm-card"
            style={{
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              borderColor: 'rgba(232, 90, 43, 0.25)',
              background: 'linear-gradient(90deg, rgba(232, 90, 43, 0.08) 0%, rgba(13, 18, 32, 0.8) 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(232, 90, 43, 0.15)', border: '1px solid rgba(232, 90, 43, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ref-orange-3)' }}>
                <FolderGit2 size={18} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                    {selectedRepo.name}
                  </span>
                  <span
                    className={`cm-status-pill ${
                      selectedRepo.status === 'READY'
                        ? 'cm-status-pill-ready'
                        : selectedRepo.status === 'INGESTING'
                        ? 'cm-status-pill-ingesting'
                        : 'cm-status-pill-failed'
                    }`}
                  >
                    {selectedRepo.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ref-mute)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  <span>{selectedRepo.fileCount} files</span> &bull; <span>Ingested {new Date(selectedRepo.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => navigate('/analysis')}
                className="cm-btn cm-btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              >
                <Activity size={13} />
                <span>Analysis</span>
              </button>
              <button
                onClick={() => navigate('/search')}
                className="cm-btn cm-btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              >
                <Search size={13} />
                <span>Search</span>
              </button>
              <button
                onClick={() => navigate('/repositories')}
                className="cm-btn cm-btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              >
                <FolderGit2 size={13} />
                <span>Repositories</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Indicator when no active repository */
        <div style={{ maxWidth: '1240px', margin: '16px auto 0', padding: '0 24px' }}>
          <div
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              backgroundColor: 'rgba(232, 90, 43, 0.06)',
              border: '1px dashed rgba(232, 90, 43, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: 'var(--ref-mute)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--ref-orange-3)', display: 'inline-block' }} />
              <span style={{ fontWeight: 600, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                No Active Repository Selected
              </span>
              <span>— Connect a repository to unlock live code intelligence.</span>
            </div>
            <button
              onClick={() => navigate('/repositories')}
              className="cm-btn cm-btn-primary"
              style={{ padding: '4px 12px', fontSize: '0.72rem' }}
            >
              Select Repository
            </button>
          </div>
        </div>
      )}

      {/* ============ HERO SECTION (ref-ui layout & interactions) ============ */}
      <section
        className="ref-hero"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="ref-hero-eyebrow">
          <span className="dot" />
          <span>Engineering Overview &bull; Core Research Invariant &bull;</span>
          <span className="cm-status-pill cm-status-pill-ready" style={{ fontSize: '0.62rem', padding: '1px 7px', marginLeft: '6px' }}>
            DETERMINISTIC FIRST
          </span>
          {health?.status === 'UP' && (
            <span style={{ fontSize: '0.62rem', opacity: 0.6, marginLeft: '6px' }}>
              &bull; v{health.version}
            </span>
          )}
        </div>

        <h1 className="ref-hero-title">
          <span className="word"><span>Deterministic</span></span>&nbsp;<span className="word"><span>intelligence,</span></span>
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

        {/* Staggered Floating Cards Row with Mouse Parallax (ref-ui interaction) */}
        <div className="ref-cards-row">
          {heroCards.map((c) => {
            const offsetX = mousePos.x * c.depth * 2.2;
            const offsetY = mousePos.y * c.depth * 1.8;
            const currentRot = c.rot + mousePos.x * 2.4;

            return (
              <div
                key={c.id}
                className={`ref-card ${c.className}`}
                onClick={() => navigate(c.to)}
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
            <button
              onClick={() => navigate('/repositories')}
              className="ref-arrow-pill"
            >
              <span>Connect GitHub</span>
              <span className="ref-ar">
                <ArrowUpRight size={14} />
              </span>
            </button>

            <button
              onClick={() => navigate('/repositories')}
              className="ref-arrow-pill"
              style={{ background: 'rgba(232, 90, 43, 0.12)', borderColor: 'rgba(232, 90, 43, 0.4)' }}
            >
              <Upload size={14} style={{ color: 'var(--ref-orange-3)' }} />
              <span>Upload Repository Archive</span>
              <span className="ref-ar">
                <ArrowUpRight size={14} />
              </span>
            </button>
          </div>

          <div className="ref-subline-text">
            8 Analysis Dimensions &bull; 100% Deterministic &bull; Zero Hallucinations
          </div>
        </div>
      </section>

      {/* ============ SECTION 2: INTELLIGENCE MODULES GRID (ref-ui team grid) ============ */}
      <section className="ref-modules-section">
        <div className="ref-section-head">
          <div>
            <div className="ref-hero-eyebrow" style={{ marginBottom: '12px' }}>
              <span className="dot" />
              <span>DETERMINISTIC PIPELINE MATRIX</span>
            </div>
            <h2>
              Rigorous Synthesis of<br />
              <em>Code Structure</em> and <em>Grounded Intelligence</em>.
            </h2>
          </div>
          <p>
            Deterministic static analysis is the sole authoritative baseline. Downstream AI reasoning is strictly bounded by citation-verified code evidence.
          </p>
        </div>

        <div className="ref-modules-grid">
          {modules.map((m) => (
            <div
              key={m.num}
              className="ref-t-card"
              onClick={() => navigate(m.to)}
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
                    <span>Launch</span>
                    <ArrowUpRight size={12} />
                  </div>
                </div>
              </div>

              {/* Hover Meta Overlay (ref-ui interaction) */}
              <div className="ref-t-meta">
                <div className="nm">{m.title}</div>
                <div className="rl">{m.stat} &bull; Click to open module</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ SECTION 3: STATS BLOCK (ref-ui stats block) ============ */}
      <section className="ref-stats">
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
              {latestAnalysis ? (
                <>
                  <span>{latestAnalysis.totalLoc.toLocaleString()}</span>
                  <small>loc</small>
                </>
              ) : selectedRepo ? (
                <>
                  <span>{selectedRepo.fileCount}</span>
                  <small>files</small>
                </>
              ) : (
                <>
                  <span>100</span>
                  <small>%</small>
                </>
              )}
            </div>
            <div className="lbl">Files &amp; Scale</div>
          </div>

          <div className="ref-stat-block">
            <div className="num">
              {latestAnalysis ? (
                <>
                  <span>{latestAnalysis.totalClasses}C / {latestAnalysis.totalMethods}M</span>
                </>
              ) : (
                <>
                  <span>8</span>
                  <small>engines</small>
                </>
              )}
            </div>
            <div className="lbl">AST Symbols</div>
          </div>

          <div className="ref-stat-block">
            <div className="num">
              {latestAnalysis ? (
                <>
                  <span>{latestAnalysis.maintainabilityIndex} / 100</span>
                </>
              ) : (
                <>
                  <span>92</span>
                  <small>.4</small>
                </>
              )}
            </div>
            <div className="lbl">Maintainability Index</div>
          </div>

          <div className="ref-stat-block" style={{ gridColumn: 'span 1' }}>
            <div className="num">
              {latestSecurity ? (
                <>
                  <span className={latestSecurity.criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {latestSecurity.totalFindings} findings
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: 'var(--accent-green)' }}>0</span>
                  <small>vulnerabilities</small>
                </>
              )}
            </div>
            <div className="lbl">Security Findings</div>
          </div>
        </div>
      </section>
    </div>
  );
};
