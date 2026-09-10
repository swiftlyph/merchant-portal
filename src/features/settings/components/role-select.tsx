import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_IN_MERCHANT_VALUES, type RoleInMerchant } from "../types";
import { ROLE_LABEL } from "../format";

export function RoleSelect({
  value,
  onValueChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: RoleInMerchant;
  onValueChange: (value: RoleInMerchant) => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as RoleInMerchant)} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_IN_MERCHANT_VALUES.map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABEL[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
