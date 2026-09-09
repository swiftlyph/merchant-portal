import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { SuspendedPage } from "@/features/auth/pages/SuspendedPage";
import { RequireActiveMerchant } from "@/features/auth/RequireActiveMerchant";
import { DashboardLayout } from "@/app/DashboardLayout";
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
        <DashboardLayout />
      </RequireActiveMerchant>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage />, handle: { title: "Dashboard" } },
      { path: "pos", element: <PosPage />, handle: { title: "POS" } },
      {
        path: "kitchen-queue",
        element: <KitchenQueuePage />,
        handle: { title: "Kitchen Queue" },
      },
      { path: "orders", element: <OrdersPage />, handle: { title: "Orders" } },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
