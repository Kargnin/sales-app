import { create } from "zustand";
import { storage } from "../lib/storage";
import { apiClient } from "../lib/apiClient";
import { queryClient } from "../lib/queryClient";
import type { User } from "../types";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (
    businessName: string,
    username: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<void>;
  registerSalesman: (
    token: string,
    username: string,
    password: string,
    email: string,
    phone: string,
  ) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username: string, password: string) => {
    const data = await apiClient<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>("/auth/login", {
      method: "POST",
      body: { username, password },
    });

    await storage.setItem("accessToken", data.accessToken);
    await storage.setItem("refreshToken", data.refreshToken);

    set({
      token: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      isAuthenticated: true,
    });
  },

  register: async (
    businessName: string,
    username: string,
    email: string,
    phone: string,
    password: string,
  ) => {
    const data = await apiClient<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>("/auth/register", {
      method: "POST",
      body: { businessName, username, email, phone, password },
    });

    await storage.setItem("accessToken", data.accessToken);
    await storage.setItem("refreshToken", data.refreshToken);

    set({
      token: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      isAuthenticated: true,
    });
  },

  registerSalesman: async (
    token: string,
    username: string,
    password: string,
    email: string,
    phone: string,
  ) => {
    const data = await apiClient<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>("/auth/register-salesman", {
      method: "POST",
      body: { token, username, password, email, phone },
    });

    await storage.setItem("accessToken", data.accessToken);
    await storage.setItem("refreshToken", data.refreshToken);

    set({
      token: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      isAuthenticated: true,
    });
  },

  resetPassword: async (email: string) => {
    await apiClient("/auth/reset-password", {
      method: "POST",
      body: { email },
    });
  },

  logout: async () => {
    // Best-effort server-side revocation: bump tokenVersion so the whole
    // token family dies server-side. Never fail or hang the UI on network issues.
    try {
      const refreshToken = await storage.getItem("refreshToken");
      if (refreshToken) {
        await apiClient("/auth/logout", {
          method: "POST",
          body: { refreshToken },
        });
      }
    } catch {
      // Ignore — local logout must still proceed offline.
    }

    await storage.deleteItem("accessToken");
    await storage.deleteItem("refreshToken");

    // Clear react-query cache: with staleTime 5min it would otherwise retain
    // the previous user's shops/products/orders/visits and the next account
    // on this device would render the prior tenant's data instantly.
    queryClient.clear();

    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },

  hydrate: async () => {
    try {
      const token = await storage.getItem("accessToken");
      const refreshToken = await storage.getItem("refreshToken");

      if (token) {
        const user = await apiClient<User>("/api/users/me");
        set({
          token,
          refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await storage.deleteItem("accessToken");
      await storage.deleteItem("refreshToken");
      set({ isLoading: false });
    }
  },
}));
