import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { UnprocessableError } from "@/shared/lib/appErrors";
import { newId } from "@/shared/lib/id";
import { contentTypeForExt, validateUpload } from "../../domain/mediaValidation";
import type { MediaKind, MediaStorage } from "../../domain/ports";

export const MEDIA_URL_PREFIX = "/media/";

/**
 * Joins URL segments below `baseDir`, refusing anything that could escape it
 * (dot segments, separators, NUL bytes, absolute paths).
 */
export function resolveMediaPath(baseDir: string, segments: string[]): string | null {
  if (segments.length === 0) return null;
  for (const s of segments) {
    if (!s || s === "." || s === ".." || /[\\/\0]/.test(s)) return null;
  }
  const base = path.resolve(baseDir);
  const full = path.resolve(base, ...segments);
  return full.startsWith(base + path.sep) ? full : null;
}

export type MediaRead = { data: Uint8Array; contentType: string };

/** Stores uploads on local disk (a Docker volume in production) and serves them via /media/*. */
export class DiskMediaStorage implements MediaStorage {
  private readonly dir: string;

  constructor(options: { dir: string }) {
    this.dir = path.resolve(options.dir);
  }

  async upload(file: File | Blob, kind: MediaKind, fileName?: string): Promise<string> {
    void fileName; // the stored name is a random UUID; the extension comes from the verified content
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = validateUpload(kind, bytes, bytes.length);
    if (!result.ok) throw new UnprocessableError(result.error);
    const name = `${newId()}.${result.ext}`;
    const target = resolveMediaPath(this.dir, [kind, name]);
    if (!target) throw new UnprocessableError("La ruta de carga no es válida.");
    await mkdir(/*turbopackIgnore: true*/ path.dirname(target), { recursive: true });
    await writeFile(/*turbopackIgnore: true*/ target, bytes);
    return `${MEDIA_URL_PREFIX}${kind}/${name}`;
  }

  async remove(url: string): Promise<void> {
    if (!url.startsWith(MEDIA_URL_PREFIX)) return;
    const target = resolveMediaPath(this.dir, url.slice(MEDIA_URL_PREFIX.length).split("/"));
    if (!target) return;
    await unlink(/*turbopackIgnore: true*/ target).catch(() => undefined);
  }

  /** Reads a stored file for the /media route. Returns null for anything missing or unsafe. */
  async read(segments: string[]): Promise<MediaRead | null> {
    const target = resolveMediaPath(this.dir, segments);
    if (!target) return null;
    const contentType = contentTypeForExt(path.extname(target).slice(1));
    if (!contentType) return null;
    try {
      return { data: new Uint8Array(await readFile(/*turbopackIgnore: true*/ target)), contentType };
    } catch {
      return null;
    }
  }
}
