import type { Unit, UnitType } from "./types";

/** Display labels for a unit dropdown — kept short since they always sit next to a quantity input. */
export const UNIT_LABELS: Record<Unit, string> = {
  mg: "mg",
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "L",
  pcs: "pcs",
};

export const UNIT_TYPE_OPTIONS: { value: UnitType; label: string }[] = [
  { value: "mass", label: "Mass (mg / g / kg)" },
  { value: "volume", label: "Volume (ml / L)" },
  { value: "count", label: "Count (pcs)" },
];

/** The units belonging to one family, for building a dropdown before an ingredient's `available_units` is known (e.g. the add-ingredient form's display-unit field, keyed off the unit_type the user just picked). */
export const UNITS_BY_TYPE: Record<UnitType, Unit[]> = {
  mass: ["mg", "g", "kg"],
  volume: ["ml", "l"],
  count: ["pcs"],
};
