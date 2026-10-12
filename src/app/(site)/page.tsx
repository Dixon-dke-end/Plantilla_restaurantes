import type { CSSProperties } from "react";
import Link from "next/link";
import { FeaturedDishes } from "@/modules/menu/ui/FeaturedDishes";
import { LinkButton } from "@/shared/ui/Button";
import { PageTransition } from "@/shared/ui/PageTransition";

const HERO = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=2000&q=80";
const INTERIOR = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80";

const HOURS: Array<[string, string]> = [
  ["Lunes", "Cerrado"],
  ["Martes – Jueves", "11:30 – 22:00"],
  ["Viernes – Sábado", "11:30 – 23:00"],
  ["Domingo", "11:00 – 21:00"],
];

/** Staggers the one-time hero entrance (see `.hero-in` in globals.css). */
const heroStep = (i: number): CSSProperties => ({ "--hero-i": i }) as CSSProperties;
/** Offsets a revealed block by one step relative to its sibling (see `.reveal` in globals.css). */
const revealStep = (i: number): CSSProperties => ({ "--reveal-i": i }) as CSSProperties;

export default function HomePage() {
  return (
    <PageTransition>
      <section className="relative isolate flex min-h-[78dvh] items-end overflow-hidden bg-ink text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO} alt="" className="absolute inset-0 -z-10 size-full object-cover" fetchPriority="high" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
        <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-32 sm:pb-20">
          <p className="hero-in mb-4 text-sm uppercase tracking-[0.2em] text-white/80" style={heroStep(0)}>
            Parrilla y bistró
          </p>
          <h1 className="hero-in max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl" style={heroStep(1)}>
            Fuego, sal y un lugar en tu mesa.
          </h1>
          <p className="hero-in mt-5 max-w-xl text-lg text-white/85" style={heroStep(2)}>
            Cocinado sobre brasas de roble y servido con honestidad. Antes de pedir, coloca cualquier plato sobre tu mesa en realidad aumentada, a su
            tamaño real.
          </p>
          <div className="hero-in mt-8 flex flex-wrap gap-3" style={heroStep(3)}>
            <LinkButton href="/menu" size="lg">
              Explorar el menú
            </LinkButton>
            <LinkButton href="/menu?ar=1" size="lg" variant="secondary" className="border-white/30 bg-white/10 text-white backdrop-blur hover:border-white/60">
              Ver en tu mesa (AR)
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-8 px-4 pt-20" aria-labelledby="featured-heading">
        <div className="reveal flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted">Destacados</p>
            <h2 id="featured-heading" className="mt-2 font-display text-4xl">
              Los favoritos de hoy
            </h2>
          </div>
          <Link href="/menu" className="inline-flex min-h-11 items-center text-sm font-medium text-accent-strong underline-offset-4 hover:underline">
            Ver el menú completo
          </Link>
        </div>
        <FeaturedDishes />
      </section>

      <section className="mx-auto mt-24 grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2" aria-labelledby="story-heading">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={INTERIOR}
          alt="El comedor de Ember & Salt"
          loading="lazy"
          className="reveal reveal-media aspect-[4/3] w-full rounded-[14px] object-cover"
        />
        <div className="reveal space-y-5">
          <p className="text-sm uppercase tracking-[0.2em] text-muted">Nuestra historia</p>
          <h2 id="story-heading" className="font-display text-4xl leading-tight">
            Comida sencilla, bien cocinada.
          </h2>
          <p className="text-muted">
            Ember &amp; Salt nació con una parrilla de roble y una lista corta de platos de los que nos sentíamos orgullosos. Hoy el menú cambia con
            la temporada, pero el enfoque es el mismo: grandes ingredientes, fuego paciente y nada que no tenga que estar ahí.
          </p>
          <p className="text-muted">
            Escaneamos en 3D nuestros platos insignia para que veas exactamente su tamaño antes de pedir. Apunta tu teléfono a la mesa y el plato
            aparece a su tamaño real.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-24 grid max-w-6xl gap-10 px-4 sm:grid-cols-2" aria-labelledby="visit-heading">
        <div className="reveal space-y-4">
          <h2 id="visit-heading" className="font-display text-3xl">
            Horario
          </h2>
          <dl className="divide-y divide-line rounded-[14px] border border-line bg-surface">
            {HOURS.map(([day, hours]) => (
              <div key={day} className="flex items-center justify-between px-5 py-3.5 text-sm">
                <dt className="text-muted">{day}</dt>
                <dd className="font-medium tabular-nums">{hours}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="reveal space-y-4" style={revealStep(1)}>
          <h2 className="font-display text-3xl">Encuéntranos</h2>
          <address className="space-y-1 rounded-[14px] border border-line bg-surface px-5 py-4 text-sm not-italic">
            <p className="font-medium">Calle Harbor 214</p>
            <p className="text-muted">Riverside</p>
            <p className="pt-2 text-muted">(555) 014-2290</p>
            <p className="text-muted">hola@embersalt.example</p>
          </address>
        </div>
      </section>
    </PageTransition>
  );
}
