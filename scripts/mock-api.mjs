/**
 * A minimal stand-in for the real Laravel backend, for offline frontend
 * development and manual verification when the real API isn't reachable.
 *
 * Generated from the auth contract documented in README.md ("Auth" and
 * "API error shape" sections) — NOT from the backend's source. It is not a
 * substitute for testing against the real API before shipping; it exists so
 * `npm run dev` has something to talk to when the backend repo isn't running.
 *
 * SYNC RULE: if a backend contract change lands (a new field, a changed
 * status code, a new error code), update this file in the same change that
 * consumes it in the frontend. A mock that quietly drifts from the real API
 * is worse than no mock — it makes `npm run dev` lie about what works.
 *
 * Covers: POST /auth/login, GET /auth/me, POST /auth/logout; GET
 * /merchant/orders (paginated, status/date filters), GET
 * /merchant/orders/:id, POST /merchant/orders/:id/complete, POST
 * /merchant/orders/:id/void — each merchant_inactive-checked and scoped to
 * the caller's own merchant; a generic /merchant/* stub covers anything
 * else, for exercising the merchant_inactive path.
 *
 * Usage: npm run mock-api (listens on :8010, matching .env.example)
 */
import { createServer } from "node:http";

const PORT = process.env.MOCK_API_PORT ? Number(process.env.MOCK_API_PORT) : 8010;

const users = {
  "merchant@gasa.test": {
    password: "password",
    portal: "merchant",
    user: {
      id: 1,
      name: "Merchant One",
      email: "merchant@gasa.test",
      roles: ["merchant"],
      merchant: { id: 1, name: "Merchant One", status: "active" },
    },
  },
  "suspended@gasa.test": {
    password: "password",
    portal: "merchant",
    user: {
      id: 3,
      name: "Suspended Owner",
      email: "suspended@gasa.test",
      roles: ["merchant"],
      merchant: { id: 2, name: "Suspended Merchant", status: "suspended" },
    },
  },
  "company@gasa.test": {
    password: "password",
    portal: "company",
    user: {
      id: 2,
      name: "Company User",
      email: "company@gasa.test",
      roles: ["company"],
      merchant: null,
    },
  },
  "merchant2@gasa.test": {
    password: "password",
    portal: "merchant",
    user: {
      id: 4,
      name: "Merchant Two",
      email: "merchant2@gasa.test",
      roles: ["merchant"],
      merchant: { id: 5, name: "Merchant Two", status: "active" },
    },
  },
};

const tokens = new Map(); // token -> email
const attemptTimestamps = []; // login throttle: 6th attempt within a minute -> 429

// --- Orders -----------------------------------------------------------
// Seeded per-merchant so a merchant only ever sees its own orders. Money is
// integer cents throughout, matching the real API.
function makeOrder({ merchantId, id, status, paymentMethod, createdAt, items, discountCents = 0 }) {
  const subtotalCents = items.reduce((sum, item) => sum + item.line_total_cents, 0);
  const totalCents = subtotalCents - discountCents;
  const split = paymentMethod === "split";
  return {
    id,
    merchant_id: merchantId,
    order_number: `ORD-${String(id).padStart(6, "0")}`,
    status,
    payment_method: paymentMethod,
    subtotal_cents: subtotalCents,
    discount_cents: discountCents,
    total_cents: totalCents,
    currency: "PHP",
    cash_cents: split ? Math.round(totalCents / 2) : null,
    gcash_cents: split ? totalCents - Math.round(totalCents / 2) : null,
    created_by_user_id: merchantId === 1 ? 1 : 4,
    completed_at: status === "completed" ? createdAt : null,
    voided_at: status === "voided" ? createdAt : null,
    created_at: createdAt,
    items,
  };
}

function withAddOns(name, unitPriceCents, quantity, addOns = []) {
  const addOnTotal = addOns.reduce((sum, a) => sum + a.price_cents, 0);
  return {
    product_name: name,
    unit_price_cents: unitPriceCents,
    quantity,
    line_total_cents: unitPriceCents * quantity + addOnTotal * quantity,
    add_ons: addOns,
  };
}

