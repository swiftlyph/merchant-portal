/** e.g. "Sep 9, 2026, 2:30 PM" — matches orders/format.ts's convention. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * "order.checked_out" -> "Order checked out". Action names are a fixed,
 * backend-defined catalog (App\Domains\Merchant\Support\MerchantAuditAction)
 * but new cases are added over time as more actions get audited — this
 * derives a readable label mechanically instead of requiring a matching
 * frontend label map to be kept in sync with every new backend case.
 */
export function formatActionLabel(action: string): string {
  const [noun, ...rest] = action.split(".");
  if (rest.length === 0) return action;
  const verb = rest.join(" ").replace(/_/g, " ");
  return `${capitalize(noun ?? "")} ${verb}`;
}

function capitalize(word: string): string {
  const first = word.charAt(0);
  return first === "" ? word : first.toUpperCase() + word.slice(1);
}

/** The noun before the first dot, e.g. "order.voided" -> "order" — used to color-code the action badge by domain. */
export function actionDomain(action: string): string {
  return action.split(".")[0] ?? "";
}
