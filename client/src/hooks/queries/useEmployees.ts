import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { User } from "../../types";

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: () => apiClient<User[]>("/employees"),
  });
}
