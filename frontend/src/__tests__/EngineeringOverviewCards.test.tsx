import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EngineeringOverviewCards } from '../components/analysis/EngineeringOverviewCards';
import { RunExecutionSummary } from '../components/analysis/RunExecutionSummary';
import { AnalysisRun } from '../types/analysis';

describe('Graphical Engineering Overview & Run Summary', () => {
  const sampleRun: AnalysisRun = {
    id: 'run-bumble-1',
    repositoryId: 'repo-bumble',
    status: 'COMPLETED',
    startedAt: '2026-10-07T23:07:22Z',
    completedAt: '2026-10-07T23:09:15Z',
    filesAnalyzed: 137,
    filesSkipped: 8,
    errorCount: 0,
    warningCount: 3,
    totalLoc: 20492,
    totalClasses: 37,
    totalMethods: 121,
    averageComplexity: 1.8,
    maintainabilityIndex: 46.7,
    createdAt: '2026-10-07T23:07:22Z',
  };

  it('renders RunExecutionSummary with status, started timestamp, errors, warnings, and skipped files', () => {
    render(<RunExecutionSummary run={sampleRun} />);

    expect(screen.getByText('RUN EXECUTION SUMMARY')).toBeInTheDocument();
    expect(screen.getByText(/Analysis completed successfully with/i)).toBeInTheDocument();
    expect(screen.getByText(/✓ 0 Errors/i)).toBeInTheDocument();
    expect(screen.getByText(/⚠ 3 Warnings/i)).toBeInTheDocument();
    expect(screen.getByText(/○ 8 Skipped \/ Binary/i)).toBeInTheDocument();
  });

  it('renders Card A (Physical LOC) communicating volume scale and files analyzed', () => {
    render(<EngineeringOverviewCards run={sampleRun} />);

    expect(screen.getByText('20,492')).toBeInTheDocument();
    expect(screen.getByText('Physical Lines of Code')).toBeInTheDocument();
    expect(screen.getByText(/137 files analyzed/i)).toBeInTheDocument();
    expect(screen.getByText(/Scale: Medium \(10k-25k\)/i)).toBeInTheDocument();
  });

  it('renders Card B (Code Structure) with proportional Classes vs Methods comparison and AST extraction label', () => {
    render(<EngineeringOverviewCards run={sampleRun} />);

    expect(screen.getByText('Code Structure')).toBeInTheDocument();
    expect(screen.getByText('37')).toBeInTheDocument();
    expect(screen.getByText('121')).toBeInTheDocument();
    expect(screen.getByText('37 classes • 121 methods')).toBeInTheDocument();
    expect(screen.getByText('JavaParser AST extraction')).toBeInTheDocument();
  });

  it('renders Card C (Average Complexity) with McCabe decision point count and status', () => {
    render(<EngineeringOverviewCards run={sampleRun} />);

    expect(screen.getByText('Average Complexity')).toBeInTheDocument();
    expect(screen.getByText('1.8')).toBeInTheDocument();
    expect(screen.getByText('McCabe decision point count')).toBeInTheDocument();
    expect(screen.getByText('Low Branching')).toBeInTheDocument();
  });

  it('renders Card D (Maintainability Index) circular gauge with center score and reference threshold 65.0', () => {
    render(<EngineeringOverviewCards run={sampleRun} />);

    expect(screen.getByText('Maintainability')).toBeInTheDocument();
    expect(screen.getByText('46.7')).toBeInTheDocument();
    expect(screen.getByText('/ 100')).toBeInTheDocument();
    expect(screen.getByText('Below reference threshold')).toBeInTheDocument();
    expect(screen.getByText('CodeMind reference threshold: 65.0')).toBeInTheDocument();
  });
});
