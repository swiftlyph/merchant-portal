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
into a typed `ApiError { status, message, code, errors }`. Call
`registerOnUnauthorized(cb)` once (wired up in the auth phase) to react to any
401 globally, and `registerTokenGetter(fn)` to supply the bearer token.

## Status

Phase F1 — project scaffold only. No auth logic, no token storage, no real
data fetching yet. `/login` and `/app` are static placeholders.
