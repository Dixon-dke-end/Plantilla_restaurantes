"use client";

import { Box, Ruler, Smartphone } from "lucide-react";
import { useCallback, useEffect, useRef, useState, ViewTransition, type ReactNode } from "react";
import { cn } from "@/shared/ui/cn";
import { Img } from "@/shared/ui/Img";
import type { ModelViewerElement, Vector3D } from "@/types/model-viewer";
import { dishTransitionName, hasArModel } from "../domain/dish";
import type { Dish } from "../domain/types";
import { QrImage } from "./QrImage";

type Props = {
  dish: Pick<
    Dish,
    "name" | "imageUrl" | "modelGlbUrl" | "modelUsdzUrl" | "modelScale" | "diameterCm" | "slug"
  >;
  /** Called with the model's real-world size in centimetres once it has loaded. */
  onMeasured?: (sizeCm: Vector3D) => void;
  /** Called when the visitor starts an AR session (or taps the AR button). */
  onArLaunch?: () => void;
  /** `?ar=1`: scroll the AR call to action into view and highlight it on mobile. */
  promptAr?: boolean;
  /** Name the viewer for the shared-element view transition from the dish card image (customer page only). */
  morph?: boolean;
};

const HOTSPOTS = ["hotspot-a", "hotspot-b", "hotspot-c", "hotspot-d"] as const;

const fmtCm = (m: number) => `${(m * 100).toFixed(m * 100 >= 10 ? 0 : 1)} cm`;

/**
 * 3D / AR viewer built on <model-viewer>. ar-scale="fixed" keeps the dish at true size in AR.
 * `scale` (model_scale) calibrates the model in the browser and in WebXR; Android Scene Viewer and
 * iOS Quick Look load the file as-is, so uploaded GLBs get the scale baked in (see glb.ts).
 */
