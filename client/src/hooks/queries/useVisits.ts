import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import type { Visit } from "../../types";

export function useVisits() {
  return useQuery({
    queryKey: ["visits"],
    queryFn: () => apiClient<Visit[]>("/visits"),
  });
}
