import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { Product } from "../../types";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => apiClient<Product[]>("/api/products"),
  });
}
