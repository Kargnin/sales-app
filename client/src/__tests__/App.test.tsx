import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App.js';

import { useAuthStore } from '../stores/authStore.js';
import { useOfflineStore } from '../stores/offlineStore.js';

import { createMemoryRouter, RouterProvider } from 'react-router';
import { AdminDashboard } from '../pages/admin/AdminDashboard.js';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('App Routing', () => {
  beforeEach(() => {
    // Reset state before each test
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
    });
    useOfflineStore.setState({
      isOnline: true,
    });
  });

  it('renders the SalesApp heading', async () => {
    render(<App />, { wrapper: createWrapper() });
    expect(await screen.findByText('SalesApp')).toBeInTheDocument();
  });

  it('redirects to login by default and shows sign in screen', async () => {
    render(<App />, { wrapper: createWrapper() });
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByText('Access the Sales App portal')).toBeInTheDocument();
  });

  it('renders AdminDashboard for authenticated admin user without useBlocker throwing', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'admin-1',
        username: 'admin_test',
        tenantId: 'tenant-1',
        tenantName: 'Soap Corp',
        role: 'admin',
        email: 'admin@soapco.com',
        phone: '9821034455',
        status: 'active',
        createdAt: new Date(),
      },
    });

    const router = createMemoryRouter(
      [
        {
          path: '/admin',
          element: <AdminDashboard />,
        },
      ],
      {
        initialEntries: ['/admin'],
      }
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );

    // Verify the AdminDashboard mounts successfully and renders its active online console header and cards
    expect(await screen.findByText('Console Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Total Employees')).toBeInTheDocument();
  });
});
