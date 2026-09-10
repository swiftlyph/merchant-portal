import { useQuery } from "@tanstack/react-query";
import { fetchTeam } from "./api";

export const teamQueryKey = ["settings", "team"] as const;

export function useTeam() {
  return useQuery({
    queryKey: teamQueryKey,
    queryFn: fetchTeam,
  });
}
