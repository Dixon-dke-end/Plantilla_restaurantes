/** Small deterministic PRNG (mulberry32). Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeighted<T>(items: readonly T[], weights: readonly number[], rand: () => number): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    if (weights[i] <= 0) continue;
    r -= weights[i];
    if (r < 0) return items[i];
  }
  // Floating point fall-through: return the last positive-weight item.
  for (let i = items.length - 1; i >= 0; i--) if (weights[i] > 0) return items[i];
  return items[0];
}

export function randInt(min: number, max: number, rand: () => number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
