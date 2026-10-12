import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-muted">404</p>
        <h1 className="font-display text-5xl">Mesa no encontrada</h1>
        <p className="text-muted">La página que buscas no está en el menú.</p>
        <Link href="/" className="inline-flex min-h-11 items-center text-accent-strong underline underline-offset-4">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
