import axios from 'axios';
import { useAuthStore } from '../stores/authStore.js';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag to prevent multiple concurrent token refresh requests
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Handle 401 responses (token expired) - Auto Refresh Token Rotation
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if 401 error, we have a refresh token, and the request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      const authState = useAuthStore.getState();
      const refreshToken = authState.refreshToken;

      // Avoid infinite loop if refreshing fails or trying to login/refresh
      if (
        originalRequest.url === '/auth/refresh' ||
        originalRequest.url === '/auth/login' ||
        !refreshToken
      ) {
        authState.logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use a separate raw axios instance to bypass interceptors and avoid recursion
        const response = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update the Auth Store state using standard setState
        useAuthStore.setState({
          token: accessToken,
          refreshToken: newRefreshToken || refreshToken,
          isAuthenticated: true,
        });

        isRefreshing = false;
        processQueue(null, accessToken);

        // Retry the original request with the fresh token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        authState.logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
