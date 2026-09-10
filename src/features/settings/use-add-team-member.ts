import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addTeamMember } from "./api";
import { teamQueryKey } from "./use-team";
import type { AddTeamMemberRequest } from "./types";

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AddTeamMemberRequest) => addTeamMember(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamQueryKey });
    },
  });
}
