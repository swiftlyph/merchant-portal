import { IconAlertTriangle } from "@tabler/icons-react";
import { formatDateTime } from "../format";

/**
 * A voided order's receipt still returns 200 (see ReceiptResource) so a
 * reprint always works — this banner is the ONLY thing that stops a voided
 * reprint from passing as a real sale. Deliberately loud (destructive
 * colors, large type) and rendered both above the receipt body and again
 * below it (see ReceiptPage), so it can't be missed by only glancing at
 * the top or torn off before reading the bottom.
 */
export function VoidedBanner({ voidedAt }: { voidedAt: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1 border-2 border-destructive bg-destructive/10 px-3 py-2 text-center text-destructive">
      <div className="flex items-center gap-1 text-base font-bold tracking-widest">
        <IconAlertTriangle className="size-4" />
        VOIDED
      </div>
      {voidedAt && <span className="text-[10px]">Voided {formatDateTime(voidedAt)}</span>}
    </div>
  );
}
