/** Standard dinner plate and ISO/IEC 7810 ID-1 card, in centimetres. */
export const PLATE_CM = 27;
export const CARD_CM = { width: 8.6, height: 5.4 } as const;

export type SizeGuideItem = {
  key: "dish" | "plate" | "card";
  label: string;
  shape: "circle" | "rect";
  widthCm: number;
  heightCm: number;
  /** Largest side relative to the largest object in the guide (0..1]. */
  ratio: number;
};

export type SizeGuide = { maxCm: number; items: SizeGuideItem[] };

export function buildSizeGuide(dishDiameterCm: number): SizeGuide {
  const maxCm = Math.max(dishDiameterCm, PLATE_CM);
  const item = (
    key: SizeGuideItem["key"],
    label: string,
    shape: SizeGuideItem["shape"],
    widthCm: number,
    heightCm: number,
  ): SizeGuideItem => ({ key, label, shape, widthCm, heightCm, ratio: Math.max(widthCm, heightCm) / maxCm });
  return {
    maxCm,
    items: [
      item("plate", "Plato llano", "circle", PLATE_CM, PLATE_CM),
      item("dish", "Este plato", "circle", dishDiameterCm, dishDiameterCm),
      item("card", "Tarjeta de crédito", "rect", CARD_CM.width, CARD_CM.height),
    ],
  };
}
