export type Fulfillment = { type: "dine_in"; table: string } | { type: "pickup" };

export const PICKUP_LABEL = "Para llevar";
export const TABLE_PREFIX = "Mesa";

/** Labels stored before the UI was translated. Still parsed and displayed in Spanish. */
const LEGACY_PICKUP_LABEL = "Pickup";
const LEGACY_TABLE = /^table\s+(.+)$/i;
const TABLE = /^(?:mesa|table)\s+(.+)$/i;

export function fulfillmentToLabel(f: Fulfillment): string {
  return f.type === "pickup" ? PICKUP_LABEL : `${TABLE_PREFIX} ${f.table.trim()}`;
}

const isPickup = (label: string) => {
  const lower = label.trim().toLowerCase();
  return lower === PICKUP_LABEL.toLowerCase() || lower === LEGACY_PICKUP_LABEL.toLowerCase();
};

/** Inverse of fulfillmentToLabel, used by the HTTP adapter to talk to the API. */
export function labelToFulfillment(label: string): Fulfillment {
  const trimmed = label.trim();
  if (isPickup(trimmed)) return { type: "pickup" };
  const match = TABLE.exec(trimmed);
  return { type: "dine_in", table: (match ? match[1] : trimmed).trim() };
}

/** Shows a stored label in Spanish, including orders saved with the former English labels. */
export function displayTableLabel(label: string): string {
  const trimmed = label.trim();
  if (isPickup(trimmed)) return PICKUP_LABEL;
  const legacy = LEGACY_TABLE.exec(trimmed);
  return legacy ? `${TABLE_PREFIX} ${legacy[1].trim()}` : trimmed;
}
