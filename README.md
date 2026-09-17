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
implementing the auth contract below (login/me/logout) plus the Products,
Recipe and Ingredients endpoints with a small seeded catalog, for
developing against when the real backend isn't running. It's generated from
the "Auth", "API error shape", "Products" and "Inventory" sections of this
README, **not** from the backend's source. Orders are not mocked: any other
`/merchant/*` route answers with an empty list.

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
| `/app/orders` | `OrdersPage` | Real: list + detail with complete/void |
| `/app/products` | `ProductsPage` | Real: full CRUD, plus each product's recipe |
| `/app/inventory` | `IngredientsPage` | Real: full CRUD — this merchant's actual inventory |

`/app` index-redirects to `/app/dashboard`. `PlaceholderPage` (dashed border,
"This section is coming soon") is the shared stand-in until each section has
real content — swap it out per-route as they're built.

Paginated lists share `src/lib/api/pagination.ts` (Laravel's
`{ data, links, meta }` envelope, a defensive `normalizePage`, and
`buildQueryString`) and `src/components/list-pagination.tsx` (prev/next
pager, plus an optional rows-per-page select — pass `perPage`/
`onPerPageChange` to opt in, as Products and Inventory both do). The
orders feature predates both and still carries its own copies.

## Products

`src/features/products/`. Catalog list at `/app/products`: status filter,
page and page size live in the URL (`?status=&page=&per_page=`) and drive
the server query; the search box filters the loaded page client-side by
name or product ID. Page size defaults to **15** with a rows-per-page
control (`<ListPagination>`, shared with Inventory below) offering
15/25/50; changing it resets to page 1.

**Product ID, not SKU.** Every product has a `code` like `DRK-001`, shown
in the Product ID column. The server issues it from the category's prefix
plus a per-merchant counter — on create, and again on update whenever the
category actually changes (a Drinks product moved to Food gets a new
`FOD-###`, replacing the old code). There's no ID field in any form; both
Add and Edit only ever send `category`, never a code, and the edit form
previews what the new ID will be before you save. `id` is still the
numeric key used in URLs but is never displayed.

**Add Product** (`components/add-product-dialog.tsx`) opens a modal form
that POSTs to `/merchant/products`. Category is a required dropdown fed by
`GET /merchant/catalog/categories` (fetched the first time the dialog
opens, then cached for the session), and the form previews the ID prefix
the product will get, e.g. `SNK-###`. Prices are typed in pesos and turned
into integer cents by `parseAmountToCents` (`src/lib/money.ts`) — string
arithmetic, never a float — so the API only ever sees cents. There is no
recipe field here: a product must exist before ingredients can be attached
to it (see § Recipe below), so that happens afterward from the product's
row. A 422 lands each message under its field (server keys mapped to form
fields, e.g. `price_cents` → the price input); any other failure is a
form-level alert. Success toasts, closes the dialog, and invalidates the
products list.

**View** (`components/view-product-dialog.tsx`) is an eye icon in the row's
Actions column that opens a read-only detail modal: price, product ID,
category, description, timestamps, and the product's recipe (each
ingredient, its quantity/unit, and its own stock-status badge — see §
Recipe). It opens on the row's own data (no loading flash) and refetches
`/merchant/products/{id}` while open (`use-product.ts`), so a stock change
made elsewhere shows up; a 404 shows a "no longer exists" notice over the
last known details rather than an empty modal.

**Edit** (`components/edit-product-dialog.tsx`) is a pencil icon in the
same column, and also reachable from an "Edit" button inside the View
modal — clicking it closes View and opens Edit pre-filled with whatever
View last fetched, not the possibly-stale row it was opened from.
`EditProductDialog` is a controlled component with no trigger of its
own, so both call sites (`EditProductButton`'s pencil icon, and View's
button) share one form implementation. It mirrors Add's fields exactly,
pre-filled from the product, and PATCHes `/merchant/products/{id}` with
the full form on every save rather than diffing changed fields. The
category field previews what will happen to the product's ID before you
save — unchanged, reassigned to the new category's prefix, or (for a
product with no ID yet) assigned for the first time — matching the
backend's actual reissue rule (see § Product ID above). A "Recipe" row at
the bottom summarizes the current recipe (ingredient count, in/out of
stock) with a button into the recipe editor.

**Delete** (`components/delete-product-button.tsx`) is a trash icon in the
same column. It always opens an `AlertDialog` confirm first (hard
delete server-side — its recipe lines cascade away, the ingredients
themselves are untouched — nothing to undo), then DELETEs
`/merchant/products/{id}` and invalidates the products list. Outcomes are
toasted, since the dialog has closed by the time the request resolves; a
404 is treated as "already gone" and still refreshes.