export function DishViewer({ dish, onMeasured, onArLaunch, promptAr, morph }: Props) {
  const ref = useRef<ModelViewerElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [defined, setDefined] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showDims, setShowDims] = useState(false);
  const [dims, setDims] = useState<Vector3D | null>(null);
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [arStatus, setArStatus] = useState<string>("not-presenting");

  const hasModel = hasArModel(dish) && Boolean(dish.modelGlbUrl);
  const s = dish.modelScale || 1;

  useEffect(() => {
    if (!hasModel) return;
    let active = true;
    // model-viewer touches `window`/customElements at import time, so it is client-only.
    import("@google/model-viewer").then(() => {
      if (active) setDefined(true);
    });
    return () => {
      active = false;
    };
  }, [hasModel]);

  const drawLines = useCallback(() => {
    const el = ref.current;
    const svg = svgRef.current;
    if (!el || !svg) return;
    const get = (n: string) => el.queryHotspot(n);
    const a = get("hotspot-a");
    const b = get("hotspot-b");
    const c = get("hotspot-c");
    const d = get("hotspot-d");
    const lines = svg.querySelectorAll("line");
    const set = (i: number, p?: ModelViewerHotspot2 | null, q?: ModelViewerHotspot2 | null) => {
      const line = lines[i];
      if (!line || !p || !q) return;
      line.setAttribute("x1", String(p.canvasPosition.x));
      line.setAttribute("y1", String(p.canvasPosition.y));
      line.setAttribute("x2", String(q.canvasPosition.x));
      line.setAttribute("y2", String(q.canvasPosition.y));
    };
    set(0, a, b); // width
    set(1, b, c); // height
    set(2, b, d); // depth
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !defined) return;

    const onLoad = () => {
      setLoaded(true);
      setArSupported(el.canActivateAR);
      const size = el.getDimensions(); // meters, already includes the `scale` attribute
      const center = el.getBoundingBoxCenter();
      setDims(size);
      onMeasured?.({ x: size.x * 100, y: size.y * 100, z: size.z * 100 });

      const x2 = size.x / 2;
      const y2 = size.y / 2;
      const z2 = size.z / 2;
      const pos = (x: number, y: number, z: number) => `${center.x + x} ${center.y + y} ${center.z + z}`;
      el.updateHotspot({ name: "hotspot-a", position: pos(-x2, -y2, z2) });
      el.updateHotspot({ name: "hotspot-b", position: pos(x2, -y2, z2) });
      el.updateHotspot({ name: "hotspot-c", position: pos(x2, y2, z2) });
      el.updateHotspot({ name: "hotspot-d", position: pos(x2, -y2, -z2) });
      el.updateHotspot({ name: "hotspot-w", position: pos(0, -y2, z2 + size.z * 0.12) });
      el.updateHotspot({ name: "hotspot-h", position: pos(x2 + size.x * 0.12, 0, z2) });
      el.updateHotspot({ name: "hotspot-l", position: pos(x2 + size.x * 0.12, -y2, 0) });
      drawLines();
    };
    const onArStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status: string }>).detail?.status ?? "";
      setArStatus(status);
      if (status === "session-started") onArLaunch?.();
    };

    el.addEventListener("load", onLoad);
    el.addEventListener("camera-change", drawLines);
    el.addEventListener("ar-status", onArStatus);
    if (el.loaded) onLoad();
    return () => {
      el.removeEventListener("load", onLoad);
      el.removeEventListener("camera-change", drawLines);
      el.removeEventListener("ar-status", onArStatus);
    };
  }, [defined, drawLines, onArLaunch, onMeasured]);

  // Pairs with the dish card image (same name) so it morphs into the viewer. Unique per slug.
  const withMorph = (node: ReactNode) =>
    morph ? (
      <ViewTransition name={dishTransitionName(dish.slug)} share="morph" default="none">
        {node}
      </ViewTransition>
    ) : (
      node
    );

  if (!hasModel) {
    return withMorph(
      <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
        <Img src={dish.imageUrl} alt={dish.name} fallbackLabel={dish.name} className="aspect-[4/3] w-full" priority />
      </div>,
    );
  }

  const desktopFallback = arSupported === false;

  return (
    <div className="space-y-3">
      {withMorph(
      <div className="relative overflow-hidden rounded-[14px] border border-line bg-[radial-gradient(circle_at_50%_35%,#fff,var(--color-paper))]">
        {defined ? (
          <model-viewer
            ref={ref}
            src={dish.modelGlbUrl ?? undefined}
            ios-src={dish.modelUsdzUrl ?? undefined}
            alt={`Modelo 3D de ${dish.name}`}
            poster={dish.imageUrl ?? undefined}
            camera-controls
            loading="eager"
            touch-action="pan-y"
            shadow-intensity="1"
            exposure="1"
            environment-image="neutral"
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="fixed"
            ar-placement="floor"
            scale={`${s} ${s} ${s}`}
            style={{ width: "100%", height: "min(70dvh, 520px)", minHeight: 320, background: "transparent" }}
          >
            <button
              slot="ar-button"
              type="button"
              onClick={onArLaunch}
              className={cn(
                "absolute bottom-4 left-1/2 inline-flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-on-accent shadow-lg",
                promptAr && "animate-pulse",
              )}
            >
              <Box size={18} aria-hidden /> Ver en tu mesa
            </button>
            {HOTSPOTS.map((name) => (
              <span
                key={name}
                slot={name}
                data-position="0 0 0"
                data-normal="0 1 0"
                className={cn("block size-2 rounded-full bg-ink transition-opacity", showDims ? "opacity-100" : "opacity-0")}
              />
            ))}
            <span slot="hotspot-w" data-position="0 0 0" data-normal="0 1 0" className={labelClass(showDims)}>
              Ancho {dims ? fmtCm(dims.x) : ""}
            </span>
            <span slot="hotspot-h" data-position="0 0 0" data-normal="0 1 0" className={labelClass(showDims)}>
              Alto {dims ? fmtCm(dims.y) : ""}
            </span>
            <span slot="hotspot-l" data-position="0 0 0" data-normal="0 1 0" className={labelClass(showDims)}>
              Prof. {dims ? fmtCm(dims.z) : ""}
            </span>
            <svg
              ref={svgRef}
              aria-hidden
              className={cn("pointer-events-none absolute inset-0 size-full transition-opacity", showDims ? "opacity-100" : "opacity-0")}
            >
              {[0, 1, 2].map((i) => (
                <line key={i} stroke="var(--color-ink)" strokeWidth="1.5" strokeDasharray="4 3" />
              ))}
            </svg>
          </model-viewer>
        ) : (
          <div className="grid aspect-[4/3] place-items-center text-sm text-muted">
            <Img src={dish.imageUrl} alt={dish.name} fallbackLabel={dish.name} className="size-full" priority />
          </div>
        )}
        {defined && !loaded ? (
          <p role="status" className="pointer-events-none absolute left-4 top-4 rounded-full bg-surface/90 px-3 py-1 text-xs text-muted">
            Cargando modelo 3D...
          </p>
        ) : null}
        {arStatus === "failed" ? (
          <p role="alert" className="absolute inset-x-4 top-4 rounded-[10px] bg-red-soft px-3 py-2 text-sm text-red">
            No se pudo iniciar la AR en este dispositivo. Aún puedes girar el modelo.
          </p>
        ) : null}
      </div>,
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={showDims}
          onClick={() => setShowDims((v) => !v)}
          disabled={!loaded}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-50",
            showDims ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink hover:border-ink/30",
          )}
        >
          <Ruler size={16} aria-hidden /> {showDims ? "Ocultar medidas" : "Mostrar medidas"}
        </button>
        <p className="text-sm text-muted">Arrastra para girar, pellizca para hacer zoom.</p>
      </div>

      {desktopFallback ? (
        <div className="flex items-center gap-4 rounded-[14px] border border-line bg-surface p-4">
          <QrImage text={`/menu/${dish.slug}?ar=1`} size={112} alt={`Código QR para abrir ${dish.name} en AR`} />
          <div>
            <p className="flex items-center gap-2 font-medium">
              <Smartphone size={16} aria-hidden /> Escanea con tu teléfono
            </p>
            <p className="mt-1 text-sm text-muted">
              La AR necesita un teléfono o una tableta. Escanea este código para colocar el plato sobre tu mesa a su tamaño real.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ModelViewerHotspot2 = { canvasPosition: { x: number; y: number } };

const labelClass = (visible: boolean) =>
  cn(
    "pointer-events-none whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-xs font-medium tabular-nums text-paper transition-opacity",
    visible ? "opacity-100" : "opacity-0",
  );