let orders = [
  makeOrder({
    merchantId: 1,
    id: 1,
    status: "pending",
    paymentMethod: "cash",
    createdAt: "2026-09-09T02:15:00.000Z",
    items: [withAddOns("Iced Latte", 15000, 2, [{ name: "Oat milk", price_cents: 3000 }])],
  }),
  makeOrder({
    merchantId: 1,
    id: 2,
    status: "pending",
    paymentMethod: "gcash",
    createdAt: "2026-09-09T01:50:00.000Z",
    items: [withAddOns("Americano", 12000, 1)],
  }),
  makeOrder({
    merchantId: 1,
    id: 3,
    status: "completed",
    paymentMethod: "split",
    createdAt: "2026-09-08T23:40:00.000Z",
    items: [
      withAddOns("Cappuccino", 14000, 1, [{ name: "Extra shot", price_cents: 2500 }]),
      withAddOns("Croissant", 9000, 2),
    ],
    discountCents: 5000,
  }),
  makeOrder({
    merchantId: 1,
    id: 4,
    status: "voided",
    paymentMethod: "cash",
    createdAt: "2026-09-08T20:05:00.000Z",
    items: [withAddOns("Cold Brew", 16000, 1)],
  }),
  makeOrder({
    merchantId: 5,
    id: 5,
    status: "pending",
    paymentMethod: "cash",
    createdAt: "2026-09-09T03:00:00.000Z",
    items: [withAddOns("Matcha Latte", 17000, 1)],
  }),
];

function ordersForMerchant(merchantId) {
  return orders.filter((o) => o.merchant_id === merchantId);
}

