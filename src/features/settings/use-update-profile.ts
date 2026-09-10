import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "./api";
import { profileQueryKey } from "./use-profile";
import type { UpdateMerchantProfileRequest } from "./types";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateMerchantProfileRequest) => updateProfile(request),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey, profile);
    },
  });
}
