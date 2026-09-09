import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SuspendedPage } from "@/features/auth/pages/SuspendedPage";
import { RequireActiveMerchant } from "@/features/auth/RequireActiveMerchant";
import { AppShell } from "@/app/AppShell";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { PosPage } from "@/features/pos/pages/PosPage";
import { KitchenQueuePage } from "@/features/kitchen-queue/pages/KitchenQueuePage";
import { OrdersPage } from "@/features/orders/pages/OrdersPage";
import { NotFound } from "@/pages/NotFound";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/suspended", element: <SuspendedPage /> },
  {
    path: "/app",
    element: (
      <RequireActiveMerchant>
        <AppShell />
      </RequireActiveMerchant>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "pos", element: <PosPage /> },
      { path: "kitchen-queue", element: <KitchenQueuePage /> },
      { path: "orders", element: <OrdersPage /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
