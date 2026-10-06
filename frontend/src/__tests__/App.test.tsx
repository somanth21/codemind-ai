import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('CodeMind AI - App Shell Component', () => {
  it('renders application and displays CodeMind AI branding', () => {
    render(<App />);
    expect(screen.getAllByText(/CodeMind AI/i).length).toBeGreaterThan(0);
  });
});
