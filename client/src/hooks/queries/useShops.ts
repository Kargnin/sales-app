import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { Shop } from "../../types";

export function useShops() {
  return useQuery({
    queryKey: ["shops"],
    queryFn: () => apiClient<Shop[]>("/shops"),
  });
}
