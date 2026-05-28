import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 3,
      networkMode: 'offlineFirst',
    },
  },
});
