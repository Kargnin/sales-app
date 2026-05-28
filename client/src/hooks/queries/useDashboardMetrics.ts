import { useQuery } from "@tanstack/react-query";
import { MOCK_DASHBOARD_METRICS } from "../../lib/mockData";
import type { DashboardMetrics } from "../../types";

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ["dashboard", "metrics"],
    queryFn: async () => {
      // TODO: Replace with apiClient<DashboardMetrics>("/dashboard/metrics") when endpoint exists
      return new Promise<DashboardMetrics>((resolve) => {
        setTimeout(() => resolve(MOCK_DASHBOARD_METRICS), 600);
      });
    },
  });
}
