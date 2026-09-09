import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SuspendedPage } from "@/features/auth/pages/SuspendedPage";
import { RequireActiveMerchant } from "@/features/auth/RequireActiveMerchant";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { NotFound } from "@/pages/NotFound";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/suspended", element: <SuspendedPage /> },
  {
    path: "/app",
    element: (
      <RequireActiveMerchant>
        <DashboardPage />
      </RequireActiveMerchant>
    ),
  },
  { path: "*", element: <NotFound /> },
]);
