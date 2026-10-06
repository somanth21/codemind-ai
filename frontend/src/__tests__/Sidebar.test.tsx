import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';

describe('Sidebar Component', () => {
  it('renders all 8 research pipeline navigation items', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Repositories')).toBeInTheDocument();
    expect(screen.getByText('Static Analysis')).toBeInTheDocument();
    expect(screen.getByText('Hybrid Search')).toBeInTheDocument();
    expect(screen.getByText('Reuse Advisor')).toBeInTheDocument();
    expect(screen.getByText('Security Analysis')).toBeInTheDocument();
    expect(screen.getByText('Architecture')).toBeInTheDocument();
    expect(screen.getByText('Grounded AI')).toBeInTheDocument();

    expect(screen.getByText(/CodeMind Core v0.9.0/i)).toBeInTheDocument();
    expect(screen.getByText(/Deterministic Monolith/i)).toBeInTheDocument();
  });
});
