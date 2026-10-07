import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PonytailPage } from '../pages/PonytailPage';

describe('PonytailPage Component', () => {
  it('renders upcoming hero banner, non-active disclaimers, and title', () => {
    render(<PonytailPage />);

    expect(screen.getByText('PONYTAIL')).toBeInTheDocument();
    expect(screen.getByText(/Coming to CodeMind/i)).toBeInTheDocument();
    expect(screen.getByText(/Upcoming Feature/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Not Currently Active/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Product Roadmap Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/not integrated or active/i)).toBeInTheDocument();
  });

  it('renders all 5 minimality questions and engineering philosophy', () => {
    render(<PonytailPage />);

    expect(
      screen.getByText(/Good engineering is not about writing more code/i)
    ).toBeInTheDocument();

    expect(screen.getByText('Does this functionality already exist?')).toBeInTheDocument();
    expect(screen.getByText('Can existing code be reused?')).toBeInTheDocument();
    expect(screen.getByText('Can the platform or standard library solve it?')).toBeInTheDocument();
    expect(screen.getByText('Is a new dependency really necessary?')).toBeInTheDocument();
    expect(screen.getByText('What is the smallest correct implementation?')).toBeInTheDocument();
  });

  it('renders the 6-stage integration pipeline', () => {
    render(<PonytailPage />);

    expect(screen.getByText('User Request')).toBeInTheDocument();
    expect(screen.getByText('Repository Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Existing Code / Reuse Analysis')).toBeInTheDocument();
    expect(screen.getByText('Security & Architecture Analysis')).toBeInTheDocument();
    expect(screen.getByText('Ponytail Minimality Reasoning')).toBeInTheDocument();
    expect(screen.getByText('Grounded Recommendation')).toBeInTheDocument();
  });

  it('renders the 4 value pillars without fake claims or metrics', () => {
    render(<PonytailPage />);

    expect(screen.getByText('AVOID DUPLICATION')).toBeInTheDocument();
    expect(screen.getByText('SMALLER CHANGES')).toBeInTheDocument();
    expect(screen.getByText('FEWER UNNECESSARY DEPENDENCIES')).toBeInTheDocument();
    expect(screen.getByText('ENGINEERING FOCUS')).toBeInTheDocument();
  });

  it('renders the non-negotiable security principle', () => {
    render(<PonytailPage />);

    expect(screen.getByText(/Security Principle:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/be used to justify removing security controls, input validation/i)
    ).toBeInTheDocument();
  });

  it('renders official attribution and status card with external repository link', () => {
    render(<PonytailPage />);

    expect(screen.getAllByText(/Dietrich Gebert/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/MIT License/i)).toBeInTheDocument();
    expect(screen.getByText('COMING SOON')).toBeInTheDocument();
    expect(screen.getByText(/Planned Integration \(UI Preview\)/i)).toBeInTheDocument();

    const repoLink = screen.getByRole('link', { name: /Visit official Ponytail GitHub repository/i });
    expect(repoLink).toBeInTheDocument();
    expect(repoLink).toHaveAttribute('href', 'https://github.com/DietrichGebert/ponytail');
    expect(repoLink).toHaveAttribute('target', '_blank');
    expect(repoLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
