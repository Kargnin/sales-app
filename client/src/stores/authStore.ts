import { create } from "zustand";
import { storage } from "../lib/storage";
import { apiClient } from "../lib/apiClient";
import type { User } from "../types";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
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

  logout: async () => {
    await storage.deleteItem("accessToken");
    await storage.deleteItem("refreshToken");
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
        set({ token, refreshToken, user, isAuthenticated: true, isLoading: false });
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
