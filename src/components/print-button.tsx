import { IconPrinter } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

/**
 * The one "Print" trigger pattern for F11: opens the browser's own print
 * dialog via window.print() — no popups, no new tabs, no PDF generation.
 * `size="lg"` is for the POS success screen, where this is the button a
 * cashier actually uses mid-rush and needs to hit fast without hunting for
 * it; the default size fits a detail page's action row instead.
 */
export function PrintButton({
  label = "Print",
  size = "default",
  className,
}: {
  label?: string;
  size?: "default" | "lg";
  className?: string;
}) {
  return (
    <Button
      type="button"
      size={size}
      className={cn(size === "lg" && "h-14 w-full text-base", className)}
      onClick={() => window.print()}
    >
      <IconPrinter />
      {label}
    </Button>
  );
}
