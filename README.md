# GASA Merchant Portal

The merchant-facing SPA for the GASA B2B platform. Talks to a separate Laravel
REST API (repo not included here) at `VITE_API_URL`, all routes under
`/api/v1`.

## Stack

- React 18 + Vite + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui (Radix primitives, `class-variance-authority`)
- Raleway (body) / Figtree (headings) via `@fontsource-variable`, Tabler +
  Lucide icons
- React Router
- TanStack Query for **all** server state — no server data in `useState`
- Vitest + React Testing Library

## Getting started

```sh
cp .env.example .env
npm install
npm run dev
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`, `npm run test`, `npm run typecheck`.

## CI

`.github/workflows/ci.yml` runs on every PR into `main` and every push to
`main`: lint, typecheck, and test run in parallel, then build runs after all
three pass and uploads `dist/` as a workflow artifact. No CD yet — deploy
target is still undecided.

### Offline dev: mock API

`npm run mock-api` runs `scripts/mock-api.mjs`, a minimal Node server
implementing the auth contract below (login/me/logout), for developing
against when the real backend isn't running. It's generated from the "Auth"
and "API error shape" sections of this README, **not** from the backend's
source.

**Sync rule:** any backend contract change (new field, changed status code,
new error code) must update `scripts/mock-api.mjs` in the same change that
starts relying on it in the frontend. A mock that quietly drifts from the
real API is worse than no mock — it makes `npm run dev` lie about what
works. If a contract change lands and nobody has time to update the mock
immediately, delete the mock rather than leave it stale.

## UI: shadcn/ui, not DaisyUI

The app moved off DaisyUI onto shadcn/ui: Tailwind v4 + Radix primitives,
generated into `src/components/ui/` (button, card, field, sidebar, etc.) and
customized in place rather than imported from a package. Brand tokens come
from a shadcn preset (`src/index.css`, `:root` / `.dark`) — a warm orange
`primary`, 0.45rem base radius, Raleway/Figtree fonts.

- Light theme is the default (`:root`); dark is the `.dark` class on
  `<html>`. Same toggle mechanism as before the migration — `data-theme`
  applied pre-paint by an inline script in `index.html`, persisted via
  `src/lib/theme.ts` / `src/components/ui/ThemeToggle.tsx` (theme names
  `"gasa"`/`"gasadark"` and the localStorage key are unchanged, even though
  the underlying CSS is no longer DaisyUI).
- All colors go through the shadcn CSS variables (`--primary`,
  `--muted-foreground`, `--sidebar`, etc.) — no raw hex in components. The
  `brand-gradient` utility in `index.css` is the one intentional exception,
  reserved for the dashboard stat cards; never place it or glass behind body
  text or a data table.
- `src/components/login-form.tsx` is the **unmodified shadcn `login-04`
  scaffold** (kept for reference / re-scaffolding) — it is not imported
  anywhere. The real login page is `src/features/auth/pages/LoginPage.tsx`,
  which adapts the same block's layout to this app's actual auth logic.

## Login page

Split-screen layout (`LoginPage.tsx`, shadcn `login-04` adapted): a `Card`
with `md:grid-cols-2` — form fields (email, password, primary CTA) on the
left, a plain `bg-primary` panel on the right (hidden below `md`) reserved
for a future product screenshot, currently a dashed placeholder. The OAuth
row and sign-up link from the stock block are commented out, not deleted —
no OAuth providers or self-serve signup exist for this portal. The "GASA"
wordmark in the heading uses `text-primary`.

## App shell: sidebar layout

`/app` now renders `DashboardLayout.tsx` (adapted from shadcn's `sidebar-07`
block) instead of a bare page: a collapsible-to-icon left nav
(`AppSidebar`/`NavMain`/`NavUser`) plus a header (breadcrumb + theme toggle)
wrapping an `<Outlet />` for four nested routes:

| Path | Page | Status |
| --- | --- | --- |
| `/app/dashboard` | `DashboardPage` | Only real content: `useMe` identity line |
| `/app/pos` | `PosPage` | `PlaceholderPage` |
| `/app/kitchen-queue` | `KitchenQueuePage` | `PlaceholderPage` |
| `/app/orders` | `OrdersPage` | `PlaceholderPage` |

