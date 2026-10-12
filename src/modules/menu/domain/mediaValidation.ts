import type { MediaKind } from "./ports";

export type DetectedType = "glb" | "usdz" | "png" | "jpeg" | "webp";

export const MAX_MODEL_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((b, i) => bytes[offset + i] === b);

/** Identifies a file from its first bytes (never trust the extension or the declared MIME type). */
export function detectMediaType(bytes: Uint8Array): DetectedType | null {
  if (startsWith(bytes, [0x67, 0x6c, 0x54, 0x46])) return "glb"; // "glTF"
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return "usdz"; // zip local file header "PK\x03\x04"
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

const CONTENT_TYPES: Record<string, string> = {
  glb: "model/gltf-binary",
  // iOS Quick Look requires exactly this type to open the file in AR.
  usdz: "model/vnd.usdz+zip",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const contentTypeForExt = (ext: string): string | null => CONTENT_TYPES[ext.toLowerCase()] ?? null;

const ACCEPTED: Record<MediaKind, { types: DetectedType[]; maxBytes: number; label: string }> = {
  image: { types: ["png", "jpeg", "webp"], maxBytes: MAX_IMAGE_BYTES, label: "una imagen PNG, JPEG o WebP" },
  "model-glb": { types: ["glb"], maxBytes: MAX_MODEL_BYTES, label: "un modelo .glb (glTF binario)" },
  "model-usdz": { types: ["usdz"], maxBytes: MAX_MODEL_BYTES, label: "un modelo .usdz" },
};

export type UploadValidation =
  | { ok: true; ext: string; contentType: string }
  | { ok: false; error: string };

export function validateUpload(kind: MediaKind, bytes: Uint8Array, sizeBytes: number): UploadValidation {
  const rule = ACCEPTED[kind];
  if (sizeBytes <= 0) return { ok: false, error: "El archivo está vacío." };
  if (sizeBytes > rule.maxBytes) {
    return { ok: false, error: `El archivo es demasiado grande (máximo ${Math.round(rule.maxBytes / 1024 / 1024)} MB).` };
  }
  const detected = detectMediaType(bytes);
  if (!detected || !rule.types.includes(detected)) {
    return { ok: false, error: `Se esperaba ${rule.label}, pero el contenido del archivo no coincide.` };
  }
  const ext = detected === "jpeg" ? "jpg" : detected;
  return { ok: true, ext, contentType: CONTENT_TYPES[ext] };
}
