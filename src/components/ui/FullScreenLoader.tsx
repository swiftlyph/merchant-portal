import { Loader2 } from "lucide-react";

/** Shown while auth status is "booting" — a solid surface, never glass. */
export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2
        className="size-10 animate-spin text-primary"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
