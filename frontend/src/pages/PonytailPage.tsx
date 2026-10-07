import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  GitFork,
  Boxes,
  Zap,
  Target,
  ArrowRight,
  ExternalLink,
  Scale,
  Code2,
  CheckCircle2,
  Lock,
  Workflow,
  FileCode,
  Calendar,
} from 'lucide-react';

export const PonytailPage: React.FC = () => {
  const minimalityQuestions = [
    {
      number: '01',
      question: 'Does this functionality already exist?',
      detail: 'Inspect indexed repository AST symbols to uncover already-implemented utilities before duplicating logic.',
      icon: <FileCode className="w-4 h-4 text-amber-400" />,
    },
    {
      number: '02',
      question: 'Can existing code be reused?',
      detail: 'Leverage CodeMind’s deterministic reuse scoring to adapt or compose existing functions rather than authoring greenfield code.',
      icon: <GitFork className="w-4 h-4 text-emerald-400" />,
    },
    {
      number: '03',
      question: 'Can the platform or standard library solve it?',
      detail: 'Rely on modern runtime capabilities (Java 17+, ES2023, standard crypto) rather than third-party wrappers.',
      icon: <Boxes className="w-4 h-4 text-sky-400" />,
    },
    {
      number: '04',
      question: 'Is a new dependency really necessary?',
      detail: 'Avoid dependency bloat, transitive CVE attack surfaces, and version drift when native primitives suffice.',
      icon: <Scale className="w-4 h-4 text-purple-400" />,
    },
    {
      number: '05',
      question: 'What is the smallest correct implementation?',
      detail: 'Filter out speculative abstractions and over-engineering, committing only what is strictly required to satisfy intent.',
      icon: <Zap className="w-4 h-4 text-orange-400" />,
    },
  ];

  const pipelineSteps = [
    {
      title: 'User Request',
      desc: 'Developer prompts for functionality or architectural modification.',
      icon: <Target className="w-4 h-4 text-amber-400" />,
    },
    {
      title: 'Repository Intelligence',
      desc: 'AST indexing of symbols, dependencies, and call hierarchies.',
      icon: <Code2 className="w-4 h-4 text-sky-400" />,
    },
    {
      title: 'Existing Code / Reuse Analysis',
      desc: 'Deterministic multi-criteria symbol matching and similarity scoring.',
      icon: <GitFork className="w-4 h-4 text-emerald-400" />,
    },
    {
      title: 'Security & Architecture Analysis',
      desc: 'Zero-tolerance security gates and blast-radius coupling evaluation.',
      icon: <ShieldCheck className="w-4 h-4 text-rose-400" />,
    },
    {
      title: 'Ponytail Minimality Reasoning',
      desc: 'YAGNI heuristics to eliminate speculative complexity and bloat.',
      highlight: true,
      icon: <Sparkles className="w-4 h-4 text-amber-300" />,
    },
    {
      title: 'Grounded Recommendation',
      desc: 'Authoritative, minimal implementation plan cited against source AST.',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    },
  ];

  const valuePillars = [
    {
      title: 'AVOID DUPLICATION',
      summary: 'Identify existing functionality before introducing new code.',
      description:
        'Prevents parallel implementations, fragmented utility sprawl, and redundant clone debt across team boundaries.',
      icon: <GitFork className="w-5 h-5 text-amber-400" />,
      accent: 'border-amber-500/30',
    },
    {
      title: 'SMALLER CHANGES',
      summary: 'Prefer the smallest correct modification.',
      description:
        'Streamlines code reviews, lowers cognitive review load, and drastically reduces the blast radius of potential regressions.',
      icon: <Zap className="w-5 h-5 text-sky-400" />,
      accent: 'border-sky-500/30',
    },
    {
      title: 'FEWER UNNECESSARY DEPENDENCIES',
      summary: 'Avoid adding libraries when existing capabilities are sufficient.',
      description:
        'Guards supply-chain health by rejecting frivolous npm/Maven packages when native language features already solve the problem.',
      icon: <Boxes className="w-5 h-5 text-purple-400" />,
      accent: 'border-purple-500/30',
    },
    {
      title: 'ENGINEERING FOCUS',
      summary: 'Keep solutions simple without compromising security or correctness.',
      description:
        'Refocuses engineering time on solving core business logic cleanly rather than maintaining complex speculative architectures.',
      icon: <Target className="w-5 h-5 text-emerald-400" />,
      accent: 'border-emerald-500/30',
    },
  ];

  return (
    <div className="feature-view-container cm-canvas-grain space-y-8 relative overflow-hidden" data-testid="ponytail-page">
      {/* Atmospheric Ambient Lighting */}
      <div className="cm-ambient-glow" style={{ top: -40, left: 80, opacity: 0.55 }} />
      <div className="cm-ambient-glow-teal" style={{ top: 180, right: 40, opacity: 0.35 }} />

      {/* 1. Hero Section */}
      <div className="cm-clay-card p-8 sm:p-10 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div
          className="absolute top-0 right-0 w-96 h-96 pointer-events-none opacity-25"
          style={{
            background: 'radial-gradient(circle at top right, rgba(245, 158, 11, 0.45), transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span className="cm-eyebrow" style={{ color: '#f59e0b', marginBottom: 0 }}>
              UPCOMING CAPABILITY &bull; YAGNI MINIMALITY REASONING
            </span>
            <span className="cm-tag-pill cm-tag-pill-amber font-mono font-semibold text-[11px] uppercase tracking-wider">
              Upcoming Feature
            </span>
            <span className="cm-tag-pill font-mono text-[11px] text-slate-400">
              Not Currently Active
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              PONYTAIL
            </span>
            <span className="text-slate-400 text-xl sm:text-2xl font-normal">&mdash; Coming to CodeMind</span>
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-200 font-medium leading-relaxed">
            &ldquo;Help CodeMind identify the smallest correct implementation before unnecessary code is introduced.&rdquo;
          </p>

          <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-2xl">
            Powered by an open-source minimality and YAGNI (You Aren't Gonna Need It) reasoning approach. Designed to prevent code bloat, reduce token consumption, and preserve architectural simplicity.
          </p>

          {/* Non-active Roadmap Disclaimer Banner */}
          <div className="mt-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] flex items-start gap-3">
            <Calendar className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300">
              <strong className="text-amber-300 block mb-0.5">Product Roadmap Notice:</strong>
              Ponytail is currently a planned roadmap feature and is <span className="underline font-semibold text-white">not integrated or active</span> in this version of CodeMind. This preview details our planned architecture and engineering principles.
            </div>
          </div>
        </div>
      </div>

      {/* 2. Explain the Idea */}
      <div className="cm-clay-card p-6 sm:p-8">
        <div className="max-w-3xl mb-6">
          <div className="cm-eyebrow" style={{ color: '#38bdf8' }}>
            ENGINEERING PHILOSOPHY
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            &ldquo;Good engineering is not about writing more code. It&rsquo;s about writing the right code.&rdquo;
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
            In typical development and generative AI workflows, the default response to a problem is to generate new classes, boilerplate services, and extraneous dependencies. Ponytail inverts this tendency by enforcing rigorous minimality questions before code is accepted:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {minimalityQuestions.map((q) => (
            <div
              key={q.number}
              className="bg-white/[0.02] border border-white/[0.08] hover:border-amber-500/30 rounded-xl p-4 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-slate-500">{q.number}</span>
                  <div className="cm-icon-tile" style={{ width: '30px', height: '30px' }}>
                    {q.icon}
                  </div>
                </div>
                <h3 className="text-xs font-semibold text-white mb-2 leading-snug">{q.question}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">{q.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. How It Fits into CodeMind (Pipeline) */}
      <div className="cm-clay-card p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="cm-eyebrow" style={{ color: '#10b981' }}>
              INTEGRATION ARCHITECTURE
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Workflow className="w-5 h-5 text-emerald-400" />
              How Ponytail Fits into CodeMind
            </h2>
          </div>
          <span className="cm-tag-pill cm-tag-pill-green text-[11px] font-mono">
            Planned Reasoning Layer
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mb-6 leading-relaxed">
          CodeMind will combine deterministic repository evidence with Ponytail&rsquo;s minimality reasoning to help determine whether new code is actually necessary. The planned pipeline places minimality evaluation downstream of repository static analysis:
        </p>

        {/* Visual Pipeline Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 relative">
          {pipelineSteps.map((step, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all relative ${
                step.highlight
                  ? 'bg-amber-500/[0.08] border-amber-500/40 shadow-sm'
                  : 'bg-white/[0.02] border-white/[0.08]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-semibold text-slate-500">
                    STAGE {idx + 1}
                  </span>
                  <div className="cm-icon-tile" style={{ width: '28px', height: '28px' }}>
                    {step.icon}
                  </div>
                </div>
                <h4
                  className={`text-xs font-bold mb-1.5 ${
                    step.highlight ? 'text-amber-300' : 'text-white'
                  }`}
                >
                  {step.title}
                </h4>
                <p className="text-[11px] text-slate-400 leading-snug">{step.desc}</p>
              </div>

              {step.highlight && (
                <div className="mt-3 text-[10px] font-mono text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-center">
                  Ponytail Reasoning
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Why Ponytail? (4 Cards) */}
      <div className="cm-clay-card p-6 sm:p-8">
        <div className="mb-6">
          <div className="cm-eyebrow" style={{ color: '#f59e0b' }}>
            ENGINEERING VALUE
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Why Ponytail?
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Four core tenets guiding the planned minimality evaluation:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {valuePillars.map((pillar, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-xl border bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col justify-between ${pillar.accent}`}
            >
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="cm-icon-tile" style={{ width: '38px', height: '38px' }}>
                    {pillar.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">{pillar.title}</h3>
                    <p className="text-xs text-slate-300 font-medium">{pillar.summary}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{pillar.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Security Principle */}
      <div className="cm-clay-card p-6 sm:p-8 border-emerald-500/30 relative overflow-hidden">
        <div
          className="absolute -right-10 -bottom-10 w-64 h-64 pointer-events-none opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.6), transparent 70%)',
          }}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <div className="cm-icon-tile" style={{ width: '48px', height: '48px', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="cm-tag-pill cm-tag-pill-green mb-1 text-[10px] font-mono uppercase tracking-wider">
              AUTHORITATIVE SECURITY INVARIANT
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Security Principle: &ldquo;Minimal does not mean careless.&rdquo;
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
          Ponytail will <span className="text-emerald-400 font-semibold">never</span> be used to justify removing security controls, input validation, authentication, authorization, accessibility, or data-loss protections. CodeMind&rsquo;s deterministic security intelligence remains authoritative and non-negotiable.
        </p>

        <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" /> OWASP Top 10 Preserved
          </span>
          <span className="text-slate-600">&bull;</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" /> Zero Secret Leakage Gate
          </span>
          <span className="text-slate-600">&bull;</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" /> RBAC &amp; Tenant Isolation Enforced
          </span>
        </div>
      </div>

      {/* 6. Ponytail + CodeMind Difference (Comparison) */}
      <div className="cm-clay-card p-6 sm:p-8">
        <div className="mb-6">
          <div className="cm-eyebrow" style={{ color: '#38bdf8' }}>
            SYNERGY &amp; COMPARISON
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Ponytail + CodeMind: The Complementary Difference
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            How combining repository-level ground truth with minimality heuristics elevates software craftsmanship:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
            <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
              Ponytail Focus
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">Minimality &amp; YAGNI Reasoning</h3>
            <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
              <li>Heuristic questions on code necessity</li>
              <li>YAGNI anti-bloat filters</li>
              <li>Token and diff size optimization</li>
              <li>Single-task focus</li>
            </ul>
          </div>

          <div className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
            <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider mb-2">
              CodeMind Core
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">Deep Repository Intelligence</h3>
            <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
              <li>Deterministic AST indexing &amp; symbol graphs</li>
              <li>8-dimensional multi-criteria reuse engine</li>
              <li>Deterministic static security vulnerability rules</li>
              <li>Architecture coupling and cycle detection</li>
            </ul>
          </div>

          <div className="p-5 rounded-xl border border-amber-500/40 bg-amber-500/[0.05] relative shadow-md">
            <div className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider mb-2">
              CodeMind + Ponytail
            </div>
            <h3 className="text-sm font-semibold text-white mb-2">Repository-Aware Minimality</h3>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              &ldquo;Repository-aware minimality recommendations&rdquo; &mdash; grounding minimality decisions not in abstract prompts, but in the exact AST symbols, files, and architectural graph of your ingested codebase.
            </p>
          </div>
        </div>
      </div>

      {/* 7. Status & Official Project Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Feature Status Card */}
        <div className="cm-clay-card p-6 flex flex-col justify-between">
          <div>
            <div className="cm-eyebrow" style={{ color: '#f59e0b', marginBottom: '4px' }}>
              FEATURE LIFECYCLE
            </div>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Integration Status
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-white/[0.02] border border-white/[0.08] rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400">Feature Status:</span>
                <span className="cm-tag-pill cm-tag-pill-amber font-mono font-bold text-[11px]">
                  COMING SOON
                </span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/[0.08] rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400">Current State:</span>
                <span className="text-xs font-mono text-slate-200">
                  Planned Integration (UI Preview)
                </span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/[0.08] rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400">Future State:</span>
                <span className="text-xs font-mono text-amber-300">
                  Repository-Aware Minimality Reasoning
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 text-[11px] font-mono text-slate-500 text-center border-t border-white/[0.06] pt-3">
            Not currently active, installed, or running inside CodeMind.
          </div>
        </div>

        {/* Official Project Attribution Card */}
        <div className="cm-clay-card p-6 flex flex-col justify-between">
          <div>
            <div className="cm-eyebrow" style={{ color: '#38bdf8', marginBottom: '4px' }}>
              OPEN SOURCE ATTRIBUTION
            </div>
            <h3 className="text-base font-bold text-white mb-3">
              About the Ponytail Project
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Ponytail is an independent open-source initiative created by <strong>Dietrich Gebert</strong> exploring minimality-driven AI reasoning. CodeMind acknowledges and credits the project&rsquo;s vision under its open-source license.
            </p>

            <div className="space-y-2 text-xs text-slate-400">
              <div>
                <strong className="text-slate-300">Author:</strong> Dietrich Gebert
              </div>
              <div>
                <strong className="text-slate-300">License:</strong> MIT License
              </div>
              <div className="text-[11px] text-slate-500 italic mt-1">
                CodeMind does not own Ponytail; open-source research integration is planned.
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.08]">
            <a
              href="https://github.com/DietrichGebert/ponytail"
              target="_blank"
              rel="noopener noreferrer"
              className="cm-arrow-pill w-full justify-between"
              aria-label="Visit official Ponytail GitHub repository (opens in new tab)"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>Visit Official GitHub Repository</span>
              </span>
              <span className="cm-cta-dot" style={{ width: '26px', height: '26px' }}>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
