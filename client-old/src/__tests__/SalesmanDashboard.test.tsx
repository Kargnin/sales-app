import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SalesmanDashboard } from '../pages/salesman/SalesmanDashboard.js';
import { useAppStore } from '../stores/appStore.js';
import { apiClient } from '../api/client.js';
import { toast } from 'sonner';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Sonner toasts
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock Geolocation browser API
const mockGeolocation = {
  getCurrentPosition: vi.fn().mockImplementation((success) =>
    success({
      coords: {
        latitude: 18.9750,
        longitude: 72.8258,
        accuracy: 15,
      },
    } as any)
  ),
};
vi.stubGlobal('navigator', {
  geolocation: mockGeolocation,
});

// Mock stores
const mockUser = {
  id: 'salesman-1',
  username: 'salesman_test',
  tenantId: 'tenant-1',
  tenantName: 'Soap Corp',
  role: 'salesman',
};

const mockShops = [
  {
    id: 'shop-far',
    name: 'Far Shop',
    ownerName: 'Owner Far',
    phone: '1234567890',
    latitude: '20.0000',
    longitude: '75.0000',
    status: 'approved',
  },
  {
    id: 'shop-near',
    name: 'Near Shop',
    ownerName: 'Owner Near',
    phone: '0987654321',
    latitude: '18.9751',
    longitude: '72.8259',
    status: 'approved',
  },
];

// Mock both relative formats to guarantee Vitest matches the module import
vi.mock('../stores/authStore.js', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}));
vi.mock('../../stores/authStore.js', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}));
// rely on global drawer, vaul, and apiClient mocks in setup.ts

// rely on global drawer and vaul mocks in setup.ts

