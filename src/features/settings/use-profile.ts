import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "./api";

export const profileQueryKey = ["settings", "profile"] as const;

export function useProfile() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: fetchProfile,
  });
}