function paginate(list, page, perPage = 10) {
  const lastPage = Math.max(1, Math.ceil(list.length / perPage));
  const currentPage = Math.min(Math.max(1, page), lastPage);
  const start = (currentPage - 1) * perPage;
  const pageItems = list.slice(start, start + perPage);
  const base = "/api/v1/merchant/orders";
  const pageUrl = (p) => (p ? `${base}?page=${p}` : null);
  return {
    data: pageItems,
    links: {
      first: pageUrl(1),
      last: pageUrl(lastPage),
      prev: currentPage > 1 ? pageUrl(currentPage - 1) : null,
      next: currentPage < lastPage ? pageUrl(currentPage + 1) : null,
    },
    meta: {
      current_page: currentPage,
      last_page: lastPage,
      per_page: perPage,
      total: list.length,
    },
  };
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data ? JSON.parse(data) : {}));
  });
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ?? "";

  if (url === "/api/v1/auth/login" && req.method === "POST") {
    const now = Date.now();
    while (attemptTimestamps.length && now - attemptTimestamps[0] > 60_000) {
      attemptTimestamps.shift();
    }

    const body = await readBody(req);
    const errors = {};
    if (!body.email) errors.email = ["The email field is required."];
    if (!body.password) errors.password = ["The password field is required."];
    if (Object.keys(errors).length > 0) {
      return json(res, 422, {
        message: "The given data was invalid.",
        code: "validation_failed",
        errors,
      });
    }

    if (attemptTimestamps.length >= 5) {
      attemptTimestamps.push(now);
      return json(res, 429, { message: "Too many login attempts.", code: "too_many_attempts" });
    }
    attemptTimestamps.push(now);

    const record = users[body.email];
    if (!record || record.password !== body.password) {
      return json(res, 401, { message: "Invalid credentials.", code: "invalid_credentials" });
    }
    if (record.portal !== body.portal) {
      return json(res, 403, {
        message: "This account can't access this portal.",
        code: "portal_forbidden",
      });
    }

    const token = `tok_${record.user.id}_${now}`;
    tokens.set(token, body.email);
    return json(res, 200, { token, user: record.user });
  }

  if (url === "/api/v1/auth/me" && req.method === "GET") {
    const token = (req.headers.authorization ?? "").replace("Bearer ", "");
    const email = tokens.get(token);
    if (!email) return json(res, 401, { message: "Unauthenticated.", code: "unauthenticated" });
    return json(res, 200, users[email].user);
  }

  if (url === "/api/v1/auth/logout" && req.method === "POST") {
    const token = (req.headers.authorization ?? "").replace("Bearer ", "");
    tokens.delete(token);
    res.writeHead(204);
    return res.end();
  }

  // Shared auth + merchant_inactive check for every /merchant/* route below.
  // Returns the caller's merchant on success, or null after already writing
  // an error response.
  function authenticateMerchant() {
    const token = (req.headers.authorization ?? "").replace("Bearer ", "");
    const email = tokens.get(token);
    if (!email) {
      json(res, 401, { message: "Unauthenticated.", code: "unauthenticated" });
      return null;
    }
    const { merchant } = users[email].user;
    if (!merchant || merchant.status !== "active") {
      json(res, 403, { message: "Merchant inactive.", code: "merchant_inactive" });
      return null;
    }
    return merchant;
  }

  const [urlPath, urlQuery] = url.split("?");
  const orderDetailMatch = urlPath.match(/^\/api\/v1\/merchant\/orders\/(\d+)(?:\/(complete|void))?$/);

  if (urlPath === "/api/v1/merchant/orders" && req.method === "GET") {
    const merchant = authenticateMerchant();
    if (!merchant) return;

    const params = new URLSearchParams(urlQuery ?? "");
    let list = ordersForMerchant(merchant.id);
    const status = params.get("status");
    if (status) list = list.filter((o) => o.status === status);
    const date = params.get("date");
    if (date) list = list.filter((o) => o.created_at.slice(0, 10) === date);
    list = [...list].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    const page = Number(params.get("page") ?? "1") || 1;
    return json(res, 200, paginate(list, page));
  }

  if (orderDetailMatch && req.method === "GET" && !orderDetailMatch[2]) {
    const merchant = authenticateMerchant();
    if (!merchant) return;

    const id = Number(orderDetailMatch[1]);
    const order = orders.find((o) => o.id === id && o.merchant_id === merchant.id);
    if (!order) return json(res, 404, { message: "Order not found.", code: "not_found" });
    return json(res, 200, order);
  }

  if (orderDetailMatch && req.method === "POST" && orderDetailMatch[2]) {
    const merchant = authenticateMerchant();
    if (!merchant) return;

    const id = Number(orderDetailMatch[1]);
    const action = orderDetailMatch[2]; // "complete" | "void"
    const order = orders.find((o) => o.id === id && o.merchant_id === merchant.id);
    if (!order) return json(res, 404, { message: "Order not found.", code: "not_found" });

    if (order.status !== "pending") {
      return json(res, 422, {
        message: "This order has already been completed or voided.",
        code: "invalid_transition",
      });
    }

    const now = new Date().toISOString();
    if (action === "complete") {
      order.status = "completed";
      order.completed_at = now;
    } else {
      order.status = "voided";
      order.voided_at = now;
    }
    return json(res, 200, order);
  }

  // Dev-only escape hatch: reseed orders back to their initial state, for
  // re-running the complete/void flows by hand without restarting the
  // server. Not part of the real API.
  if (url === "/__reset-orders" && req.method === "POST") {
    orders = orders.map((o) => ({ ...o }));
    for (const o of orders) {
      if (o.id <= 2 || o.id === 5) {
        o.status = "pending";
        o.completed_at = null;
        o.voided_at = null;
      }
    }
    return json(res, 200, { ok: true });
  }

  // Generic stub for any other /merchant/* route: 403 merchant_inactive
  // unless the caller's merchant is active, else an empty list. Exists so
  // the mid-session defense-in-depth path (merchant-guard.ts) can still be
  // exercised by hand against routes not implemented above.
  if (url.startsWith("/api/v1/merchant/")) {
    const merchant = authenticateMerchant();
    if (!merchant) return;
    return json(res, 200, { data: [] });
  }

  // Dev-only escape hatch: revoke a token from the outside, to simulate a
  // server-side revocation while the SPA still holds it. Not part of the
  // real API — only for exercising the session-expiry path manually.
  if (url === "/__revoke" && req.method === "POST") {
    const body = await readBody(req);
    tokens.delete(body.token);
    return json(res, 200, { ok: true });
  }

  if (url === "/__reset-attempts" && req.method === "POST") {
    attemptTimestamps.length = 0;
    return json(res, 200, { ok: true });
  }

  json(res, 404, { message: "Not found.", code: "not_found" });
});

server.listen(PORT, () => {
  console.log(`Mock API listening on http://localhost:${PORT} (Ctrl+C to stop)`);
  console.log(
    "Seeded users: merchant@gasa.test / password (active merchant), " +
      "suspended@gasa.test / password (suspended merchant), " +
      "company@gasa.test / password (wrong portal)",
  );
});
