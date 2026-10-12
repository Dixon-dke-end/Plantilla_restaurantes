import { isDemoAsset, loadPolyhavenGltf } from "@/server/demo-models/polyhaven";

export const runtime = "nodejs";

/** Public: CC0 demo models with their texture URIs resolved (see server/demo-models/polyhaven.ts). */
export async function GET(_request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  if (!isDemoAsset(asset)) return Response.json({ error: "No se encontró el modelo." }, { status: 404 });

  try {
    const gltf = await loadPolyhavenGltf(asset);
    return new Response(JSON.stringify(gltf), {
      headers: {
        "Content-Type": "model/gltf+json",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("[demo-models]", asset, error);
    return Response.json({ error: "El modelo de demostración no está disponible por ahora." }, { status: 502 });
  }
}
