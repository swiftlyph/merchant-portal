import { describe, expect, it } from "vitest";
import type { RouteObject } from "react-router-dom";
import { router } from "./router";
import { RequirePermission } from "@/features/auth/require-permission";

/**
 * Route-level smoke test: confirms /app/pos and /app/reports are actually
 * wrapped in RequirePermission with the right permission, rather than
 * relying only on RequirePermission's own unit test (which proves the
 * component works, not that the router wires it in). Inspects the route
 * tree's React elements directly — this repo has no full-router rendering
 * test elsewhere, and mounting the whole router would need mocking every
 * page's API module for no extra confidence here.
 *
 * router.routes is typed as the framework-agnostic AgnosticRouteObject[]
 * (no `element` field) even though createBrowserRouter was actually called
 * with react-router-dom's own RouteObject[] (router.tsx) — cast back to
 * that DOM-specific type, which is what this router really holds.
 */
function findRouteElement(path: string): React.ReactElement<{ permission: string }> {
  const routes = router.routes as unknown as RouteObject[];
  const appRoute = routes.find((r) => r.path === "/app");
  const match = appRoute?.children?.find((r) => r.path === path);
  if (!match || match.index || !match.element) {
    throw new Error(`No route element found for path "${path}"`);
  }
  return match.element as React.ReactElement<{ permission: string }>;
}

describe("router permission guards", () => {
  it("guards /app/pos with RequirePermission(orders.create)", () => {
    const element = findRouteElement("pos");
    expect(element.type).toBe(RequirePermission);
    expect(element.props.permission).toBe("orders.create");
  });

  it("guards /app/reports with RequirePermission(reports.view)", () => {
    const element = findRouteElement("reports");
    expect(element.type).toBe(RequirePermission);
    expect(element.props.permission).toBe("reports.view");
  });
});
