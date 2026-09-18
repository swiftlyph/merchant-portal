import { useMutation } from "@tanstack/react-query";
import { resetTeamMemberPassword } from "./api";

/**
 * No team-query invalidation: a reset changes nothing the roster shows.
 */
export function useResetTeamMemberPassword() {
  return useMutation({
    mutationFn: (userId: number) => resetTeamMemberPassword(userId),
  });
}
