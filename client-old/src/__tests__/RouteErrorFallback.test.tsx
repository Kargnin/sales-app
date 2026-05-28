import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouteErrorFallback } from '../components/ui/RouteErrorFallback.js';

// Mock react-router hook useRouteError
const mockUseRouteError = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useRouteError: () => mockUseRouteError(),
    isRouteErrorResponse: (error: any) => error && typeof error.status === 'number',
  };
});

describe('RouteErrorFallback Component', () => {
  it('renders standard Error instance details correctly', () => {
    mockUseRouteError.mockReturnValue(new Error('Syntax Error: unexpected token in sales chart'));

    render(<RouteErrorFallback />);

    expect(screen.getByText('Application Crash Guard')).toBeInTheDocument();
    expect(screen.getByText('Syntax Error: unexpected token in sales chart')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go Back/i })).toBeInTheDocument();
  });

  it('renders route error responses correctly with status code badges', () => {
    mockUseRouteError.mockReturnValue({
      status: 404,
      statusText: 'Not Found',
      data: { message: 'Database query returned empty result for order lookup' },
    });

    render(<RouteErrorFallback />);

    expect(screen.getByText('Application Crash Guard')).toBeInTheDocument();
    expect(screen.getByText('Error Status Code: 404')).toBeInTheDocument();
    expect(screen.getByText('Database query returned empty result for order lookup')).toBeInTheDocument();
  });
});
