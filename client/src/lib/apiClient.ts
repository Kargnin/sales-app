import { storage } from "./storage";
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
  const token = await storage.getItem("accessToken");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(config.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...config,
      headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
    });
  } catch (error: unknown) {
    console.error(`[apiClient] Network request failed for ${url}:`, error);
    throw new Error("Unable to connect to the server. Please verify that the backend is running and your device is on the same network.");
  }

  if (response.status === 401 && !config._retry) {
    const endpointLower = endpoint.toLowerCase();
    const isAuthEndpoint = endpointLower.startsWith("/auth/refresh") || endpointLower.startsWith("/auth/login");

    if (isAuthEndpoint) {
      await storage.deleteItem("accessToken");
      await storage.deleteItem("refreshToken");
      throw new Error("Unauthorized");
    }

    const refreshToken = await storage.getItem("refreshToken");
    if (!refreshToken) {
      await storage.deleteItem("accessToken");
      throw new Error("Unauthorized");
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        return apiClient<T>(endpoint, { ...config, _retry: true });
      });
    }

    isRefreshing = true;

    try {
      let refreshResponse: Response;
      try {
        refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error: unknown) {
        console.error("[apiClient] Network request failed for token refresh:", error);
        throw new Error("Unable to connect to the server. Please verify that the backend is running.");
      }

      if (!refreshResponse.ok) throw new Error("Refresh failed");

      const data = await refreshResponse.json();
      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken || refreshToken;

      await storage.setItem("accessToken", newAccessToken);
      await storage.setItem("refreshToken", newRefreshToken);

      isRefreshing = false;
      processQueue(null, newAccessToken);

      return apiClient<T>(endpoint, { ...config, _retry: true });
    } catch (refreshError) {
      isRefreshing = false;
      processQueue(refreshError, null);
      await storage.deleteItem("accessToken");
      await storage.deleteItem("refreshToken");
      throw refreshError;
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
