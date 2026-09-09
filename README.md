# GASA Merchant Portal

The merchant-facing SPA for the GASA B2B platform. Talks to a separate Laravel
REST API (repo not included here) at `VITE_API_URL`, all routes under
`/api/v1`.

## Stack

- React 18 + Vite + TypeScript (strict)
- Tailwind CSS v4 + DaisyUI 5
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

## Theme policy

Two DaisyUI themes are defined in `src/index.css`: `gasa` (light, default) and
`gasadark` (dark, `prefersdark`). The active theme is set via `data-theme` on
`<html>`, applied by an inline script in `index.html` before first paint (no
flash of the wrong theme) and toggled/persisted to `localStorage` at runtime
(`src/lib/theme.ts`, `src/components/ui/ThemeToggle.tsx`).

**Solid vs. glass:**

- The app shell, tables, and forms use solid DaisyUI surfaces
  (`bg-base-100` / `base-200` / `base-300`). This is the default everywhere.
- Glassmorphism is an **accent only**, reserved for the login card and
  dashboard stat cards, layered over the `brand-gradient` utility
  (`src/index.css`). Never place glass behind body text or a data table.
- All colors go through DaisyUI semantic tokens (`primary`, `base-content`,
  etc.) — no raw hex or arbitrary Tailwind color values in components. The
  brand gradient in `index.css` is the one intentional exception, since it
  exists specifically to back the two approved glass accents.

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

A `merchant_inactive` 403 (suspended/inactive merchant) is left as an explicit
TODO in `LoginPage.tsx`'s error mapping — it arrives with the backend tenancy
phase, not yet.

## Status

Phase F2 — auth flow wired against the real API: login, logout, boot
rehydration, route guards, and session-expiry handling. No merchant data
fetching yet — `/app` is still a placeholder shell.
