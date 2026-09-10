import type { RoleInMerchant } from "./types";

export const ROLE_LABEL: Record<RoleInMerchant, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
