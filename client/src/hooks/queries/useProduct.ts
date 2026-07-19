import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { Product } from "../../types";

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => apiClient<Product>(`/api/products/${id}`),
    enabled: !!id,
  });
}
