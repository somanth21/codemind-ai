import React from 'react';
import { AnalysisRun } from '../../types/analysis';
import { CheckCircle2, AlertTriangle, XCircle, FileQuestion, Calendar, Clock } from 'lucide-react';

interface RunExecutionSummaryProps {
  run: AnalysisRun;
}

export const RunExecutionSummary: React.FC<RunExecutionSummaryProps> = ({ run }) => {
  const isCompleted = run.status === 'COMPLETED';
  const isFailed = run.status === 'FAILED';
  const isAnalyzing = run.status === 'ANALYZING';

  const formattedDate = run.startedAt ? new Date(run.startedAt).toLocaleDateString() : '—';
  const formattedTime = run.startedAt ? new Date(run.startedAt).toLocaleTimeString() : '—';

  return (
    <div
      className="run-execution-summary-panel"
      style={{
        backgroundColor: '#0a0f1d',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Top Row: Title + Status + Message */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ref-mute)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            RUN EXECUTION SUMMARY
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              backgroundColor: isCompleted
                ? 'rgba(16, 185, 129, 0.15)'
                : isFailed
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(56, 189, 248, 0.15)',
              color: isCompleted ? '#10b981' : isFailed ? '#ef4444' : '#38bdf8',
              border: `1px solid ${
                isCompleted
                  ? 'rgba(16, 185, 129, 0.3)'
                  : isFailed
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(56, 189, 248, 0.3)'
              }`,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isCompleted ? '#10b981' : isFailed ? '#ef4444' : '#38bdf8',
                display: 'inline-block',
              }}
            />
            {run.status}
          </span>
        </div>

        <div style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
          {isCompleted ? (
            <span>
              Analysis completed successfully with{' '}
              <strong style={{ color: run.errorCount === 0 ? '#10b981' : '#ef4444' }}>
                {run.errorCount} {run.errorCount === 1 ? 'error' : 'errors'}
              </strong>{' '}
              and{' '}
              <strong style={{ color: run.warningCount > 0 ? 'var(--ref-orange-3)' : '#cbd5e1' }}>
                {run.warningCount} {run.warningCount === 1 ? 'warning' : 'warnings'}
              </strong>
              .
            </span>
          ) : isAnalyzing ? (
            <span>JavaParser AST execution in progress...</span>
          ) : (
            <span>Analysis finished with status: {run.status}</span>
          )}
        </div>
      </div>

      {/* Bottom Row: Timeline & Stat Badges */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
          paddingTop: '10px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Started */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span
            style={{
              fontSize: '0.64rem',
              color: 'var(--ref-mute)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
            }}
          >
            STARTED
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.74rem',
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Calendar size={12} style={{ color: 'var(--ref-mute)' }} />
            <span>{formattedDate}</span>
            <span style={{ opacity: 0.3 }}>&bull;</span>
            <Clock size={12} style={{ color: 'var(--ref-mute)' }} />
            <span>{formattedTime}</span>
          </div>
        </div>

        {/* Errors */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span
            style={{
              fontSize: '0.64rem',
              color: 'var(--ref-mute)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
            }}
          >
            ERRORS
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.76rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: run.errorCount === 0 ? '#10b981' : '#ef4444',
            }}
          >
            {run.errorCount === 0 ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
            <span>{run.errorCount === 0 ? '✓ 0 Errors' : `✕ ${run.errorCount} Errors`}</span>
          </div>
        </div>

        {/* Warnings */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span
            style={{
              fontSize: '0.64rem',
              color: 'var(--ref-mute)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
            }}
          >
            WARNINGS
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.76rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: run.warningCount > 0 ? 'var(--ref-orange-3)' : 'var(--ref-mute)',
            }}
          >
            <AlertTriangle size={13} />
            <span>⚠ {run.warningCount} Warnings</span>
          </div>
        </div>

        {/* Skipped / Binary Files */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span
            style={{
              fontSize: '0.64rem',
              color: 'var(--ref-mute)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
            }}
          >
            SKIPPED / BINARY
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.76rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--ref-mute)',
            }}
          >
            <FileQuestion size={13} />
            <span>○ {run.filesSkipped || 0} Skipped / Binary</span>
          </div>
        </div>
      </div>
    </div>
  );
};
