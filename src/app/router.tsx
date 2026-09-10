import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/pages/login-page";
import { SuspendedPage } from "@/features/auth/pages/suspended-page";
import { RequireActiveMerchant } from "@/features/auth/require-active-merchant";
import { DashboardLayout } from "@/app/dashboard-layout";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";
import { PosPage } from "@/features/pos/pages/pos-page";
import { KitchenQueuePage } from "@/features/kitchen-queue/pages/kitchen-queue-page";
import { OrdersPage } from "@/features/orders/pages/orders-page";
import { OrderDetailPage } from "@/features/orders/pages/order-detail-page";
import { CashDrawerPage } from "@/features/cash-sessions/pages/cash-drawer-page";
import { SessionDetailPage } from "@/features/cash-sessions/pages/session-detail-page";
import { ReportsPage } from "@/features/reports/pages/reports-page";
import { NotFound } from "@/pages/not-found";

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
      {
        path: "orders/:id",
        element: <OrderDetailPage />,
        handle: { title: "Order detail", parentTitle: "Orders", parentPath: "/app/orders" },
      },
      { path: "cash-drawer", element: <CashDrawerPage />, handle: { title: "Cash Drawer" } },
      {
        path: "cash-drawer/sessions/:id",
        element: <SessionDetailPage />,
        handle: {
          title: "Session detail",
          parentTitle: "Cash Drawer",
          parentPath: "/app/cash-drawer",
        },
      },
      { path: "reports", element: <ReportsPage />, handle: { title: "Reports" } },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
