const PER_LETTER = 999;

/** 1 -> "A-001", 999 -> "A-999", 1000 -> "B-001"; wraps after Z. */
export function formatOrderCode(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError("La secuencia de la orden debe ser un entero positivo");
  }
  const index = sequence - 1;
  const letter = String.fromCharCode(65 + (Math.floor(index / PER_LETTER) % 26));
  const number = (index % PER_LETTER) + 1;
  return `${letter}-${String(number).padStart(3, "0")}`;
}
