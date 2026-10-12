import type { SizeMeters } from "./types";

export type Calibration = {
  /** Factor to multiply the model by so it matches the real dish. */
  scale: number;
  /** How far the model is from the real dimensions, in percent (worst of diameter/height). */
  mismatchPct: number;
};

/** Above this mismatch the admin form recommends calibrating. */
export const MISMATCH_WARNING_PCT = 10;

const isPositive = (n: number) => Number.isFinite(n) && n > 0;

/**
 * Computes the uniform scale that makes a model match the real dish.
 *
 * `modelSizeMeters` is the model's current bounding box as it renders (Y is up), i.e. already
 * multiplied by any existing model_scale. The result is the *additional* factor to apply.
 * The diameter is taken as the larger horizontal side (x or z). When a real height is given,
 * the diameter and height factors are blended with a geometric mean, which splits the error
 * evenly when the scan has slightly different proportions than the measured dish.
 */
export function calibrateScale(
  modelSizeMeters: SizeMeters,
  realDiameterCm: number,
  realHeightCm?: number,
): Calibration {
  const { x, y, z } = modelSizeMeters;
  const footprintM = Math.max(x, z);
  if (![x, y, z].every((n) => Number.isFinite(n) && n >= 0) || footprintM <= 0) {
    throw new RangeError("El tamaño del modelo debe ser finito y con una base positiva");
  }
  if (!isPositive(realDiameterCm)) {
    throw new RangeError("El diámetro real debe ser un número positivo");
  }
  const footprintCm = footprintM * 100;
  const diameterScale = realDiameterCm / footprintCm;
  let mismatchPct = (Math.abs(footprintCm - realDiameterCm) / realDiameterCm) * 100;
  let scale = diameterScale;

  if (realHeightCm !== undefined) {
    if (!isPositive(realHeightCm) || y <= 0) {
      throw new RangeError("La altura real debe ser positiva y el modelo debe tener altura");
    }
    const heightCm = y * 100;
    const heightScale = realHeightCm / heightCm;
    scale = Math.sqrt(diameterScale * heightScale);
    mismatchPct = Math.max(mismatchPct, (Math.abs(heightCm - realHeightCm) / realHeightCm) * 100);
  }

  return { scale, mismatchPct };
}

/** Bounding box in centimetres after applying a scale factor. */
export function scaledSizeCm(sizeMeters: SizeMeters, scale: number): SizeMeters {
  return { x: sizeMeters.x * 100 * scale, y: sizeMeters.y * 100 * scale, z: sizeMeters.z * 100 * scale };
}
