import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { logout } from "./api";
import { useAuthStore } from "./store";

/**
 * Clears local auth state, the query cache, and redirects to /login
 * regardless of whether the /auth/logout call itself succeeds — the token
 * is being discarded locally either way.
 */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clear();
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });
}
