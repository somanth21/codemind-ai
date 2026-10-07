import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { SidebarProvider } from '../context/SidebarContext';

describe('Sidebar Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all navigation items', () => {
    render(
      <BrowserRouter>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Repositories')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Analysis')).toBeInTheDocument();
    expect(screen.getByText('Reuse Advisor')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Architecture')).toBeInTheDocument();
    expect(screen.getByText('Grounded AI')).toBeInTheDocument();
    expect(screen.getByText('Ponytail')).toBeInTheDocument();
    expect(screen.getByText('UPCOMING')).toBeInTheDocument();

    expect(screen.getByText('CODEMIND AI')).toBeInTheDocument();
    expect(screen.getByText(/AI-powered engineering intelligence/i)).toBeInTheDocument();
  });

  it('toggles collapsed state on toggle button click and persists to localStorage', () => {
    render(
      <BrowserRouter>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </BrowserRouter>
    );

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).not.toHaveClass('collapsed');

    const toggleBtn = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(toggleBtn);

    expect(sidebar).toHaveClass('collapsed');
    expect(localStorage.getItem('codemind_sidebar_collapsed')).toBe('true');

    // Click again to expand
    const expandBtn = screen.getByRole('button', { name: /expand sidebar/i });
    fireEvent.click(expandBtn);

    expect(sidebar).not.toHaveClass('collapsed');
    expect(localStorage.getItem('codemind_sidebar_collapsed')).toBe('false');
  });
});
