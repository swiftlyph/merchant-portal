/** Shown while auth status is "booting" — a solid surface, never glass. */
export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-100">
      <span
        className="loading loading-spinner loading-lg text-primary"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
