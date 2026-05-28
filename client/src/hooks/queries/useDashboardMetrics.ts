import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { DashboardMetrics } from "../../types";

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ["dashboard", "metrics"],
    queryFn: () => apiClient<DashboardMetrics>("/api/dashboard/metrics"),
  });
}
