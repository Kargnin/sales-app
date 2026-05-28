import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { Order } from "../../types";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => apiClient<Order[]>("/orders"),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => apiClient<Order>(`/orders/${id}`),
    enabled: !!id,
  });
}
