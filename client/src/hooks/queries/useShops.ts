import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { Shop } from "../../types";

export function useShops() {
  return useQuery({
    queryKey: ["shops"],
    queryFn: () => apiClient<Shop[]>("/api/shops"),
  });
}

export function useShop(id?: string) {
  return useQuery({
    queryKey: ["shops", id],
    queryFn: () => apiClient<Shop>(`/api/shops/${id}`),
    enabled: Boolean(id),
  });
}
