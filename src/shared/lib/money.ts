const usd = new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" });

export function formatMoney(cents: number): string {
  return usd.format(cents / 100);
}

/** "$1,234.56" | "12.5" -> cents. Returns null for anything that is not a non-negative amount. */
export function parsePriceToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

/** Cents -> "12.50" for form inputs. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
