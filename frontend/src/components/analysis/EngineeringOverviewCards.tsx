import React from 'react';
import { AnalysisRun } from '../../types/analysis';
import { FileCode2, Layers, Activity, Gauge } from 'lucide-react';

interface EngineeringOverviewCardsProps {
  run: AnalysisRun;
}

export const EngineeringOverviewCards: React.FC<EngineeringOverviewCardsProps> = ({ run }) => {
  // Proportions for Classes vs Methods
  const classesPct = Math.max(12, Math.min(100, Math.round((run.totalClasses / Math.max(run.totalMethods, 1)) * 100)));
  const methodsPct = 100;

  // Scale tiers for LOC (communicating volume scale without pretending it's a percentage)
  const loc = run.totalLoc || 0;
  let locScaleTier = 'Small';
  let locSegmentsActive = 1;
  if (loc >= 100000) {
    locScaleTier = 'Enterprise (100k+)';
    locSegmentsActive = 5;
  } else if (loc >= 25000) {
    locScaleTier = 'Substantial (25k-100k)';
    locSegmentsActive = 4;
  } else if (loc >= 10000) {
    locScaleTier = 'Medium (10k-25k)';
    locSegmentsActive = 3;
  } else if (loc >= 3000) {
    locScaleTier = 'Moderate (3k-10k)';
    locSegmentsActive = 2;
  } else {
    locScaleTier = 'Lightweight (<3k)';
    locSegmentsActive = 1;
  }

  // Cyclomatic complexity arc gauge math (0 to 15 scale)
  const ccValue = Number(run.averageComplexity) || 0;
  const ccClamped = Math.min(Math.max(ccValue, 0), 15);
  // Semicircle gauge: 180 degrees
  const ccAngle = (ccClamped / 15) * 180;
  const ccArcCircumference = Math.PI * 34; // r=34 -> ~106.8
  const ccDashOffset = ccArcCircumference - (ccAngle / 180) * ccArcCircumference;

  const ccColor = ccValue > 10 ? '#ef4444' : ccValue > 5 ? 'var(--ref-orange-3, #f58b4e)' : '#10b981';
  const ccStatusText =
    ccValue <= 3
      ? 'Low Branching'
      : ccValue <= 6
      ? 'Moderate Branching'
      : ccValue <= 10
      ? 'Complex Paths'
      : 'High Decision Risk';

  // Maintainability Index circular gauge math (0 to 100 scale)
  const miValue = Number(run.maintainabilityIndex) || 0;
  const miClamped = Math.min(Math.max(miValue, 0), 100);
  const miRadius = 36;
  const miCircumference = 2 * Math.PI * miRadius; // ~226.2
  const miDashOffset = miCircumference - (miClamped / 100) * miCircumference;
  const meetsMiThreshold = miValue >= 65.0;
  const miColor = meetsMiThreshold ? '#10b981' : '#f59e0b';

  return (
    <section
      className="engineering-overview-strip visual-engineering-grid"
      aria-label="Engineering Overview"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {/* ============================================================ */}
      {/* CARD A: PHYSICAL CODE — LOC                                  */}
      {/* ============================================================ */}
      <div className="overview-metric-cell visual-overview-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileCode2 size={15} style={{ color: 'var(--accent-blue)' }} />
            <span className="overview-metric-label" style={{ margin: 0 }}>
              Physical LOC
            </span>
          </div>
          <span
            style={{
              fontSize: '0.66rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              color: 'var(--accent-blue)',
              fontWeight: 700,
            }}
          >
            LOC
          </span>
        </div>

        {/* Large Primary Metric */}
        <div style={{ margin: '6px 0 2px 0' }}>
          <div className="overview-metric-value" style={{ fontSize: '2rem', fontWeight: 800 }}>
            {run.totalLoc.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
            Physical Lines of Code
          </div>
        </div>

        {/* Volumetric Scale Visual Indicator */}
        <div style={{ marginTop: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.68rem',
              color: 'var(--ref-mute)',
              fontFamily: 'var(--font-mono)',
              marginBottom: '5px',
            }}
          >
            <span>Scale: {locScaleTier}</span>
            <span>Files: {run.filesAnalyzed}</span>
          </div>

          {/* 5-segment volumetric scale meter */}
          <div style={{ display: 'flex', gap: '4px', height: '6px' }}>
            {[1, 2, 3, 4, 5].map((seg) => (
              <div
                key={seg}
                style={{
                  flex: 1,
                  borderRadius: '2px',
                  backgroundColor:
                    seg <= locSegmentsActive ? 'var(--accent-blue)' : 'rgba(255, 255, 255, 0.08)',
                  boxShadow:
                    seg === locSegmentsActive
                      ? '0 0 8px rgba(56, 189, 248, 0.6)'
                      : 'none',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        <div
          className="overview-metric-sub"
          style={{
            fontSize: '0.72rem',
            color: 'var(--ref-mute)',
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{run.filesAnalyzed} files analyzed</span>
          <span style={{ fontSize: '0.66rem', color: 'var(--ref-mute)', fontWeight: 600 }}>Files</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CARD B: CODE STRUCTURE — CLASSES VS METHODS                  */}
      {/* ============================================================ */}
      <div className="overview-metric-cell visual-overview-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={15} style={{ color: '#8b5cf6' }} />
            <span className="overview-metric-label" style={{ margin: 0 }}>
              Code Structure
            </span>
          </div>
          <span
            style={{
              fontSize: '0.66rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              color: '#c084fc',
              fontWeight: 700,
            }}
          >
            AST
          </span>
        </div>

        {/* Graphical Comparison Bar Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '4px 0 10px 0' }}>
          {/* Classes Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Classes</span>
              <strong style={{ color: '#c084fc' }}>{run.totalClasses}</strong>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${classesPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          {/* Methods Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', marginBottom: '3px' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Methods</span>
              <strong style={{ color: '#38bdf8' }}>{run.totalMethods}</strong>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${methodsPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Textual AST extraction note */}
        <div style={{ fontSize: '0.74rem', color: '#ffffff', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {run.totalClasses} classes &bull; {run.totalMethods} methods
        </div>
        <div className="overview-metric-sub" style={{ fontSize: '0.7rem', color: 'var(--ref-mute)', marginTop: '2px' }}>
          JavaParser AST extraction
        </div>
      </div>

      {/* ============================================================ */}
      {/* CARD C: COMPLEXITY — AVERAGE CYCLOMATIC COMPLEXITY           */}
      {/* ============================================================ */}
      <div className="overview-metric-cell visual-overview-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={15} style={{ color: ccColor }} />
            <span className="overview-metric-label" style={{ margin: 0 }}>
              Average Complexity
            </span>
          </div>
          <span
            style={{
              fontSize: '0.66rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--ref-mute)',
              fontWeight: 700,
            }}
          >
            McCabe CC
          </span>
        </div>

        {/* Professional Semicircular Arc Gauge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '4px 0' }}>
          <div style={{ position: 'relative', width: '74px', height: '46px', display: 'flex', justifyContent: 'center' }}>
            <svg width="74" height="46" viewBox="0 0 74 46" style={{ overflow: 'visible' }}>
              {/* Background Arc */}
              <path
                d="M 5 40 A 32 32 0 0 1 69 40"
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* Active Value Arc */}
              <path
                d="M 5 40 A 32 32 0 0 1 69 40"
                fill="none"
                stroke={ccColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${ccArcCircumference}`}
                strokeDashoffset={`${ccDashOffset}`}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            {/* Center CC Number */}
            <div
              style={{
                position: 'absolute',
                bottom: '0px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '1.45rem',
                fontWeight: 800,
                color: ccColor,
                lineHeight: 1,
              }}
            >
              {run.averageComplexity}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: 700 }}>
              {ccStatusText}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--ref-mute)', marginTop: '2px' }}>
              McCabe decision point count
            </div>
          </div>
        </div>

        <div className="overview-metric-sub" style={{ fontSize: '0.7rem', color: 'var(--ref-mute)', marginTop: '8px' }}>
          Reference: &le; 5 simple &bull; 6–10 moderate &bull; &gt; 10 complex
        </div>
      </div>

      {/* ============================================================ */}
      {/* CARD D: MAINTAINABILITY INDEX                                */}
      {/* ============================================================ */}
      <div className="overview-metric-cell visual-overview-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Gauge size={15} style={{ color: miColor }} />
            <span className="overview-metric-label" style={{ margin: 0 }}>
              Maintainability
            </span>
          </div>
          <span
            style={{
              fontSize: '0.66rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--ref-mute)',
              fontWeight: 700,
            }}
          >
            0–100
          </span>
        </div>

        {/* Graphical Circular Gauge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '4px 0' }}>
          <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
            <svg width="64" height="64" viewBox="0 0 80 80">
              {/* Background Circle */}
              <circle
                cx="40"
                cy="40"
                r={miRadius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="6"
              />
              {/* Active MI Arc */}
              <circle
                cx="40"
                cy="40"
                r={miRadius}
                fill="none"
                stroke={miColor}
                strokeWidth="6"
                strokeDasharray={miCircumference}
                strokeDashoffset={miDashOffset}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
              {/* Reference threshold tick at 65% (angle = -90 + 0.65*360 = 144 deg) */}
              <circle
                cx={40 + miRadius * Math.cos((-90 + 0.65 * 360) * (Math.PI / 180))}
                cy={40 + miRadius * Math.sin((-90 + 0.65 * 360) * (Math.PI / 180))}
                r="3"
                fill="#ffffff"
              />
            </svg>

            {/* Center Score */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: '#ffffff',
                  lineHeight: 1,
                }}
              >
                {run.maintainabilityIndex}
              </span>
              <span style={{ fontSize: '0.58rem', color: 'var(--ref-mute)', marginTop: '1px' }}>
                / 100
              </span>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: 700 }}>
              Maintainability Index
            </div>
            <div style={{ fontSize: '0.68rem', color: meetsMiThreshold ? '#10b981' : '#f59e0b', marginTop: '2px', fontWeight: 600 }}>
              {meetsMiThreshold ? 'Meets reference threshold' : 'Below reference threshold'}
            </div>
          </div>
        </div>

        <div className="overview-metric-sub" style={{ fontSize: '0.7rem', color: 'var(--ref-mute)', marginTop: '6px' }}>
          CodeMind reference threshold: 65.0
        </div>
      </div>
    </section>
  );
};
