import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuthStore, selectHasPermission, useCan } from "./store";
import {
  MANAGER_PRESET,
  MERCHANT_PERMISSION_VALUES,
  OWNER_PRESET,
  STAFF_PRESET,
  accessLevelFor,
} from "./permissions";

const baseUser = {
  id: 1,
  name: "Merchant One",
  email: "merchant@gasa.test",
  roles: [] as string[],
  merchant: { id: 1, name: "Merchant One", status: "active" as const },
};

describe("selectHasPermission / useCan", () => {
  it("is true when the permission is present", () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: { ...baseUser, permissions: ["orders.void"] },
      sessionNotice: null,
    });
    expect(selectHasPermission("orders.void")(useAuthStore.getState())).toBe(true);
  });

  it("is false when the permission is absent", () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: { ...baseUser, permissions: ["orders.view"] },
      sessionNotice: null,
    });
    expect(selectHasPermission("orders.void")(useAuthStore.getState())).toBe(false);
  });

  it("is false when permissions is empty (no active merchant)", () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: { ...baseUser, merchant: null, permissions: [] },
      sessionNotice: null,
    });
    expect(selectHasPermission("orders.view")(useAuthStore.getState())).toBe(false);
  });

  it("is false for a guest with no user at all", () => {
    useAuthStore.setState({ status: "guest", token: null, user: null, sessionNotice: null });
    expect(selectHasPermission("orders.view")(useAuthStore.getState())).toBe(false);
  });

  it("useCan reads live from the store", () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: { ...baseUser, permissions: ["reports.view"] },
      sessionNotice: null,
    });
    const { result } = renderHook(() => useCan("reports.view"));
    expect(result.current).toBe(true);

    const { result: absent } = renderHook(() => useCan("team.manage"));
    expect(absent.current).toBe(false);
  });
});

describe("role presets", () => {
  it("owner holds every catalog permission", () => {
    expect(OWNER_PRESET).toHaveLength(MERCHANT_PERMISSION_VALUES.length);
  });

  it("manager holds everything except profile.edit and team.manage", () => {
    expect(MANAGER_PRESET).not.toContain("profile.edit");
    expect(MANAGER_PRESET).not.toContain("team.manage");
    expect(MANAGER_PRESET).toHaveLength(MERCHANT_PERMISSION_VALUES.length - 2);
  });

  it("staff holds exactly the till-facing subset", () => {
    expect([...STAFF_PRESET].sort()).toEqual(
      [
        "orders.view",
        "orders.create",
        "orders.complete",
        "queue.view",
        "menu.view",
        "drawer.view",
        "drawer.open",
        "drawer.movements",
        "remittances.create",
      ].sort(),
    );
    expect(STAFF_PRESET).not.toContain("orders.void");
    expect(STAFF_PRESET).not.toContain("drawer.close");
    expect(STAFF_PRESET).not.toContain("remittances.confirm");
    expect(STAFF_PRESET).not.toContain("reports.view");
  });
});

describe("accessLevelFor", () => {
  it("names staff access for a staff-preset permission", () => {
    expect(accessLevelFor("orders.complete")).toBe("staff access");
  });

  it("names manager access for a manager-only permission", () => {
    expect(accessLevelFor("orders.void")).toBe("manager access");
  });

  it("names owner access for an owner-only permission", () => {
    expect(accessLevelFor("team.manage")).toBe("owner access");
  });
});
