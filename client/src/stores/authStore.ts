import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import type { User, UserRole } from '@sales-app/shared';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: Omit<User, 'passwordHash'> | null;
  isAuthenticated: boolean;

  login: (token: string, refreshToken: string, user: Omit<User, 'passwordHash'>) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isSalesman: () => boolean;
  hasRole: (role: UserRole) => boolean;
  updateUser: (updatedFields: Partial<Omit<User, 'passwordHash'>>) => void;
}

// Hardware-secured native storage adapter with browser localStorage fallback
const secureNativeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      try {
        const pkg = '@capacitor-community/secure-storage';
        const { SecureStoragePlugin } = await import(/* @vite-ignore */ pkg);
        const { value } = await SecureStoragePlugin.get({ key: name });
        return value;
      } catch (e) {
        console.warn('Native secure storage read failed. Falling back to localStorage.', e);
      }
    }
    return localStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      try {
        const pkg = '@capacitor-community/secure-storage';
        const { SecureStoragePlugin } = await import(/* @vite-ignore */ pkg);
        await SecureStoragePlugin.set({ key: name, value });
        return;
      } catch (e) {
        console.warn('Native secure storage write failed. Falling back to localStorage.', e);
      }
    }
    localStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      try {
        const pkg = '@capacitor-community/secure-storage';
        const { SecureStoragePlugin } = await import(/* @vite-ignore */ pkg);
        await SecureStoragePlugin.remove({ key: name });
        return;
      } catch (e) {
        console.warn('Native secure storage delete failed. Falling back to localStorage.', e);
      }
    }
    localStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      login: (token, refreshToken, user) =>
        set({ token, refreshToken, user, isAuthenticated: true }),

      logout: () =>
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false }),

      isAdmin: () => get().user?.role === 'admin',
      isSalesman: () => get().user?.role === 'salesman',
      hasRole: (role) => get().user?.role === role,
      updateUser: (updatedFields) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedFields } : null,
        })),
    }),
    {
      name: 'sales-app-auth',
      storage: createJSONStorage(() => secureNativeStorage),
    }
  )
);
