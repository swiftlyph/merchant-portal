import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useAuthStore } from "@/features/auth/store";
import { useAuthBoot } from "@/features/auth/use-auth-boot";
import { setQueryClientClear, setSessionNavigator } from "@/features/auth/session";
import { setMerchantGuardNavigator } from "@/features/auth/merchant-guard";
import "@/features/auth/permission-guard";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Wired once, at module load: session.ts's onUnauthorized handler needs both
// of these but shouldn't otherwise depend on the router or query client.
setQueryClientClear(() => queryClient.clear());
setSessionNavigator((path) => router.navigate(path));
setMerchantGuardNavigator((path) => router.navigate(path));

/**
 * Gates the whole router behind the boot check: while status is "booting"
 * every route — guarded or not — renders a loader instead, so a refresh on
 * an authed session never flashes /login first.
 */
function AuthGate() {
  useAuthBoot();
  const status = useAuthStore((s) => s.status);

  if (status === "booting") {
    return <FullScreenLoader />;
  }

  return <RouterProvider router={router} />;
}

export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthGate />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