**Recipe** (`components/edit-recipe-dialog.tsx`) — a chef-hat icon of its
own in the Actions column (and inside View/Edit), since a merchant reaches
for this far more often than the rest of a product's fields once the
catalog is set up. PUTs the *entire* recipe to
`/merchant/products/{id}/recipe` on every save (never a partial diff,
matching the backend's replace-the-whole-list contract) — an empty list
clears the recipe, making the product stock-unconstrained again. Each row
picks an ingredient (already-chosen ones are excluded from other rows'
dropdowns, so a duplicate can't be built in the UI), a whole-number
quantity, and a unit — the unit dropdown is narrowed to that ingredient's
own `available_units`, so "30ml against a kg-tracked ingredient" (the
scenario this whole feature exists to prevent — see gasa-api README §
Ingredients & recipes) can't even be selected, let alone submitted. Picking
an ingredient shows its current stock at a glance. Per-line 422 errors
(`ingredients.{index}.{field}`) are mapped back onto the right row by a
stable key, since any never-filled-in blank row is dropped before the
request is built and the index would otherwise drift.

**Contract, implemented in gasa-api (`App\Domains\Catalog`).** Integer
cents plus server-formatted money, Laravel pagination envelope.

```
GET    /merchant/products?status=active|inactive&category=&page=&per_page=
POST   /merchant/products
GET    /merchant/products/{id}
PATCH  /merchant/products/{id}
DELETE /merchant/products/{id}
PUT    /merchant/products/{id}/recipe
GET    /merchant/catalog/categories   // [{ name: "Drinks", prefix: "DRK" }, …]
```

```ts
interface RecipeItem {
  id: number;
  ingredient_id: number;
  ingredient_code: string;       // the ingredient's own ID, e.g. "0001"
  ingredient_name: string;
  quantity: number;              // as entered, in `unit`
  unit: "mg" | "g" | "kg" | "ml" | "l" | "pcs";
  ingredient_stock_status: "in_stock" | "low_stock" | "out_of_stock";
}

interface Product {
  id: number;
  name: string;
  code: string;                // product ID, e.g. "DRK-001"; server-issued, immutable
  category: string;            // one of GET /merchant/catalog/categories
  description: string | null;
  currency: string;            // "PHP"
  price_cents: number;
  price_formatted: string;
  status: "active" | "inactive";
  in_stock: boolean;           // every recipe ingredient has enough for one more unit; vacuously true with no recipe
  recipe: RecipeItem[];
  created_at: string;
  updated_at: string;
}
```

`in_stock` is a DIFFERENT statement from `status`: it says nothing about
the merchant's manual toggle, only whether a sale would go through right
now. The list returns `{ data: Product[], links, meta }`; `show`/`store`/
`update`/the recipe endpoint all return a flat `Product`. An unknown
`status` is a 422 `validation_failed`.

## Inventory

`src/features/ingredients/` (the page is titled "Inventory" — this
merchant's ingredients ARE their inventory; a product carries no stock of
its own, only its recipe's ingredients do — see § Recipe above). Full
CRUD at `/app/inventory`: stock-status filter, page and page size live in
the URL (`?status=&page=&per_page=`); the search box filters the loaded
page client-side by name or ingredient ID. Same 15/25/50 rows-per-page
control as Products, defaulting to 15.

Every quantity is entered and shown in the ingredient's own `display_unit`
— the frontend never converts between units itself (mg/g/kg, ml/L, pcs are
each one measurement family; the `Unit` type's docblock in
`features/ingredients/types.ts` explains why converting across families
would require guessing a density this system doesn't collect). The server
does that conversion and sends back both the raw integer and a
`*_formatted` string, the same "don't do money math on the client" rule
`price_cents`/`price_formatted` already follow.

**Add** (`components/add-ingredient-dialog.tsx`) — choosing "Measured in"
(mass/volume/count) narrows the display-unit dropdown to that family and
resets it, so the two fields can never end up mismatched.

**Edit** (`components/edit-ingredient-dialog.tsx`) — `unit_type` shows as
read-only context, never sent: it's immutable server-side once set, since
every stock quantity and recipe line pointing at this ingredient is
already stored in that family's base unit.

**Delete** (`components/delete-ingredient-button.tsx`) — always confirms
first. The server refuses (409 `ingredient_in_use`) if any product's
recipe still references it; that refusal surfaces as a toast rather than
being blocked client-side, since only the server knows every recipe
across the catalog.

**Contract, implemented in gasa-api.**

```
GET    /merchant/ingredients?status=in_stock|low_stock|out_of_stock&page=&per_page=
POST   /merchant/ingredients
PATCH  /merchant/ingredients/{id}
DELETE /merchant/ingredients/{id}
```

```ts
interface Ingredient {
  id: number;
  code: string;                          // "0001" — a zero-padded rendering of `id`, not a separate sequence
  name: string;
  unit_type: "mass" | "volume" | "count"; // immutable after creation
  display_unit: "mg" | "g" | "kg" | "ml" | "l" | "pcs";
  quantity_on_hand: number;              // base-unit integer — prefer the _formatted twin
  quantity_on_hand_formatted: string;
  low_stock_threshold: number;
  low_stock_threshold_formatted: string;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";  // derived server-side
  available_units: string[];             // the units unit_type supports
  created_at: string;
  updated_at: string;
}
```

`stock_status` is computed by the server (`<= 0` → `out_of_stock`,
`<= low_stock_threshold` → `low_stock`) so the POS, kitchen and this
portal never disagree on what "low" means.

`StockStatusBadge` uses the `--success` / `--warning` tokens from
`index.css` for in-stock / low-stock and the `destructive` badge variant for
out-of-stock — no raw colors.

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

Sidebar shell (`DashboardLayout`) with six nested routes. Orders (list,
detail, complete/void), Products (list, add, view, edit, delete, recipe),
and Inventory (list, add, edit, delete) are all real; POS and Kitchen
Queue are still `PlaceholderPage`. Orders/Products/Inventory all target
the real gasa-api backend and also render against the mock API for
offline dev.
