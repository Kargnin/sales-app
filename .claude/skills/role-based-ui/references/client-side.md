# Client-Side Role-Based UI Architecture

This reference provides technical design patterns for building highly reusable, adaptive, and performance-optimized client-side components using React, Vite, and Capacitor.

---

## 1. Decoupling Business Logic from UI (Headless & Hooks Pattern)

To allow rapid UI style experimentation (e.g., swapping a classic Tailwind layout for a modern glassmorphism or neumorphic look) without touching business or state logic, you **must** separate components into two distinct layers:
1. **The Headless Controller Layer (Custom Hooks)**: Handles data fetching, client state, analytics tracking, event handlers, and input validation.
2. **The Presentation View Layer (Visual Components)**: Pure UI elements that accept structured props, render JSX/styles, and emit clean callback events.

### Example: Decoupled Order Management Card

#### 1. The Headless Hook (`useOrderCard.ts`)
```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '@/api/orders';
import { useAppStore } from '@/stores/appStore';

export function useOrderCard(orderId: string) {
  const queryClient = useQueryClient();
  const currentUser = useAppStore((state) => state.currentUser);

  const approveMutation = useMutation({
    mutationFn: () => ordersApi.approve(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // Calculate permissions based on role
  const canApprove = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  const isPending = approveMutation.isPending;

  return {
    canApprove,
    isPending,
    approveOrder: approveMutation.mutate,
  };
}
```

#### 2. The Pure Presenter Component (`OrderCard.tsx`)
```tsx
import React from 'react';
import { useOrderCard } from '@/hooks/useOrderCard';

interface OrderCardProps {
  id: string;
  customerName: string;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export const OrderCard: React.FC<OrderCardProps> = ({ id, customerName, totalAmount, status }) => {
  // Bind the headless logic layer
  const { canApprove, isPending, approveOrder } = useOrderCard(id);

  return (
    <div className="p-6 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-slate-800 font-bold text-lg">{customerName}</h3>
          <p className="text-slate-400 text-sm">Order ID: #{id}</p>
        </div>
        <span className="text-xl font-extrabold text-indigo-600">${totalAmount.toLocaleString()}</span>
      </div>

      <div className="flex gap-2 justify-between items-center mt-2 border-t border-slate-50 pt-4">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
        }`}>
          {status}
        </span>

        {/* Role-adaptive rendering, clean and separated */}
        {canApprove && status === 'PENDING' && (
          <button
            onClick={() => approveOrder()}
            disabled={isPending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-sm font-semibold transition"
          >
            {isPending ? 'Approving...' : 'Approve'}
          </button>
        )}
      </div>
    </div>
  );
};
```

---

## 2. Low-Level React + Vite + Capacitor Design Principles

Capacitor packages standard web code into native shells. The primary bottleneck is **frame rates (INP)** and the feeling of a "packaged website" rather than a native app. Keep your web apps highly optimized:

### A. Offline-First Caching (State Separation)
Mobile connections are unreliable. Separate your state into three distinct buckets:
- **Local Ephemeral State**: React `useState` / `useRef` for UI interactions (e.g., current active tab, input values).
- **Global Application State**: Zustand or Redux for settings, session tokens, and layout configs.
- **Server Cache & Offline Store**: TanStack Query + local persistence.

#### Offline Queue & Synchronization Pattern
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Network } from '@capacitor/network';
import { addOfflineMutation } from '@/utils/offlineQueue';

export function useOfflineMutation(mutationKey: string, mutationFn: (data: any) => Promise<any>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: any) => {
      const status = await Network.getStatus();
      if (!status.connected) {
        // Queue data in local IndexedDB to play back when network is restored
        await addOfflineMutation(mutationKey, variables);
        return { isOffline: true };
      }
      return mutationFn(variables);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [mutationKey] });
    }
  });
}
```

### B. Adaptive Platform Layouts (Cupertino vs. Material)
Users expect an iOS-like experience on iPhones (smooth springy scrolls, Cupertino widgets, navigation swipes) and a Material design on Android.
- Detect the current Capacitor platform using `Capacitor.getPlatform()`.
- Dynamically load styles or switch specific component skeletons.

```tsx
import { Capacitor } from '@capacitor/core';
import React from 'react';

interface PlatformAdaptiveProps {
  iosComponent: React.ReactNode;
  androidComponent: React.ReactNode;
  webComponent?: React.ReactNode;
}

export const PlatformAdaptive: React.FC<PlatformAdaptiveProps> = ({
  iosComponent,
  androidComponent,
  webComponent,
}) => {
  const platform = Capacitor.getPlatform();

  if (platform === 'ios') return <>{iosComponent}</>;
  if (platform === 'android') return <>{androidComponent}</>;
  return <>{webComponent || androidComponent}</>;
};
```

### C. Performance Optimizations
- **CSS Transitions**: Never animate `width`, `height`, `top`, or `left`. **Always** use GPU-accelerated properties: `transform` (translate3d, scale) and `opacity`.
- **Keyboard Resizing**: When inputs focus, Capacitor's Android native keyboard pushes the viewport up, which can warp flexboxes. Configure `"resize": "body"` or `"resize": "none"` in your `capacitor.config.json` Keyboard plugin settings to handle overlap via pure styling or overlay scroll inputs.

---

## 3. Reusable UI Components for Role UX

Keep access checks clean and standardized. Do not scatter manual role logic throughout visual JSX trees.

### A. The `<Restricted>` Wrapper
A standardized HOC/Wrapper to gracefully hide features that require granular permissions.

```tsx
import React from 'react';
import { useAppStore } from '@/stores/appStore';

interface RestrictedProps {
  to: string; // The specific permission string, e.g., 'orders:create'
  fallback?: React.ReactNode; // Optional unauthorized placeholder
  children: React.ReactNode;
}

export const Restricted: React.FC<RestrictedProps> = ({ to, fallback = null, children }) => {
  const currentUser = useAppStore((state) => state.currentUser);
  
  // Resolve role permissions (e.g. from appStore)
  const permissions = currentUser?.permissions || [];
  const hasPermission = permissions.includes(to) || permissions.includes('*');

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
```

### B. Protected Client-Side Routes
Use layout route guards inside your routing system (e.g., `react-router-dom`) to isolate views safely.

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';

interface ProtectedRouteProps {
  requiredPermission: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermission }) => {
  const { currentUser, isInitialized } = useAppStore();

  if (!isInitialized) {
    return <div className="flex h-screen items-center justify-center">Loading session...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const permissions = currentUser.permissions || [];
  const isAuthorized = permissions.includes(requiredPermission) || permissions.includes('*');

  if (!isAuthorized) {
    return <Navigate to="/403-unauthorized" replace />;
  }

  return <Outlet />;
};
```
