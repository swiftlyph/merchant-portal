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
 * POST /auth/logout, full CRUD on /merchant/products (plus its recipe
 * endpoint) and /merchant/ingredients (both from the README's "Products" /
 * "Ingredients" sections), and a generic /merchant/* stub for exercising
 * the merchant_inactive path. Extend it as later phases add endpoints.
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

// Money mirrors the orders contract: integer cents plus a server-formatted
// string, so the SPA never formats from a float.
function peso(cents) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    currencyDisplay: "narrowSymbol",
  }).format(cents / 100);
}

const SEEDED_AT = "2026-09-09T02:15:00.000Z";

// Mirrors gasa-api config/catalog.php: the fixed category list and the
// prefix each one's product IDs are issued with.
const CATEGORIES = [
  { name: "Drinks", prefix: "DRK" },
  { name: "Snacks", prefix: "SNK" },
  { name: "Bakery", prefix: "BKY" },
  { name: "Food", prefix: "FOD" },
  { name: "Retail", prefix: "RTL" },
];

// prefix -> last number issued. Seeded lazily from the existing products so
// the first new Drinks item after the seed continues the sequence. Like the
// real counter, it never goes backwards after a delete.
const codeCounters = new Map();

function nextCode(category) {
  const { prefix } = CATEGORIES.find((c) => c.name === category);
  if (!codeCounters.has(prefix)) {
    const used = products
      .filter((p) => p.code.startsWith(`${prefix}-`))
      .map((p) => Number(p.code.slice(prefix.length + 1)));
    codeCounters.set(prefix, Math.max(0, ...used));
  }
  const number = codeCounters.get(prefix) + 1;
  codeCounters.set(prefix, number);
  return `${prefix}-${String(number).padStart(3, "0")}`;
}

// Mirrors gasa-api's App\Domains\Catalog\Enums\Unit exactly: conversion is
// exact integer multiplication, and only ever within one family (mass,
// volume, count never mix — see that enum's docblock). Everything below is
// stored in base units (mg/ml/pcs), same as the real API.
const UNIT_FAMILY = { mg: "mass", g: "mass", kg: "mass", ml: "volume", l: "volume", pcs: "count" };
const UNIT_FACTOR = { mg: 1, g: 1_000, kg: 1_000_000, ml: 1, l: 1_000, pcs: 1 };
const UNITS_BY_TYPE = { mass: ["mg", "g", "kg"], volume: ["ml", "l"], count: ["pcs"] };

function toBaseUnits(quantity, unit) {
  return quantity * UNIT_FACTOR[unit];
}

/** Display-only division, exactly like the real Unit::formatQuantity — never fed back into stored math. */
function formatQuantity(baseUnitQuantity, unit) {
  const factor = UNIT_FACTOR[unit];
  if (baseUnitQuantity % factor === 0) return String(baseUnitQuantity / factor);
  return String(Math.round((baseUnitQuantity / factor) * 1000) / 1000);
}

let nextIngredientId = 7;

const ingredients = [
  { id: 1, name: "Matcha Powder", unit_type: "mass", display_unit: "kg", quantity_on_hand: toBaseUnits(5, "kg"), low_stock_threshold: toBaseUnits(1, "kg") },
  { id: 2, name: "Milk", unit_type: "volume", display_unit: "l", quantity_on_hand: toBaseUnits(5, "l"), low_stock_threshold: toBaseUnits(1, "l") },
  { id: 3, name: "Cups (16oz)", unit_type: "count", display_unit: "pcs", quantity_on_hand: 200, low_stock_threshold: 50 },
  { id: 4, name: "Croissant Dough", unit_type: "count", display_unit: "pcs", quantity_on_hand: 24, low_stock_threshold: 5 },
  { id: 5, name: "Bagel", unit_type: "count", display_unit: "pcs", quantity_on_hand: 3, low_stock_threshold: 5 },
  { id: 6, name: "Blueberry Muffin", unit_type: "count", display_unit: "pcs", quantity_on_hand: 0, low_stock_threshold: 4 },
];

function ingredientCode(ingredient) {
  return String(ingredient.id).padStart(4, "0");
}

function ingredientStockStatus(ingredient) {
  if (ingredient.quantity_on_hand <= 0) return "out_of_stock";
  if (ingredient.quantity_on_hand <= ingredient.low_stock_threshold) return "low_stock";
  return "in_stock";
}

