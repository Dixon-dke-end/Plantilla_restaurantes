/**
 * Pure helpers to bake a uniform scale into a glTF/GLB by wrapping the scene roots in a scaled node.
 *
 * Why: model-viewer's `scale` attribute works in the browser and WebXR, but Android Scene Viewer and
 * iOS Quick Look (with a supplied .usdz) load the file as-is and ignore it. Baking the factor into
 * the GLB keeps the dish at true size everywhere the GLB is used.
 */

const GLB_MAGIC = 0x46546c67; // "glTF"
const CHUNK_JSON = 0x4e4f534a; // "JSON"

type GltfJson = {
  scene?: number;
  scenes?: Array<{ nodes?: number[] }>;
  nodes?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

function assertScale(scale: number) {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError("La escala debe ser un número positivo y finito");
  }
}

export function bakeScaleIntoGltfJson(json: object, scale: number): object {
  assertScale(scale);
  if (scale === 1) return json;
  const gltf = JSON.parse(JSON.stringify(json)) as GltfJson;
  gltf.nodes ??= [];
  gltf.scenes ??= [{ nodes: gltf.nodes.map((_, i) => i) }];
  const sceneIndex = gltf.scene ?? 0;
  const scene = gltf.scenes[sceneIndex] ?? gltf.scenes[0];
  const roots = scene.nodes ?? [];
  const wrapperIndex = gltf.nodes.length;
  gltf.nodes.push({ name: "CalibrationScale", scale: [scale, scale, scale], children: roots });
  scene.nodes = [wrapperIndex];
  if (gltf.scene === undefined) gltf.scene = sceneIndex;
  return gltf;
}

export function readGlbJson(buffer: ArrayBuffer): object {
  const { json } = parseGlb(buffer);
  return json;
}

function parseGlb(buffer: ArrayBuffer) {
  if (buffer.byteLength < 20) throw new Error("No es un archivo GLB válido (demasiado pequeño)");
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== GLB_MAGIC) throw new Error("No es un archivo GLB válido (firma incorrecta)");
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== CHUNK_JSON) throw new Error("No es un archivo GLB válido (falta el bloque JSON)");
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonLength;
  if (jsonEnd > buffer.byteLength) throw new Error("No es un archivo GLB válido (bloque JSON truncado)");
  const text = new TextDecoder().decode(new Uint8Array(buffer, jsonStart, jsonLength));
  return { json: JSON.parse(text) as object, rest: new Uint8Array(buffer, jsonEnd) };
}

export function bakeScaleIntoGlb(buffer: ArrayBuffer, scale: number): ArrayBuffer {
  assertScale(scale);
  if (scale === 1) return buffer;
  const { json, rest } = parseGlb(buffer);
  const baked = bakeScaleIntoGltfJson(json, scale);
  const raw = new TextEncoder().encode(JSON.stringify(baked));
  const padded = new Uint8Array(raw.length + ((4 - (raw.length % 4)) % 4)).fill(0x20);
  padded.set(raw);

  const total = 12 + 8 + padded.length + rest.length;
  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, padded.length, true);
  view.setUint32(16, CHUNK_JSON, true);
  const bytes = new Uint8Array(out);
  bytes.set(padded, 20);
  bytes.set(rest, 20 + padded.length);
  return out;
}
