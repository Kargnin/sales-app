import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./constants";

interface RequestConfig extends Omit<RequestInit, "body"> {
  body?: unknown;
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

export async function apiClient<T = unknown>(
  endpoint: string,
  config: RequestConfig = {},
): Promise<T> {
  const token = await SecureStore.getItemAsync("accessToken");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(config.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...config,
    headers,
    body: config.body ? JSON.stringify(config.body) : undefined,
  });

  if (response.status === 401 && !config._retry) {
    const endpointLower = endpoint.toLowerCase();
    const isAuthEndpoint = endpointLower.startsWith("/auth/refresh") || endpointLower.startsWith("/auth/login");

    if (isAuthEndpoint) {
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
      throw new Error("Unauthorized");
    }

    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (!refreshToken) {
      await SecureStore.deleteItemAsync("accessToken");
      throw new Error("Unauthorized");
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        return apiClient<T>(endpoint, { ...config, _retry: true });
      });
    }

    isRefreshing = true;

    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshResponse.ok) throw new Error("Refresh failed");

      const data = await refreshResponse.json();
      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken || refreshToken;

      await SecureStore.setItemAsync("accessToken", newAccessToken);
      await SecureStore.setItemAsync("refreshToken", newRefreshToken);

      isRefreshing = false;
      processQueue(null, newAccessToken);

      return apiClient<T>(endpoint, { ...config, _retry: true });
    } catch (refreshError) {
      isRefreshing = false;
      processQueue(refreshError, null);
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
      throw refreshError;
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
