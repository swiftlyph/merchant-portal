import type { PropsWithChildren } from "react";

/**
 * Wraps a print view's content as a receipt-width column, both on screen
 * (what you see is what prints) and under @media print (see index.css's
 * `.print-frame`/`.print-hide` rules). `width` picks the physical paper
 * size the shop's printer takes — 80mm is the default; 58mm is the
 * narrower thermal-roll variant some printers use.
 *
 * Forced to light, high-contrast colors even in dark mode: a receipt
 * printer has no concept of a dark theme, and print.css's own forced
 * light-mode rule only applies inside an actual print, so this class also
 * carries the light look on screen for a true print preview.
 */
export function PrintFrame({
  width = "80mm",
  children,
}: PropsWithChildren<{ width?: "80mm" | "58mm" }>) {
  return (
    <div
      className="print-frame mx-auto flex flex-col gap-3 border border-dashed border-border bg-white p-4 font-mono text-xs text-black print:border-none print:p-0"
      style={{ maxWidth: width === "58mm" ? "58mm" : "80mm", width: "100%" }}
    >
      {children}
    </div>
  );
}
