import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTeamMember } from "./api";
import { teamQueryKey } from "./use-team";
import type { RoleInMerchant } from "./types";

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roleInMerchant }: { userId: number; roleInMerchant: RoleInMerchant }) =>
      updateTeamMember(userId, { role_in_merchant: roleInMerchant }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamQueryKey });
    },
  });
}
