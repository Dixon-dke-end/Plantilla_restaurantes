import { getContainer } from "@/server/container";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves uploaded dish media with the exact Content-Types AR needs
 * (iOS Quick Look requires model/vnd.usdz+zip). Filenames are random UUIDs, so they are immutable.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const { media } = await getContainer();
  const file = await media.read(path);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
