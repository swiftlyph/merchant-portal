import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/pages/login-page";
import { SuspendedPage } from "@/features/auth/pages/suspended-page";
import { AcceptInvitePage } from "@/features/auth/pages/accept-invite-page";
import { RequireActiveMerchant } from "@/features/auth/require-active-merchant";
import { RequirePermission } from "@/features/auth/require-permission";
import { DashboardLayout } from "@/app/dashboard-layout";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";
import { PosPage } from "@/features/pos/pages/pos-page";
import { KitchenQueuePage } from "@/features/kitchen-queue/pages/kitchen-queue-page";
import { OrdersPage } from "@/features/orders/pages/orders-page";
import { OrderDetailPage } from "@/features/orders/pages/order-detail-page";
import { ReceiptPage } from "@/features/orders/pages/receipt-page";
import { ProductsPage } from "@/features/products/pages/products-page";
import { IngredientsPage } from "@/features/ingredients/pages/ingredients-page";
import { CashDrawerPage } from "@/features/cash-sessions/pages/cash-drawer-page";
import { SessionDetailPage } from "@/features/cash-sessions/pages/session-detail-page";
import { ShiftReportPage } from "@/features/cash-sessions/pages/shift-report-page";
import { ReportsPage } from "@/features/reports/pages/reports-page";
import { SettingsLayout } from "@/features/settings/pages/settings-layout";
import { ProfilePage } from "@/features/settings/pages/profile-page";
import { TeamPage } from "@/features/settings/pages/team-page";
import { NotFound } from "@/pages/not-found";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/suspended", element: <SuspendedPage /> },
  // Public, reachable by a guest. Registered at both paths: /invite/:token
  // per the phase spec, and /accept-invite (?token=) matching the
  // backend's actual dev-only invite-link generator (CreateTeamInvitationAction).
  { path: "/invite/:token", element: <AcceptInvitePage /> },
  { path: "/accept-invite", element: <AcceptInvitePage /> },
  // Print views (F11): deliberately NOT nested under DashboardLayout — no
  // sidebar/header even renders here, rather than relying solely on print
  // CSS to hide it. Still behind RequireActiveMerchant (needs auth/merchant
  // context) and RequirePermission (same permission the source detail page
  // requires), so a stale/shared link can't leak a receipt or shift report
  // to someone who couldn't see the underlying order/session anyway.
  {
    path: "/app/orders/:id/receipt",
    element: (
      <RequireActiveMerchant>
        <RequirePermission permission="orders.view">
          <ReceiptPage />
        </RequirePermission>
      </RequireActiveMerchant>
    ),
  },
  {
    path: "/app/cash-drawer/sessions/:id/report",
    element: (
      <RequireActiveMerchant>
        <RequirePermission permission="drawer.view">
          <ShiftReportPage />
        </RequirePermission>
      </RequireActiveMerchant>
    ),
  },
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
      {
        path: "pos",
        element: (
          <RequirePermission permission="orders.create">
            <PosPage />
          </RequirePermission>
        ),
        handle: { title: "POS" },
      },
      {
        path: "kitchen-queue",
        element: <KitchenQueuePage />,
        handle: { title: "Queue" },
      },
      { path: "orders", element: <OrdersPage />, handle: { title: "Orders" } },
      {
        path: "orders/:id",
        element: <OrderDetailPage />,
        handle: { title: "Order detail", parentTitle: "Orders", parentPath: "/app/orders" },
      },
      { path: "products", element: <ProductsPage />, handle: { title: "Products" } },
      { path: "ingredients", element: <IngredientsPage />, handle: { title: "Ingredients" } },
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
      {
        path: "reports",
        element: (
          <RequirePermission permission="reports.view">
            <ReportsPage />
          </RequirePermission>
        ),
        handle: { title: "Reports" },
      },
      {
        path: "settings",
        element: <SettingsLayout />,
        handle: { title: "Settings" },
        children: [
          { index: true, element: <Navigate to="/app/settings/profile" replace /> },
          { path: "profile", element: <ProfilePage />, handle: { title: "Settings" } },
          { path: "team", element: <TeamPage />, handle: { title: "Settings" } },
        ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
