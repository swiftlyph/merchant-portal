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
 * Covers only what's implemented so far: POST /auth/login, GET /auth/me,
 * POST /auth/logout, and a generic /merchant/* stub for exercising the
 * merchant_inactive path. Extend it as later phases add endpoints.
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
};

const tokens = new Map(); // token -> email
const attemptTimestamps = []; // login throttle: 6th attempt within a minute -> 429

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

  // Generic stub for any /merchant/* route: 403 merchant_inactive unless the
  // caller's merchant is active. No real merchant endpoints exist yet — this
  // exists so the mid-session defense-in-depth path (merchantGuard.ts) can
  // be exercised by hand against something.
  if (url.startsWith("/api/v1/merchant/")) {
    const token = (req.headers.authorization ?? "").replace("Bearer ", "");
    const email = tokens.get(token);
    if (!email) return json(res, 401, { message: "Unauthenticated.", code: "unauthenticated" });
    const { merchant } = users[email].user;
    if (!merchant || merchant.status !== "active") {
      return json(res, 403, { message: "Merchant inactive.", code: "merchant_inactive" });
    }
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