function withIngredientFormatting(ingredient) {
  return {
    id: ingredient.id,
    code: ingredientCode(ingredient),
    name: ingredient.name,
    unit_type: ingredient.unit_type,
    display_unit: ingredient.display_unit,
    quantity_on_hand: ingredient.quantity_on_hand,
    quantity_on_hand_formatted: formatQuantity(ingredient.quantity_on_hand, ingredient.display_unit),
    low_stock_threshold: ingredient.low_stock_threshold,
    low_stock_threshold_formatted: formatQuantity(ingredient.low_stock_threshold, ingredient.display_unit),
    stock_status: ingredientStockStatus(ingredient),
    available_units: UNITS_BY_TYPE[ingredient.unit_type],
    created_at: SEEDED_AT,
    updated_at: SEEDED_AT,
  };
}

const products = [
  { id: 1, name: "Iced Latte", code: "DRK-001", category: "Drinks", price: 15000 },
  { id: 2, name: "Americano", code: "DRK-002", category: "Drinks", price: 12000 },
  { id: 3, name: "Matcha Latte", code: "DRK-003", category: "Drinks", price: 16500 },
  { id: 4, name: "Croissant", code: "BKY-001", category: "Bakery", price: 8500 },
  { id: 5, name: "Bagel", code: "BKY-002", category: "Bakery", price: 7000 },
  { id: 6, name: "Blueberry Muffin", code: "BKY-003", category: "Bakery", price: 7500 },
  { id: 7, name: "Ham & Cheese Sandwich", code: "FOD-001", category: "Food", price: 18000 },
  { id: 8, name: "Bottled Water", code: "RTL-001", category: "Retail", price: 3000 },
  { id: 9, name: "Pumpkin Spice Latte", code: "DRK-004", category: "Drinks", price: 17500, status: "inactive" },
].map((p) => ({
  id: p.id,
  name: p.name,
  code: p.code,
  category: p.category,
  description: null,
  currency: "PHP",
  price_cents: p.price,
  price_formatted: peso(p.price),
  status: p.status ?? "active",
  created_at: SEEDED_AT,
  updated_at: SEEDED_AT,
}));

let nextProductId = 10;

// One row per recipe line: what one sale of a product consumes. Matches
// gasa-api's CatalogDemoSeeder — Matcha Latte's recipe is the feature's
// own worked example (matcha powder, milk, a cup — not ice/hot water,
// since those aren't stock-tracked). Croissant/Bagel/Blueberry Muffin
// each recipe a single self-named ingredient, the "simple resale item"
// pattern documented in gasa-api README § Catalog.
let nextRecipeItemId = 7;
const recipeItems = [
  { id: 1, product_id: 3, ingredient_id: 1, quantity: 30, unit: "g" },
  { id: 2, product_id: 3, ingredient_id: 2, quantity: 100, unit: "ml" },
  { id: 3, product_id: 3, ingredient_id: 3, quantity: 1, unit: "pcs" },
  { id: 4, product_id: 4, ingredient_id: 4, quantity: 1, unit: "pcs" },
  { id: 5, product_id: 5, ingredient_id: 5, quantity: 1, unit: "pcs" },
  { id: 6, product_id: 6, ingredient_id: 6, quantity: 1, unit: "pcs" },
];

function recipeItemsForProduct(productId) {
  return recipeItems
    .filter((item) => item.product_id === productId)
    .map((item) => {
      const ingredient = ingredients.find((i) => i.id === item.ingredient_id);
      return {
        id: item.id,
        ingredient_id: item.ingredient_id,
        ingredient_code: ingredientCode(ingredient),
        ingredient_name: ingredient.name,
        quantity: item.quantity,
        unit: item.unit,
        ingredient_stock_status: ingredientStockStatus(ingredient),
      };
    });
}

function productInStock(productId) {
  return recipeItemsForProduct(productId).every((line) => {
    const ingredient = ingredients.find((i) => i.id === line.ingredient_id);
    return ingredient.quantity_on_hand >= toBaseUnits(line.quantity, line.unit);
  });
}

/**
 * The real ProductResource embeds `in_stock` (derived from the recipe's
 * ingredients, vacuously true with none) and the recipe itself on every
 * product endpoint; mirror that here.
 */
function withRecipe(product) {
  return {
    ...product,
    in_stock: productInStock(product.id),
    recipe: recipeItemsForProduct(product.id),
  };
}

