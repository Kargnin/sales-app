import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { SidebarLayout } from '../components/layout/SidebarLayout.js';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockUser = {
  id: 'user-1',
  username: 'test_user',
  tenantId: 'tenant-1',
  tenantName: 'Soap Corp',
  role: 'admin',
};

vi.mock('../stores/authStore.js', () => ({
  useAuthStore: Object.assign(
    () => ({
      user: mockUser,
      logout: vi.fn(),
    }),
    {
      getState: () => ({ user: mockUser }),
    }
  ),
}));

vi.mock('../../stores/authStore.js', () => ({
  useAuthStore: Object.assign(
    () => ({
      user: mockUser,
      logout: vi.fn(),
    }),
    {
      getState: () => ({ user: mockUser }),
    }
  ),
}));

// A test helper component to inspect the current route pathname and search parameters
const LocationInspector: React.FC = () => {
  const location = useLocation();
  return (
    <div data-testid="current-path-info">
      {location.pathname}{location.search}
    </div>
  );
};

describe('SidebarLayout State & Navigation TDD Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Admin Role - Side Panel Highlights', () => {
    beforeEach(() => {
      mockUser.role = 'admin';
    });

    it('highlights Roster tab by default on admin main dashboard route', () => {
      render(
        <MemoryRouter initialEntries={['/admin']}>
          <SidebarLayout>
            <div>Dashboard Content</div>
          </SidebarLayout>
        </MemoryRouter>
      );
      
      const rosterBtn = screen.getAllByRole('button', { name: /Roster/i })[0];
      expect(rosterBtn.className).toContain('bg-emerald-500'); // active style
    });

    it('highlights Approvals tab on admin dashboard with tab=shops', () => {
      render(
        <MemoryRouter initialEntries={['/admin?tab=shops']}>
          <SidebarLayout>
            <div>Dashboard Content</div>
          </SidebarLayout>
        </MemoryRouter>
      );
      
      const approvalsBtn = screen.getAllByRole('button', { name: /Approvals/i })[0];
      expect(approvalsBtn.className).toContain('bg-emerald-500');
    });

    it('highlights Approvals tab when on sub-route shop details page', () => {
      render(
        <MemoryRouter initialEntries={['/shop/some-shop-uuid']}>
          <SidebarLayout>
            <div>Shop Details Content</div>
          </SidebarLayout>
        </MemoryRouter>
      );
      
      const approvalsBtn = screen.getAllByRole('button', { name: /Approvals/i })[0];
      expect(approvalsBtn.className).toContain('bg-emerald-500');
    });

    it('highlights Orders tab when on sub-route order details page', () => {
      render(
        <MemoryRouter initialEntries={['/order/some-order-uuid']}>
          <SidebarLayout>
            <div>Order Details Content</div>
          </SidebarLayout>
        </MemoryRouter>
      );
      
      const ordersBtn = screen.getAllByRole('button', { name: /Orders/i })[0];
      expect(ordersBtn.className).toContain('bg-emerald-500');
    });

    it('highlights Roster tab when on sub-route employee details page', () => {
      render(
        <MemoryRouter initialEntries={['/admin/employee/some-emp-uuid']}>
          <SidebarLayout>
            <div>Employee Details Content</div>
          </SidebarLayout>
        </MemoryRouter>
      );
      
      const rosterBtn = screen.getAllByRole('button', { name: /Roster/i })[0];
      expect(rosterBtn.className).toContain('bg-emerald-500');
    });
  });

  describe('Salesman Role - Side Panel Highlights', () => {
    beforeEach(() => {
      mockUser.role = 'salesman';
    });

    it('highlights Outlets tab by default on salesman dashboard', () => {
      render(
        <MemoryRouter initialEntries={['/salesman']}>
          <SidebarLayout>
            <div>Dashboard Content</div>
          </SidebarLayout>
        </MemoryRouter>
      );
      
      const outletsBtn = screen.getAllByRole('button', { name: /Outlets/i })[0];
      expect(outletsBtn.className).toContain('bg-emerald-500');
    });

    it('highlights Orders tab on salesman dashboard with tab=orders', () => {
      render(
        <MemoryRouter initialEntries={['/salesman?tab=orders']}>
          <SidebarLayout>
            <div>Dashboard Content</div>
          </SidebarLayout>
        </MemoryRouter>
      );
      
      const ordersBtn = screen.getAllByRole('button', { name: /Orders/i })[0];
      expect(ordersBtn.className).toContain('bg-emerald-500');
    });

    it('highlights Outlets tab when on sub-route shop details page', () => {
      render(
        <MemoryRouter initialEntries={['/shop/some-shop-uuid']}>
          <SidebarLayout>
            <div>Shop Details Content</div>
          </SidebarLayout>
        </MemoryRouter>
      );
      
      const outletsBtn = screen.getAllByRole('button', { name: /Outlets/i })[0];
      expect(outletsBtn.className).toContain('bg-emerald-500');
    });

    it('highlights Orders tab when on sub-route order details page', () => {
      render(
        <MemoryRouter initialEntries={['/order/some-order-uuid']}>
          <SidebarLayout>
            <div>Order Details Content</div>
          </SidebarLayout>
        </MemoryRouter>
      );
      
      const ordersBtn = screen.getAllByRole('button', { name: /Orders/i })[0];
      expect(ordersBtn.className).toContain('bg-emerald-500');
    });

    it('highlights Visits tab on salesman dashboard with tab=visits', () => {
      render(
        <MemoryRouter initialEntries={['/salesman?tab=visits']}>
          <SidebarLayout>
            <div>Dashboard Content</div>
          </SidebarLayout>
        </MemoryRouter>
      );
      
      const visitsBtn = screen.getAllByRole('button', { name: /Visits/i })[0];
      expect(visitsBtn.className).toContain('bg-emerald-500');
    });
  });

  describe('Navigation Functionality from Sub-routes', () => {
    it('redirects Admin from /shop/:id to /admin?tab=orders when clicking Orders tab', () => {
      mockUser.role = 'admin';
      render(
        <MemoryRouter initialEntries={['/shop/some-shop-uuid']}>
          <SidebarLayout>
            <div>Shop Details Content</div>
          </SidebarLayout>
        </MemoryRouter>
      );

      const ordersBtn = screen.getAllByRole('button', { name: /Orders/i })[0];
      fireEvent.click(ordersBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/admin?tab=orders');
    });

    it('redirects Salesman from /shop/:id to /salesman?tab=orders when clicking Orders tab', () => {
      mockUser.role = 'salesman';
      render(
        <MemoryRouter initialEntries={['/shop/some-shop-uuid']}>
          <SidebarLayout>
            <div>Shop Details Content</div>
          </SidebarLayout>
        </MemoryRouter>
      );

      const ordersBtn = screen.getAllByRole('button', { name: /Orders/i })[0];
      fireEvent.click(ordersBtn);

      expect(mockNavigate).toHaveBeenCalledWith('/salesman?tab=orders');
    });

    it('uses search parameters update if already on the main admin dashboard', () => {
      mockUser.role = 'admin';
      render(
        <MemoryRouter initialEntries={['/admin']}>
          <SidebarLayout>
            <LocationInspector />
          </SidebarLayout>
        </MemoryRouter>
      );

      const ordersBtn = screen.getAllByRole('button', { name: /Orders/i })[0];
      fireEvent.click(ordersBtn);

      // Verify that it handles tab changes nicely or uses navigate correctly
      expect(mockNavigate).toHaveBeenCalledWith('/admin?tab=orders');
    });
  });
});
