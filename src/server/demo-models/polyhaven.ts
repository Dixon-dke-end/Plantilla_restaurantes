/**
 * Poly Haven publishes its glTF files with relative texture/buffer URIs that do not match its CDN layout,
 * so loading them directly yields untextured models. This module resolves those URIs against the official
 * per-asset file map. Only allow-listed demo assets are served, so the route cannot act as an open proxy.
 */

export const DEMO_ASSETS = ["carrot_cake", "strawberry_chocolate_cake", "croissant", "hamburger_buns"] as const;
export type DemoAsset = (typeof DEMO_ASSETS)[number];

type IncludeMap = Record<string, { url: string }>;
type GltfDocument = {
  images?: Array<{ uri?: string } & Record<string, unknown>>;
  buffers?: Array<{ uri?: string } & Record<string, unknown>>;
} & Record<string, unknown>;
type Fetcher = (url: string) => Promise<Response>;

export const isDemoAsset = (asset: string): asset is DemoAsset => (DEMO_ASSETS as readonly string[]).includes(asset);

export function rewriteGltfUris<T extends GltfDocument>(gltf: T, include: IncludeMap): T {
  const resolve = <E extends { uri?: string }>(entry: E): E =>
    entry.uri && include[entry.uri] ? { ...entry, uri: include[entry.uri].url } : { ...entry };

  const result: T = { ...gltf };
  if (gltf.images) result.images = gltf.images.map(resolve);
  if (gltf.buffers) result.buffers = gltf.buffers.map(resolve);
  return result;
}

async function fetchJson(fetcher: Fetcher, url: string): Promise<unknown> {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Poly Haven upstream request failed (${response.status}).`);
  return response.json();
}

export async function loadPolyhavenGltf(asset: string, fetcher: Fetcher = fetch): Promise<GltfDocument> {
  if (!isDemoAsset(asset)) throw new Error(`Demo model "${asset}" is not available.`);

  const files = (await fetchJson(fetcher, `https://api.polyhaven.com/files/${asset}`)) as {
    gltf?: { "1k"?: { gltf?: { url: string; include?: IncludeMap } } };
  };
  const entry = files.gltf?.["1k"]?.gltf;
  if (!entry) throw new Error("Poly Haven upstream file map has no 1k glTF entry.");

  const gltf = (await fetchJson(fetcher, entry.url)) as GltfDocument;
  return rewriteGltfUris(gltf, entry.include ?? {});
}