`/app` index-redirects to `/app/dashboard`. `PlaceholderPage` (dashed border,
"This section is coming soon") is the shared stand-in until each section has
real content — swap it out per-route as they're built.

## API error shape

Every non-2xx response from the backend has the shape:

```ts
{ message: string; code?: string; errors?: Record<string, string[]> }
```

- `422` — validation failure; `errors` maps field name to messages.
- `401` — invalid or expired token.
- `429` with `code: "too_many_attempts"` — login throttled.

`src/lib/api/client.ts` normalizes all of this (including network failures)
into a typed `ApiError { status, message, code, errors }`. `registerOnUnauthorized(cb)`
is wired once, in `src/features/auth/session.ts`, to react to any 401 globally;
`registerTokenGetter(fn)` is wired once, in `src/features/auth/store.ts`, to
supply the bearer token. A per-request `suppressUnauthorized` option on
`RequestOptions` opts a call out of that global handler for a 401 that's an
expected, in-band outcome rather than an expired session — login and logout
use it.

## Auth

All auth state lives in `src/features/auth/store.ts` (zustand): `status`
(`"booting" | "guest" | "authed"`), `token`, and `user`. Only the token is
persisted (`localStorage`, one namespaced key) — `user` is never persisted,
since roles could go stale, and is always rehydrated from `GET /auth/me`.

- **Boot** (`useAuthBoot.ts`): a stored token is confirmed against `/auth/me`
  before the user is treated as authed. `app/providers.tsx` renders a
  full-screen loader for the whole app while `status === "booting"`, so a
  refresh on an authed session never flashes `/login`.
- **Guard** (`RequireAuth.tsx`): wraps `/app`; redirects guests to `/login`
  while preserving the attempted location for post-login redirect. `/login`
  itself redirects to `/app` when already authed.
- **Session expiry** (`session.ts`): any un-suppressed 401, anywhere, clears
  the store, clears the TanStack Query cache, and redirects to `/login` with
  a "session expired" notice — idempotently, so two 401s in flight at once
  only trigger it once.
- **Logout** (`useLogout.ts`): clears store/cache and redirects to `/login`
  regardless of whether the `/auth/logout` call itself succeeds.
- **Live protected query** (`useMe.ts`): the dashboard calls `GET /auth/me`
  once via TanStack Query (`staleTime: Infinity`, no polling). Beyond
  fetching the name, this is what makes a server-side token revocation show
  up as a real session-expiry (via the un-suppressed 401 path above) while
  the user is actively on the dashboard, not only at boot/refresh.

## Suspended merchants

`AuthUser.merchant` is `{ id, name, status: "pending" | "active" | "suspended" } | null`,
returned inside the same flat payload by both login and `/auth/me`. Login
always succeeds for a suspended merchant — `merchant_inactive` is a routing
concern, not a login error.

- `selectIsMerchantActive` (`store.ts`) is the single source of truth both
  routes below read, so they can never disagree about which side of
  `/suspended` a user belongs on.
- **`RequireActiveMerchant.tsx`** wraps `/app`: guest → `/login` (via
  `RequireAuth`), authed-but-not-active → `/suspended`.
- **`SuspendedPage.tsx`** (`/suspended`): a calm, solid-surface, no-shell page
  showing the merchant's name and "Your account is currently inactive," with
  a logout button. Self-guards the other two directions: guest → `/login`,
  active merchant → `/app`.
- **`merchantGuard.ts`** — defense in depth for a merchant suspended
  mid-session: a 403 `merchant_inactive` from any `/merchant/*` request
  refreshes `/auth/me` once and re-derives routing, landing on `/suspended`
  without logging the user out. A lock (not a one-shot flag) collapses
  concurrent 403s into a single refresh+redirect; it can't loop because
  `/auth/me` is not itself a merchant route.

## Status

Sidebar/POS scaffold — UI migrated from DaisyUI to shadcn/ui, `/app` now a
sidebar shell (`DashboardLayout`) with four nested routes (dashboard, POS,
kitchen queue, orders), three of which are still `PlaceholderPage`. No
merchant data fetching exists yet beyond `/auth/me`.
