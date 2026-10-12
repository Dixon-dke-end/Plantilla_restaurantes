import { MAX_MODEL_BYTES } from "@/modules/menu/domain/mediaValidation";
import type { MediaKind } from "@/modules/menu/domain/ports";
import { getContainer } from "@/server/container";
import { requireRole } from "@/server/auth/session";
import { HttpError } from "@/server/http/errors";
import { json, route } from "@/server/http/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: MediaKind[] = ["image", "model-glb", "model-usdz"];

/** Admin: multipart upload (`file` + `kind`). Content is verified by magic bytes in the storage adapter. */
export const POST = route(async (request: Request) => {
  await requireRole(request, "admin");
  // Cheap early rejection before buffering the body.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_MODEL_BYTES + 1024 * 1024) throw new HttpError(413, "El archivo es demasiado grande.");

  const form = await request.formData().catch(() => {
    throw new HttpError(400, "Se esperaba una carga de archivo en formato multipart.");
  });
  const file = form.get("file");
  const kind = form.get("kind");
  if (!(file instanceof Blob)) throw new HttpError(400, "Falta el archivo.");
  if (typeof kind !== "string" || !KINDS.includes(kind as MediaKind)) throw new HttpError(400, "Tipo de archivo desconocido.");

  const { media } = await getContainer();
  return json({ url: await media.upload(file, kind as MediaKind) }, 201);
});

export const DELETE = route(async (request: Request) => {
  await requireRole(request, "admin");
  const url = new URL(request.url).searchParams.get("url");
  if (!url) throw new HttpError(400, "Falta la URL.");
  await (await getContainer()).media.remove(url);
  return new Response(null, { status: 204 });
});
