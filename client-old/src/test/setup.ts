import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

// Fix JSDOM AbortSignal / AbortController mismatch with native Node.js Request and fetch constructors
if (typeof window !== 'undefined') {
  try {
    const NativeRequest = globalThis.Request || window.Request;
    if (NativeRequest) {
      const WrappedRequest = class Request extends NativeRequest {
        constructor(input: any, init?: any) {
          let newInit = init;
          if (init && init.signal) {
            // Clone configuration to bypass frozen or read-only constraints in React Router
            newInit = { ...init };
            delete newInit.signal;
          }
          super(input, newInit);
        }
      };
      globalThis.Request = WrappedRequest as any;
      window.Request = WrappedRequest as any;
    }

    const nativeFetch = globalThis.fetch || window.fetch;
    if (nativeFetch) {
      const wrappedFetch = function fetch(input: any, init?: any) {
        let newInit = init;
        if (init && init.signal) {
          // Clone configuration to bypass frozen or read-only constraints in React Router
          newInit = { ...init };
          delete newInit.signal;
        }
        return nativeFetch(input, newInit);
      };
      globalThis.fetch = wrappedFetch as any;
      window.fetch = wrappedFetch as any;
    }
  } catch (e) {
    console.warn('Failed to setup resilient AbortSignal wrappers:', e);
  }
}

vi.mock('vaul', () => {
  const React = require('react');
  return {
    Drawer: {
      Root: ({ children, open }: any) => open ? React.createElement('div', { 'data-testid': 'drawer-root' }, children) : null,
      Trigger: ({ children }: any) => React.createElement(React.Fragment, null, children),
      Portal: ({ children }: any) => React.createElement('div', { 'data-testid': 'drawer-portal' }, children),
      Close: ({ children }: any) => React.createElement(React.Fragment, null, children),
      Overlay: ({ children }: any) => React.createElement('div', null, children),
      Content: ({ children }: any) => React.createElement('div', { 'data-testid': 'drawer-content' }, children),
      Title: ({ children }: any) => React.createElement('h2', null, children),
      Description: ({ children }: any) => React.createElement('p', null, children),
    }
  };
});

// Also mock components/ui/drawer using absolute path resolution to guarantee it is mocked when resolving via aliases
const absoluteDrawerPath = vi.hoisted(() => {
  const path = require('path');
  return path.resolve(__dirname, '../components/ui/drawer');
});
vi.mock(absoluteDrawerPath, () => ({
  Drawer: ({ children, open }: any) => {
    console.log('--- absoluteDrawerPath Drawer Mock Render ---', { open });
    return open ? React.createElement('div', { 'data-testid': 'drawer-root' }, children) : null;
  },
  DrawerContent: ({ children }: any) => React.createElement('div', { 'data-testid': 'drawer-content' }, children),
  DrawerHeader: ({ children }: any) => React.createElement('div', null, children),
  DrawerTitle: ({ children }: any) => React.createElement('div', null, children),
  DrawerTrigger: ({ children }: any) => React.createElement(React.Fragment, null, children),
  DrawerClose: ({ children }: any) => React.createElement(React.Fragment, null, children),
  DrawerFooter: ({ children }: any) => React.createElement('div', null, children),
  DrawerDescription: ({ children }: any) => React.createElement('p', null, children),
  DrawerPortal: ({ children }: any) => React.createElement('div', null, children),
  DrawerOverlay: ({ children }: any) => React.createElement('div', null, children),
}));

const absoluteDrawerPathTsx = vi.hoisted(() => {
  const path = require('path');
  return path.resolve(__dirname, '../components/ui/drawer.tsx');
});
vi.mock(absoluteDrawerPathTsx, () => ({
  Drawer: ({ children, open }: any) => {
    console.log('--- absoluteDrawerPathTsx Drawer Mock Render ---', { open });
    return open ? React.createElement('div', { 'data-testid': 'drawer-root' }, children) : null;
  },
  DrawerContent: ({ children }: any) => React.createElement('div', { 'data-testid': 'drawer-content' }, children),
  DrawerHeader: ({ children }: any) => React.createElement('div', null, children),
  DrawerTitle: ({ children }: any) => React.createElement('div', null, children),
  DrawerTrigger: ({ children }: any) => React.createElement(React.Fragment, null, children),
  DrawerClose: ({ children }: any) => React.createElement(React.Fragment, null, children),
  DrawerFooter: ({ children }: any) => React.createElement('div', null, children),
  DrawerDescription: ({ children }: any) => React.createElement('p', null, children),
  DrawerPortal: ({ children }: any) => React.createElement('div', null, children),
  DrawerOverlay: ({ children }: any) => React.createElement('div', null, children),
}));
const absoluteClientPath = vi.hoisted(() => {
  const path = require('path');
  return path.resolve(__dirname, '../api/client');
});

const absoluteClientPathJs = vi.hoisted(() => {
  const path = require('path');
  return path.resolve(__dirname, '../api/client.js');
});

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue({ data: [] }),
  post: vi.fn().mockResolvedValue({ data: {} }),
  put: vi.fn().mockResolvedValue({ data: {} }),
  patch: vi.fn().mockResolvedValue({ data: {} }),
  delete: vi.fn().mockResolvedValue({ data: {} }),
  create: vi.fn().mockReturnThis(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}));

vi.mock('../api/client.js', () => ({ apiClient: mockApiClient }));
vi.mock(absoluteClientPath, () => ({ apiClient: mockApiClient }));
vi.mock(absoluteClientPathJs, () => ({ apiClient: mockApiClient }));

// Define global in-memory stores for localStorage and sessionStorage
const localStorageStore: Record<string, string> = {};
const sessionStorageStore: Record<string, string> = {};

const createStorageMock = (store: Record<string, string>) => {
  const mock = {
    getItem: vi.fn((key: string) => (store[key] !== undefined ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      for (const k in store) {
        delete store[k];
      }
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    length: 0,
  };

  Object.defineProperty(mock, 'length', {
    configurable: true,
    get: () => Object.keys(store).length,
  });

  return mock;
};

const localStorageMock = createStorageMock(localStorageStore);
const sessionStorageMock = createStorageMock(sessionStorageStore);

// Mock on Window Prototype to override the non-configurable properties on window
if (typeof window !== 'undefined') {
  const WindowPrototype = Object.getPrototypeOf(window);
  if (WindowPrototype) {
    try {
      Object.defineProperty(WindowPrototype, 'localStorage', {
        get: () => localStorageMock,
        configurable: true,
      });
      Object.defineProperty(WindowPrototype, 'sessionStorage', {
        get: () => sessionStorageMock,
        configurable: true,
      });
    } catch (e) {
      console.warn('Failed to define storage on Window prototype:', e);
    }
  }

  // Also try to define them directly on window in case JSDOM allows it
  try {
    Object.defineProperty(window, 'localStorage', {
      get: () => localStorageMock,
      configurable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      get: () => sessionStorageMock,
      configurable: true,
    });
  } catch (e) {}
}

// Stub globals
try {
  vi.stubGlobal('localStorage', localStorageMock);
  vi.stubGlobal('sessionStorage', sessionStorageMock);
} catch (e) {}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

// Mock Zustand store hydration to be completed immediately in test environment
import { useAuthStore } from '../stores/authStore.js';
import { useAppStore } from '../stores/appStore.js';
if (useAuthStore?.persist) {
  useAuthStore.persist.hasHydrated = () => true;
}
if (useAppStore?.persist) {
  useAppStore.persist.hasHydrated = () => true;
}

