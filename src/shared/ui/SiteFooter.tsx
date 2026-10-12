import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="reveal mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3">
        <div className="space-y-3">
          <p className="font-display text-2xl">
            Ember <span className="text-accent">&amp;</span> Salt
          </p>
          <p className="max-w-xs text-sm text-muted">Comida cocinada al fuego, ingredientes honestos y cada plato visible a su tamaño real antes de pedir.</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Visítanos</p>
          <p className="text-muted">Calle Harbor 214</p>
          <p className="text-muted">Riverside</p>
          <p className="text-muted">(555) 014-2290</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">Explora</p>
          <p>
            <Link href="/menu" className="text-muted hover:text-ink">
              Menú
            </Link>
          </p>
          <p>
            <Link href="/order" className="text-muted hover:text-ink">
              Estado del pedido
            </Link>
          </p>
          <p>
            <Link href="/login" className="text-muted hover:text-ink">
              Acceso del personal
            </Link>
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted">
          Modelos 3D: Poly Haven (CC0), Khronos glTF Sample Assets (CC0). Fotografía: Unsplash y Poly Haven.
        </p>
      </div>
    </footer>
  );
}