/** Laravel LengthAwarePaginator envelope over an in-memory array. */
function paginate(rows, searchParams, path) {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? 25) || 25));
  const total = rows.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const data = rows.slice(start, start + perPage);
  const link = (p) => (p >= 1 && p <= lastPage ? `${path}?page=${p}` : null);
  return {
    data,
    links: { first: link(1), last: link(lastPage), prev: link(page - 1), next: link(page + 1) },
    meta: {
      current_page: page,
      from: data.length ? start + 1 : null,
      last_page: lastPage,
      links: [],
      path,
      per_page: perPage,
      to: data.length ? start + data.length : null,
      total,
    },
  };
}

/** Resolves the bearer token to a user record, or null. */
function authedUser(req) {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  const email = tokens.get(token);
  return email ? users[email].user : null;
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function validationFailed(res, errors) {
  return json(res, 422, { message: "The given data was invalid.", code: "validation_failed", errors });
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
    if (Object.keys(errors).length > 0) return validationFailed(res, errors);

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

  // Every /merchant/* route below shares the same gate the real merchant.api
  // group applies: 401 without a token, 403 merchant_inactive unless the
  // caller's merchant is active.
  if (url.startsWith("/api/v1/merchant/")) {
    const user = authedUser(req);
    if (!user) return json(res, 401, { message: "Unauthenticated.", code: "unauthenticated" });
    if (!user.merchant || user.merchant.status !== "active") {
      return json(res, 403, { message: "Merchant inactive.", code: "merchant_inactive" });
    }
  }

  const { pathname, searchParams } = new URL(url, "http://localhost");

  if (pathname === "/api/v1/merchant/catalog/categories" && req.method === "GET") {
    return json(res, 200, CATEGORIES);
  }

  if (pathname === "/api/v1/merchant/products" && req.method === "GET") {
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    if (status && status !== "active" && status !== "inactive") {
      return validationFailed(res, { status: ["The selected status is invalid."] });
    }
    const rows = products.filter(
      (p) => (!status || p.status === status) && (!category || p.category === category),
    );
    return json(res, 200, paginate(rows.map(withRecipe), searchParams, "/api/v1/merchant/products"));
  }

  if (pathname === "/api/v1/merchant/products" && req.method === "POST") {
    const body = await readBody(req);
    const errors = {};
    if (typeof body.name !== "string" || !body.name.trim()) {
      errors.name = ["The name field is required."];
    }
    if (!Number.isInteger(body.price_cents) || body.price_cents < 0) {
      errors.price_cents = ["The price cents field must be at least 0."];
    }
    if (body.status !== undefined && !["active", "inactive"].includes(body.status)) {
      errors.status = ["The selected status is invalid."];
    }
    if (!CATEGORIES.some((c) => c.name === body.category)) {
      errors.category = [
        body.category ? "The selected category is invalid." : "The category field is required.",
      ];
    }
    if (Object.keys(errors).length > 0) return validationFailed(res, errors);

    const now = new Date().toISOString();
    const product = {
      id: nextProductId++,
      name: body.name.trim(),
      code: nextCode(body.category),
      category: body.category,
      description: typeof body.description === "string" && body.description.trim() ? body.description : null,
      currency: "PHP",
      price_cents: body.price_cents,
      price_formatted: peso(body.price_cents),
      status: body.status ?? "active",
      created_at: now,
      updated_at: now,
    };
    products.push(product);

    return json(res, 201, withRecipe(product));
  }

  const productMatch = pathname.match(/^\/api\/v1\/merchant\/products\/(\d+)$/);
  if (productMatch && req.method === "GET") {
    const product = products.find((p) => p.id === Number(productMatch[1]));
    if (!product) return json(res, 404, { message: "Resource not found.", code: "not_found" });
    return json(res, 200, withRecipe(product));
  }

  if (productMatch && (req.method === "PATCH" || req.method === "PUT")) {
    const product = products.find((p) => p.id === Number(productMatch[1]));
    if (!product) return json(res, 404, { message: "Resource not found.", code: "not_found" });

    const body = await readBody(req);
    const errors = {};
    if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
      errors.name = ["The name field is required."];
    }
    if (
      body.price_cents !== undefined &&
      (!Number.isInteger(body.price_cents) || body.price_cents < 0)
    ) {
      errors.price_cents = ["The price cents field must be at least 0."];
    }
    if (body.status !== undefined && !["active", "inactive"].includes(body.status)) {
      errors.status = ["The selected status is invalid."];
    }
    if (body.category !== undefined && !CATEGORIES.some((c) => c.name === body.category)) {
      errors.category = ["The selected category is invalid."];
    }
    if (Object.keys(errors).length > 0) return validationFailed(res, errors);

    // id never changes. code is never accepted from the client, but IS
    // reissued from the new category whenever category actually changes
    // (including from none at all) — same rule as the real API.
    const categoryChanged = body.category !== undefined && body.category !== product.category;
    if (body.name !== undefined) product.name = body.name.trim();
    if (body.category !== undefined) product.category = body.category;
    if (body.description !== undefined) {
      product.description = typeof body.description === "string" && body.description.trim() ? body.description : null;
    }
    if (body.price_cents !== undefined) {
      product.price_cents = body.price_cents;
      product.price_formatted = peso(body.price_cents);
    }
    if (body.status !== undefined) product.status = body.status;
    if (categoryChanged) product.code = nextCode(body.category);
    product.updated_at = new Date().toISOString();

    return json(res, 200, withRecipe(product));
  }

  if (productMatch && req.method === "DELETE") {
    const index = products.findIndex((p) => p.id === Number(productMatch[1]));
    if (index === -1) return json(res, 404, { message: "Resource not found.", code: "not_found" });
    const [removed] = products.splice(index, 1);
    // Recipe lines cascade with the product, as the real FK does — the
    // ingredients themselves are untouched.
    for (let i = recipeItems.length - 1; i >= 0; i--) {
      if (recipeItems[i].product_id === removed.id) recipeItems.splice(i, 1);
    }
    res.writeHead(204);
    return res.end();
  }

  const recipeMatch = pathname.match(/^\/api\/v1\/merchant\/products\/(\d+)\/recipe$/);
  if (recipeMatch && req.method === "PUT") {
    const product = products.find((p) => p.id === Number(recipeMatch[1]));
    if (!product) return json(res, 404, { message: "Resource not found.", code: "not_found" });

    const body = await readBody(req);
    const lines = Array.isArray(body.ingredients) ? body.ingredients : null;
    if (!lines) return validationFailed(res, { ingredients: ["The ingredients field must be an array."] });

    const errors = {};
    const seenIngredientIds = new Set();
    lines.forEach((line, index) => {
      const ingredientId = Number(line?.ingredient_id);
      const ingredient = ingredients.find((i) => i.id === ingredientId);
      if (!Number.isInteger(ingredientId) || !ingredient) {
        errors[`ingredients.${index}.ingredient_id`] = ["The selected ingredient is invalid."];
      } else if (seenIngredientIds.has(ingredientId)) {
        errors[`ingredients.${index}.ingredient_id`] = [
          "The same ingredient can only appear once in a recipe.",
        ];
      } else {
        seenIngredientIds.add(ingredientId);
      }

      if (!Number.isInteger(line?.quantity) || line.quantity < 1) {
        errors[`ingredients.${index}.quantity`] = ["The quantity field must be at least 1."];
      }

      if (ingredient) {
        const unitFamily = UNIT_FAMILY[line?.unit];
        if (!unitFamily || unitFamily !== ingredient.unit_type) {
          errors[`ingredients.${index}.unit`] = [
            `This ingredient is tracked in ${ingredient.unit_type}; use one of: ${UNITS_BY_TYPE[ingredient.unit_type].join(", ")}.`,
          ];
        }
      }
    });
    if (Object.keys(errors).length > 0) return validationFailed(res, errors);

    for (let i = recipeItems.length - 1; i >= 0; i--) {
      if (recipeItems[i].product_id === product.id) recipeItems.splice(i, 1);
    }
    for (const line of lines) {
      recipeItems.push({
        id: nextRecipeItemId++,
        product_id: product.id,
        ingredient_id: Number(line.ingredient_id),
        quantity: line.quantity,
        unit: line.unit,
      });
    }
    product.updated_at = new Date().toISOString();

    return json(res, 200, withRecipe(product));
  }

  if (pathname === "/api/v1/merchant/ingredients" && req.method === "GET") {
    const status = searchParams.get("status");
    if (status && !["in_stock", "low_stock", "out_of_stock"].includes(status)) {
      return validationFailed(res, { status: ["The selected status is invalid."] });
    }
    const rows = ingredients.filter((row) => !status || ingredientStockStatus(row) === status);
    return json(
      res,
      200,
      paginate(rows.map(withIngredientFormatting), searchParams, "/api/v1/merchant/ingredients"),
    );
  }

  if (pathname === "/api/v1/merchant/ingredients" && req.method === "POST") {
    const body = await readBody(req);
    const errors = {};
    if (typeof body.name !== "string" || !body.name.trim()) {
      errors.name = ["The name field is required."];
    }
    const unitType = UNITS_BY_TYPE[body.unit_type] ? body.unit_type : null;
    if (!unitType) errors.unit_type = ["The selected unit type is invalid."];
    if (unitType && UNIT_FAMILY[body.display_unit] !== unitType) {
      errors.display_unit = [`The display unit must be a ${unitType} unit.`];
    }
    if (body.quantity_on_hand !== undefined && (!Number.isInteger(body.quantity_on_hand) || body.quantity_on_hand < 0)) {
      errors.quantity_on_hand = ["The quantity on hand field must be at least 0."];
    }
    if (body.low_stock_threshold !== undefined && (!Number.isInteger(body.low_stock_threshold) || body.low_stock_threshold < 0)) {
      errors.low_stock_threshold = ["The low stock threshold field must be at least 0."];
    }
    if (Object.keys(errors).length > 0) return validationFailed(res, errors);

    const displayUnit = body.display_unit;
    const ingredient = {
      id: nextIngredientId++,
      name: body.name.trim(),
      unit_type: unitType,
      display_unit: displayUnit,
      quantity_on_hand: toBaseUnits(body.quantity_on_hand ?? 0, displayUnit),
      low_stock_threshold: toBaseUnits(body.low_stock_threshold ?? 0, displayUnit),
    };
    ingredients.push(ingredient);

    return json(res, 201, withIngredientFormatting(ingredient));
  }

  const ingredientMatch = pathname.match(/^\/api\/v1\/merchant\/ingredients\/(\d+)$/);
  if (ingredientMatch && req.method === "GET") {
    const ingredient = ingredients.find((i) => i.id === Number(ingredientMatch[1]));
    if (!ingredient) return json(res, 404, { message: "Resource not found.", code: "not_found" });
    return json(res, 200, withIngredientFormatting(ingredient));
  }

  if (ingredientMatch && (req.method === "PATCH" || req.method === "PUT")) {
    const ingredient = ingredients.find((i) => i.id === Number(ingredientMatch[1]));
    if (!ingredient) return json(res, 404, { message: "Resource not found.", code: "not_found" });

    const body = await readBody(req);
    const errors = {};
    if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
      errors.name = ["The name field is required."];
    }
    // unit_type is deliberately never accepted here — immutable after
    // creation, same as the real API (see UpdateIngredientRequest).
    if (body.display_unit !== undefined && UNIT_FAMILY[body.display_unit] !== ingredient.unit_type) {
      errors.display_unit = [`The display unit must be a ${ingredient.unit_type} unit.`];
    }
    if (body.quantity_on_hand !== undefined && (!Number.isInteger(body.quantity_on_hand) || body.quantity_on_hand < 0)) {
      errors.quantity_on_hand = ["The quantity on hand field must be at least 0."];
    }
    if (body.low_stock_threshold !== undefined && (!Number.isInteger(body.low_stock_threshold) || body.low_stock_threshold < 0)) {
      errors.low_stock_threshold = ["The low stock threshold field must be at least 0."];
    }
    if (Object.keys(errors).length > 0) return validationFailed(res, errors);

    // A display-unit change is applied FIRST, so a quantity sent in the
    // same request converts through the NEW unit — matches
    // UpdateIngredientAction's ordering exactly.
    if (body.display_unit !== undefined) ingredient.display_unit = body.display_unit;
    if (body.name !== undefined) ingredient.name = body.name.trim();
    if (body.quantity_on_hand !== undefined) {
      ingredient.quantity_on_hand = toBaseUnits(body.quantity_on_hand, ingredient.display_unit);
    }
    if (body.low_stock_threshold !== undefined) {
      ingredient.low_stock_threshold = toBaseUnits(body.low_stock_threshold, ingredient.display_unit);
    }

    return json(res, 200, withIngredientFormatting(ingredient));
  }

  if (ingredientMatch && req.method === "DELETE") {
    const index = ingredients.findIndex((i) => i.id === Number(ingredientMatch[1]));
    if (index === -1) return json(res, 404, { message: "Resource not found.", code: "not_found" });
    const stillUsed = recipeItems.some((item) => item.ingredient_id === ingredients[index].id);
    if (stillUsed) {
      return json(res, 409, {
        message: "This ingredient is used in one or more product recipes and can't be deleted.",
        code: "ingredient_in_use",
      });
    }
    ingredients.splice(index, 1);
    res.writeHead(204);
    return res.end();
  }

  // Generic stub for any other /merchant/* route (orders, etc.) so the
  // mid-session defense-in-depth path (merchantGuard.ts) can be exercised
  // by hand against something. The auth/active gate already ran above.
  if (url.startsWith("/api/v1/merchant/")) {
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
