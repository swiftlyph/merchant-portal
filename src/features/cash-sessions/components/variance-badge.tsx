import { describeVariance } from "../errors";

/** Small inline over/short/exact label used in the history table. */
export function VarianceBadge({ varianceCents }: { varianceCents: number | null }) {
  if (varianceCents === null) return <span className="text-muted-foreground">—</span>;
  const variance = describeVariance(varianceCents);
  return (
    <span
      className={
        variance.label === "exact"
          ? "text-success"
          : variance.label === "over"
            ? "text-info"
            : "text-destructive"
      }
    >
      {variance.text}
    </span>
  );
}
