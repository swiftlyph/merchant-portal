import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeTeamMember } from "./api";
import { teamQueryKey } from "./use-team";

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => removeTeamMember(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamQueryKey });
    },
  });
}
