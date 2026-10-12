"use client";

import { AlertTriangle, Download, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRepositories } from "@/config/useRepositories";
import { ApiError } from "@/shared/lib/http";
import { centsToInput, formatMoney, parsePriceToCents } from "@/shared/lib/money";
import { Badge } from "@/shared/ui/Badge";
import { Button, LinkButton } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { ErrorNote } from "@/shared/ui/feedback";
import { Field, Input, Select, Textarea } from "@/shared/ui/Field";
import { Toggle } from "@/shared/ui/Toggle";
import { cn } from "@/shared/ui/cn";
import type { Vector3D } from "@/types/model-viewer";
import { DishValidationError, saveDish } from "../application/menuUseCases";
import { calibrateScale, MISMATCH_WARNING_PCT } from "../domain/calibration";
import { ALLERGEN_OPTIONS, allergenLabel } from "../domain/dish";
import { bakeScaleIntoGlb } from "../domain/glb";
import { slugify } from "../domain/slug";
import type { Category, Dish, DishInput } from "../domain/types";
import type { DishErrors } from "../domain/validation";
import { DishViewer } from "./DishViewer";
import { FileDropzone } from "./FileDropzone";
import { QrImage } from "./QrImage";

type Picked = { file: File; url: string };

const numOrNull = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
};
const toStr = (n: number | null) => (n === null ? "" : String(n));
const round = (n: number, digits = 4) => Math.round(n * 10 ** digits) / 10 ** digits;

const STEPS = [
  "Escanea el plato real con Polycam, Luma o Apple Reality Composer (Object Capture) en tu teléfono.",
  "Exporta un .glb y, si escaneaste con un iPhone, también un .usdz (la AR de iOS necesita el .usdz para un mejor resultado).",
  "Sube los archivos de abajo. Mostramos una vista previa del modelo, lo medimos y lo calibramos a las dimensiones reales.",
];

