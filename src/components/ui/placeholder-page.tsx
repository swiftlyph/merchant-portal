interface PlaceholderPageProps {
  title: string;
}

/**
 * Stand-in content for a nav destination that doesn't have a real page yet.
 * Swap out per-route once each section is built.
 */
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">This section is coming soon.</p>
    </div>
  );
}
