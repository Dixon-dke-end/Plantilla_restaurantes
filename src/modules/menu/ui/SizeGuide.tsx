import { buildSizeGuide } from "../domain/sizeGuide";

const VIEW = 320;
const PAD = 12;

/** Top-down comparison of the dish against a 27 cm dinner plate (plato llano) and an 8.6 cm credit card, to scale. */
export function SizeGuide({ diameterCm }: { diameterCm: number }) {
  const guide = buildSizeGuide(diameterCm);
  const px = (cm: number) => (cm / guide.maxCm) * (VIEW - PAD * 2);
  const cx = VIEW / 2;
  const cy = VIEW / 2;
  const plate = guide.items.find((i) => i.key === "plate")!;
  const dish = guide.items.find((i) => i.key === "dish")!;
  const card = guide.items.find((i) => i.key === "card")!;

  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        role="img"
        aria-label={`Guía de tamaño: este plato mide ${diameterCm} centímetros de diámetro, comparado con un plato llano de ${plate.widthCm} centímetros y una tarjeta de crédito.`}
        className="mx-auto w-full max-w-[280px]"
      >
        <circle cx={cx} cy={cy} r={px(plate.widthCm) / 2} fill="var(--color-surface)" stroke="var(--color-line)" strokeWidth="2" />
        <circle
          cx={cx}
          cy={cy}
          r={px(dish.widthCm) / 2}
          fill="var(--color-accent-soft)"
          stroke="var(--color-accent)"
          strokeWidth="2"
        />
        <rect
          x={cx - px(card.widthCm) / 2}
          y={cy + px(plate.widthCm) / 2 - px(card.heightCm) - 6}
          width={px(card.widthCm)}
          height={px(card.heightCm)}
          rx="3"
          fill="var(--color-ink)"
          opacity="0.85"
        />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-accent-strong)">
          {diameterCm} cm
        </text>
        <text x={cx} y={PAD + 10} textAnchor="middle" fontSize="11" fill="var(--color-muted)">
          {plate.label} {plate.widthCm} cm
        </text>
      </svg>
      <figcaption className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-full border border-accent bg-accent-soft" /> {dish.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-full border border-line bg-surface" /> {plate.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-3 rounded-[2px] bg-ink/85" /> {card.label}
        </span>
      </figcaption>
    </figure>
  );
}