/** Stateful form for creating or editing a dish, including 3D upload, calibration and QR code. */
export function DishForm({ initial, categories }: { initial: Dish | null; categories: Category[] }) {
  const { dishes, media } = useRepositories();
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [price, setPrice] = useState(initial ? centsToInput(initial.priceCents) : "");
  const [allergens, setAllergens] = useState<string[]>(initial?.allergens ?? []);
  const [isAvailable, setAvailable] = useState(initial?.isAvailable ?? true);
  const [isFeatured, setFeatured] = useState(initial?.isFeatured ?? false);
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [glbUrl, setGlbUrl] = useState<string | null>(initial?.modelGlbUrl ?? null);
  const [usdzUrl, setUsdzUrl] = useState<string | null>(initial?.modelUsdzUrl ?? null);
  const [diameter, setDiameter] = useState(toStr(initial?.diameterCm ?? null));
  const [height, setHeight] = useState(toStr(initial?.heightCm ?? null));
  const [weight, setWeight] = useState(toStr(initial?.weightG ?? null));
  const [serves, setServes] = useState(toStr(initial?.serves ?? null));
  const [modelScale, setModelScaleState] = useState(initial?.modelScale ?? 1);
  const [bake, setBake] = useState(true);

  const [pendingImage, setPendingImage] = useState<Picked | null>(null);
  const [pendingGlb, setPendingGlb] = useState<Picked | null>(null);
  const [pendingUsdz, setPendingUsdz] = useState<Picked | null>(null);

  // Raw (scale = 1) bounding box of the model in cm, measured by <model-viewer> after load.
  const [rawCm, setRawCm] = useState<Vector3D | null>(null);
  const scaleRef = useRef(modelScale);
  const setModelScale = useCallback((s: number) => {
    scaleRef.current = s;
    setModelScaleState(s);
  }, []);
  const onMeasured = useCallback((sizeCm: Vector3D) => {
    const s = scaleRef.current || 1;
    setRawCm({ x: sizeCm.x / s, y: sizeCm.y / s, z: sizeCm.z / s });
  }, []);

  const [errors, setErrors] = useState<DishErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [qr, setQr] = useState<{ url: string; pngDataUrl: string } | null>(null);

  // Revoke object URLs we created for previews.
  const created = useRef<string[]>([]);
  useEffect(
    () => () => {
      created.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );
  const pick = (file: File): Picked => {
    const url = URL.createObjectURL(file);
    created.current.push(url);
    return { file, url };
  };

  const diameterN = numOrNull(diameter);
  const heightN = numOrNull(height);
  const calibration =
    rawCm && diameterN && Number.isFinite(diameterN) && diameterN > 0
      ? (() => {
          try {
            return calibrateScale(
              { x: (rawCm.x * modelScale) / 100, y: (rawCm.y * modelScale) / 100, z: (rawCm.z * modelScale) / 100 },
              diameterN,
              heightN && Number.isFinite(heightN) && heightN > 0 ? heightN : undefined,
            );
          } catch {
            return null;
          }
        })()
      : null;
  const needsCalibration = Boolean(calibration && calibration.mismatchPct > MISMATCH_WARNING_PCT);

  const previewGlb = pendingGlb?.url ?? glbUrl;
  const hasModel = Boolean(previewGlb || pendingUsdz || usdzUrl);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setFormError(null);
    setErrors({});
    try {
      let finalImage = imageUrl;
      if (pendingImage) finalImage = await media.upload(pendingImage.file, "image");

      let finalGlb = glbUrl;
      let finalScale = modelScale;
      if (pendingGlb) {
        let blob: Blob = pendingGlb.file;
        if (bake && modelScale !== 1) {
          blob = new Blob([bakeScaleIntoGlb(await pendingGlb.file.arrayBuffer(), modelScale)], { type: "model/gltf-binary" });
          finalScale = 1;
        }
        finalGlb = await media.upload(blob, "model-glb", pendingGlb.file.name);
      }
      let finalUsdz = usdzUrl;
      if (pendingUsdz) finalUsdz = await media.upload(pendingUsdz.file, "model-usdz", pendingUsdz.file.name);

      const input: DishInput = {
        slug,
        name: name.trim(),
        description: description.trim(),
        priceCents: parsePriceToCents(price) ?? 0,
        categoryId,
        imageUrl: finalImage,
        modelGlbUrl: finalGlb,
        modelUsdzUrl: finalUsdz,
        diameterCm: numOrNull(diameter),
        heightCm: numOrNull(height),
        weightG: numOrNull(weight),
        serves: numOrNull(serves),
        modelScale: finalScale,
        allergens,
        isAvailable,
        isFeatured,
      };
      const dish = await saveDish({ dishes }, input, initial?.id);

      setImageUrl(dish.imageUrl);
      setGlbUrl(dish.modelGlbUrl);
      setUsdzUrl(dish.modelUsdzUrl);
      setModelScale(dish.modelScale);
      setPendingImage(null);
      setPendingGlb(null);
      setPendingUsdz(null);
      if (initial) setSaved(true);
      else router.replace(`/admin/dishes/${dish.id}`);
    } catch (e) {
      if (e instanceof DishValidationError) setErrors(e.errors);
      else if (e instanceof ApiError && (e.details as { fieldErrors?: DishErrors } | undefined)?.fieldErrors) {
        setErrors((e.details as { fieldErrors: DishErrors }).fieldErrors);
      } else setFormError(e instanceof Error ? e.message : "No se pudo guardar el plato.");
    } finally {
      setSaving(false);
    }
  }

  const savedSlug = initial?.slug;

  return (
    <>
      <form onSubmit={save} noValidate className="space-y-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl">{initial ? `Editar ${initial.name}` : "Nuevo plato"}</h1>
          <div className="flex gap-2">
            <LinkButton href="/admin/dishes" variant="secondary">
              Cancelar
            </LinkButton>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar plato"}
            </Button>
          </div>
        </div>
        {formError ? <ErrorNote>{formError}</ErrorNote> : null}
        {saved ? (
          <p role="status" className="rounded-[10px] bg-olive-soft px-4 py-3 text-sm text-olive">
            Guardado. El menú está actualizado.
          </p>
        ) : null}

        <Card className="space-y-5 p-6">
          <h2 className="text-base font-semibold">Datos básicos</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nombre" error={errors.name}>
              {(p) => (
                <Input
                  {...p}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slugTouched) setSlug(slugify(e.target.value));
                  }}
                  maxLength={120}
                />
              )}
            </Field>
            <Field label="Identificador de URL (slug)" error={errors.slug} hint="Se usa en el enlace del plato y en el código QR.">
              {(p) => (
                <Input
                  {...p}
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  maxLength={120}
                />
              )}
            </Field>
          </div>
          <Field label="Descripción" error={errors.description}>
            {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Categoría" error={errors.categoryId}>
              {(p) => (
                <Select {...p} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Precio (USD)" error={errors.priceCents} hint={parsePriceToCents(price) ? formatMoney(parsePriceToCents(price)!) : undefined}>
              {(p) => <Input {...p} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="12.50" />}
            </Field>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Alérgenos</legend>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((a) => {
                const on = allergens.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAllergens((cur) => (on ? cur.filter((x) => x !== a) : [...cur, a]))}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-sm transition-colors",
                      on ? "border-amber bg-amber-soft text-amber-ink" : "border-line bg-surface text-muted hover:text-ink",
                    )}
                  >
                    {allergenLabel(a)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-8">
            <label className="flex items-center gap-3 text-sm font-medium">
              <Toggle checked={isAvailable} onChange={setAvailable} label="Disponible" /> Disponible en el menú
            </label>
            <label className="flex items-center gap-3 text-sm font-medium">
              <Toggle checked={isFeatured} onChange={setFeatured} label="Destacado" /> Destacado en la página de inicio
            </label>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-base font-semibold">Foto</h2>
          <div className="grid gap-5 sm:grid-cols-[200px_1fr] sm:items-start">
            <div className="aspect-[4/3] overflow-hidden rounded-[10px] border border-line bg-paper">
              {pendingImage?.url || imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pendingImage?.url ?? imageUrl ?? ""} alt="Vista previa de la foto del plato" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-sm text-muted">Sin foto</div>
              )}
            </div>
            <FileDropzone
              label="Foto del plato"
              hint="PNG, JPEG o WebP, hasta 8 MB"
              accept="image/png,image/jpeg,image/webp"
              extensions={[".png", ".jpg", ".jpeg", ".webp"]}
              fileName={pendingImage?.file.name ?? (imageUrl ? imageUrl.split("/").pop() : null)}
              onFile={(file) => setPendingImage(pick(file))}
              onClear={() => {
                setPendingImage(null);
                setImageUrl(null);
              }}
            />
          </div>
        </Card>

        <Card className="space-y-6 p-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Modelo 3D y dimensiones reales</h2>
            <p className="text-sm text-muted">Permite que los clientes vean este plato a su tamaño real en su propia mesa.</p>
          </div>

          <ol className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-3 rounded-[10px] bg-paper p-4 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-paper">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted">
            Las exportaciones de Polycam y Luma suelen venir ya a escala real. Revisa el tamaño detectado abajo y calibra solo
            si no coincide.
          </p>

          <div className="grid gap-5 md:grid-cols-2">
            <FileDropzone
              label="Modelo para Android y web (.glb)"
              hint="glTF binario, hasta 50 MB"
              accept=".glb,model/gltf-binary"
              extensions={[".glb"]}
              fileName={pendingGlb?.file.name ?? (glbUrl ? glbUrl.split("/").pop() : null)}
              onFile={(file) => setPendingGlb(pick(file))}
              onClear={() => {
                setPendingGlb(null);
                setGlbUrl(null);
                setRawCm(null);
              }}
              error={errors.modelGlbUrl}
            />
            <FileDropzone
              label="Modelo para iPhone y iPad (.usdz, opcional)"
              hint="Lo usa iOS Quick Look, hasta 50 MB"
              accept=".usdz,model/vnd.usdz+zip"
              extensions={[".usdz"]}
              fileName={pendingUsdz?.file.name ?? (usdzUrl ? usdzUrl.split("/").pop() : null)}
              onFile={(file) => setPendingUsdz(pick(file))}
              onClear={() => {
                setPendingUsdz(null);
                setUsdzUrl(null);
              }}
              error={errors.modelUsdzUrl}
            />
          </div>

          {previewGlb ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <DishViewer
                dish={{
                  name: name || "Plato",
                  imageUrl: pendingImage?.url ?? imageUrl,
                  modelGlbUrl: previewGlb,
                  modelUsdzUrl: null,
                  modelScale,
                  diameterCm: diameterN,
                  slug,
                }}
                onMeasured={onMeasured}
              />
              <div className="space-y-4">
                <div className="rounded-[10px] border border-line p-4">
                  <p className="text-sm font-medium">Tamaño detectado</p>
                  {rawCm ? (
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {(rawCm.x * modelScale).toFixed(1)} &times; {(rawCm.y * modelScale).toFixed(1)} &times; {(rawCm.z * modelScale).toFixed(1)} cm
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted">Midiendo...</p>
                  )}
                  <p className="text-xs text-muted">Ancho &times; alto &times; profundidad, tal como se verá en AR.</p>
                </div>

                {needsCalibration && calibration ? (
                  <div role="alert" className="space-y-3 rounded-[10px] border border-amber/50 bg-amber-soft p-4 text-amber-ink">
                    <p className="flex items-start gap-2 text-sm font-medium">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
                      El modelo difiere un {calibration.mismatchPct.toFixed(0)}% de las dimensiones reales que ingresaste.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => setModelScale(round(modelScale * calibration.scale))}
                    >
                      Aplicar calibración (&times;{calibration.scale.toFixed(3)})
                    </Button>
                  </div>
                ) : calibration ? (
                  <p className="flex items-center gap-2 text-sm text-olive">
                    <Badge tone="olive">Calibrado</Badge> Dentro del {MISMATCH_WARNING_PCT}% del tamaño real.
                  </p>
                ) : (
                  <p className="text-sm text-muted">Ingresa el diámetro real para comparar el modelo.</p>
                )}

                <Field label="Escala del modelo" error={errors.modelScale} hint="1 = tal como se exportó. Se aplica en la vista 3D y en WebXR.">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      step="0.001"
                      min="0"
                      value={modelScale}
                      onChange={(e) => setModelScale(Number(e.target.value))}
                    />
                  )}
                </Field>

                {pendingGlb && modelScale !== 1 ? (
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" checked={bake} onChange={(e) => setBake(e.target.checked)} className="mt-1 size-4 accent-[var(--color-accent)]" />
                    <span>
                      <span className="font-medium">Incorporar la escala en el archivo .glb</span>
                      <span className="block text-muted">
                        Recomendado: Android Scene Viewer ignora el atributo de escala, por lo que el propio archivo debe estar a tamaño real.
                      </span>
                    </span>
                  </label>
                ) : null}
                {glbUrl && !pendingGlb && modelScale !== 1 && glbUrl.startsWith("http") ? (
                  <p className="text-xs text-muted">
                    Este modelo está alojado en otro sitio, por lo que no se puede incorporar la escala. Android Scene Viewer lo
                    mostrará a su tamaño original; sube tu propio .glb para obtener resultados exactos.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Diámetro real (cm)" error={errors.diameterCm}>
              {(p) => <Input {...p} value={diameter} onChange={(e) => setDiameter(e.target.value)} inputMode="decimal" />}
            </Field>
            <Field label="Altura real (cm)" error={errors.heightCm}>
              {(p) => <Input {...p} value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" />}
            </Field>
            <Field label="Peso (g)" error={errors.weightG}>
              {(p) => <Input {...p} value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="numeric" />}
            </Field>
            <Field label="Porciones" error={errors.serves}>
              {(p) => <Input {...p} value={serves} onChange={(e) => setServes(e.target.value)} inputMode="numeric" />}
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="text-base font-semibold">Código QR</h2>
          {savedSlug && hasModel ? (
            <div className="flex flex-wrap items-center gap-6">
              <QrImage text={`/menu/${savedSlug}?ar=1`} size={176} alt={`Código QR que abre ${name} en AR`} onReady={setQr} />
              <div className="space-y-3">
                <p className="max-w-sm text-sm text-muted">
                  Imprímelo para la mesa o el menú. Al escanearlo se abre este plato y se ofrece la vista en AR de inmediato.
                </p>
                {qr ? <p className="break-all text-xs text-muted">{qr.url}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {qr ? (
                    <a
                      href={qr.pngDataUrl}
                      download={`${savedSlug}-qr.png`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-sm font-medium hover:border-ink/30"
                    >
                      <Download size={16} aria-hidden /> Descargar PNG
                    </a>
                  ) : null}
                  <Button variant="secondary" onClick={() => window.print()}>
                    <Printer size={16} aria-hidden /> Imprimir
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">
              {savedSlug ? "Sube un modelo 3D y guarda para obtener un código QR imprimible de este plato." : "Guarda primero el plato. Su código QR aparecerá aquí."}
            </p>
          )}
        </Card>
      </form>

      {savedSlug ? (
        <div className="hidden flex-col items-center gap-6 py-16 text-center print:flex">
          <p className="font-display text-4xl">{name}</p>
          <QrImage text={`/menu/${savedSlug}?ar=1`} size={360} alt={`Código QR que abre ${name} en AR`} />
          <p className="text-xl">Escanea para verlo en tu mesa</p>
          <p className="text-sm">Ember &amp; Salt</p>
        </div>
      ) : null}
    </>
  );
}