describe('Salesman Dashboard Check-In Failing Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    useAppStore.setState({
      shops: mockShops as any,
      products: [],
      isLoadingShops: false,
    });
  });

  it('renders salesman dashboard with sorted approved outlets and action buttons', () => {
    render(
      <MemoryRouter initialEntries={['/salesman?tab=shops']}>
        <SalesmanDashboard />
      </MemoryRouter>
    );

    // Verify view has shop cards
    expect(screen.getByText('Far Shop')).toBeInTheDocument();
    expect(screen.getByText('Near Shop')).toBeInTheDocument();
    
    // Verify action buttons exist
    const checkinButtons = screen.getAllByRole('button', { name: 'Check-in' });
    const orderButtons = screen.getAllByRole('button', { name: 'Order' });
    
    expect(checkinButtons.length).toBe(2);
    expect(orderButtons.length).toBe(2);
  });

  it('shows GPS coordinates lock failure as a verbose inline error block inside the UI', async () => {
    // Simulate GPS geolocator error during the check-in call
    vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementation((success, error) => {
      if (error) {
        error({
          code: 1,
          message: 'User denied Geolocation',
        } as any);
      }
    });

    render(
      <MemoryRouter initialEntries={['/salesman?tab=shops']}>
        <SalesmanDashboard />
      </MemoryRouter>
    );

    const checkinLink = screen.getAllByRole('button', { name: 'Check-in' })[0];
    expect(checkinLink).not.toBeDisabled();
    fireEvent.click(checkinLink);

    // Now clicking Check In on the checkin view tab
    const checkinSubmitButton = await screen.findByRole('button', { name: 'Check In (Real GPS)' });
    fireEvent.click(checkinSubmitButton);

    await waitFor(() => {
      expect(screen.getByText(/Check-in Validation Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/GPS coords lock failed: User denied Geolocation/i)).toBeInTheDocument();
    });

    expect(toast.error).toHaveBeenCalledWith('GPS coords lock failed: User denied Geolocation');
  });

  it('formats and displays a nested Zod validation error block cleanly in the UI alert', async () => {
    // Simulate Zod check-in validation error response from server
    const mockZodError = {
      response: {
        status: 400,
        data: {
          error: 'Validation failed',
          details: {
            latitude: {
              _errors: ['Number must be greater than or equal to -90'],
            },
            longitude: {
              _errors: ['Number must be less than or equal to 180'],
            },
          },
        },
      },
    };
    vi.mocked(apiClient.post).mockRejectedValueOnce(mockZodError);

    // Setup Geolocator success for this specific test
    vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementation((success) =>
      success({
        coords: {
          latitude: 18.9750,
          longitude: 72.8258,
          accuracy: 15,
        },
      } as any)
    );

    render(
      <MemoryRouter initialEntries={['/salesman?tab=shops']}>
        <SalesmanDashboard />
      </MemoryRouter>
    );

    const checkinLink = screen.getAllByRole('button', { name: 'Check-in' })[0];
    fireEvent.click(checkinLink);

    const checkinSubmitButton = await screen.findByRole('button', { name: 'Check In (Real GPS)' });
    fireEvent.click(checkinSubmitButton);

    await waitFor(() => {
      expect(screen.getByText(/Check-in Validation Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Latitude: Number must be greater than or equal to -90/i)).toBeInTheDocument();
      expect(screen.getByText(/Longitude: Number must be less than or equal to 180/i)).toBeInTheDocument();
    });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Validation failed:\n- Latitude: Number must be greater than or equal to -90'));
  });

  it('toggles starred favorites on shop card and applies starred filter correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/salesman?tab=shops']}>
        <SalesmanDashboard />
      </MemoryRouter>
    );

    // Verify Starred button exists
    const starButtons = screen.getAllByRole('button', { name: /Star Outlet/i });
    expect(starButtons.length).toBe(2);

    // Find the specific card for Far Shop and click its Star button to ensure we toggle Far Shop
    const farShopCard = screen.getByText('Far Shop').closest('.group');
    expect(farShopCard).toBeInTheDocument();
    const starButton = within(farShopCard as HTMLElement).getByRole('button', { name: /Star Outlet/i });
    fireEvent.click(starButton);
    expect(toast.success).toHaveBeenCalledWith('Outlet added to starred list! 🌟');

    // Click on the Starred tab button to apply filter
    const starredTab = screen.getByRole('button', { name: /Starred \(1\)/i });
    fireEvent.click(starredTab);

    // Verify that only the starred shop (Far Shop) is shown in list, and Near Shop is hidden
    expect(screen.getByText('Far Shop')).toBeInTheDocument();
    expect(screen.queryByText('Near Shop')).not.toBeInTheDocument();

    // Untoggle star on the shop
    fireEvent.click(starButton);
    expect(toast.success).toHaveBeenCalledWith('Outlet removed from starred list');
  });

  it('routes to shop details page when clicking on the shop card', async () => {
    render(
      <MemoryRouter initialEntries={['/salesman?tab=shops']}>
        <SalesmanDashboard />
      </MemoryRouter>
    );

    // Click on the title "Far Shop" to trigger card navigation
    const shopCardTitle = screen.getByText('Far Shop');
    fireEvent.click(shopCardTitle);

    // Assert navigate was called with correct shop details url
    expect(mockNavigate).toHaveBeenCalledWith('/shop/shop-far');
  });

  it('maintains strict proximity sorting order on the All Outlets tab regardless of star status', () => {
    render(
      <MemoryRouter initialEntries={['/salesman?tab=shops']}>
        <SalesmanDashboard />
      </MemoryRouter>
    );

    // Default order should be Near Shop first, then Far Shop (proximity sorting)
    let shopTitles = screen.getAllByRole('heading', { level: 3 }).map(el => el.textContent);
    expect(shopTitles[0]).toBe('Near Shop');
    expect(shopTitles[1]).toBe('Far Shop');

    // Star the Far Shop
    const farShopCard = screen.getByText('Far Shop').closest('.group');
    const starButton = within(farShopCard as HTMLElement).getByRole('button', { name: /Star Outlet/i });
    fireEvent.click(starButton);

    // Under the correct fix, Far Shop's position should NOT jump to the top.
    // It should remain at index 1 (Near Shop first, Far Shop second)
    shopTitles = screen.getAllByRole('heading', { level: 3 }).map(el => el.textContent);
    expect(shopTitles[0]).toBe('Near Shop');
    expect(shopTitles[1]).toBe('Far Shop');
  });
});
