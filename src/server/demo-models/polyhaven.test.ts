import { describe, expect, it, vi } from "vitest";
import { isDemoAsset, loadPolyhavenGltf, rewriteGltfUris } from "./polyhaven";

const include = {
  "textures/cake_diff_1k.jpg": { url: "https://dl.polyhaven.org/file/ph-assets/Models/jpg/1k/cake/cake_diff_1k.jpg" },
  "cake.bin": { url: "https://dl.polyhaven.org/file/ph-assets/Models/gltf/8k/cake/cake.bin" },
};

describe("rewriteGltfUris", () => {
  it("replaces relative image and buffer URIs with the absolute URLs from the include map", () => {
    const gltf = {
      asset: { version: "2.0" },
      images: [{ uri: "textures/cake_diff_1k.jpg", mimeType: "image/jpeg" }],
      buffers: [{ uri: "cake.bin", byteLength: 10 }],
    };

    const result = rewriteGltfUris(gltf, include);

    expect(result.images?.[0].uri).toBe(include["textures/cake_diff_1k.jpg"].url);
    expect(result.buffers?.[0].uri).toBe(include["cake.bin"].url);
    expect(result.asset).toEqual({ version: "2.0" });
  });

  it("does not mutate the input document", () => {
    const gltf = { images: [{ uri: "textures/cake_diff_1k.jpg" }] };
    rewriteGltfUris(gltf, include);
    expect(gltf.images[0].uri).toBe("textures/cake_diff_1k.jpg");
  });

  it("keeps URIs that are absent from the include map, including embedded data URIs", () => {
    const gltf = { images: [{ uri: "data:image/png;base64,AAAA" }], buffers: [{ uri: "other.bin" }] };
    const result = rewriteGltfUris(gltf, include);
    expect(result.images?.[0].uri).toBe("data:image/png;base64,AAAA");
    expect(result.buffers?.[0].uri).toBe("other.bin");
  });

  it("handles documents without images or buffers", () => {
    expect(rewriteGltfUris({ asset: { version: "2.0" } }, include)).toEqual({ asset: { version: "2.0" } });
  });
});

describe("isDemoAsset", () => {
  it("accepts only allow-listed Poly Haven assets", () => {
    expect(isDemoAsset("carrot_cake")).toBe(true);
    expect(isDemoAsset("croissant")).toBe(true);
    expect(isDemoAsset("../../etc/passwd")).toBe(false);
    expect(isDemoAsset("lemon")).toBe(false);
  });
});

describe("loadPolyhavenGltf", () => {
  it("fetches the file map and the glTF, then returns the rewritten document", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url === "https://api.polyhaven.com/files/carrot_cake") {
        return Response.json({ gltf: { "1k": { gltf: { url: "https://dl.polyhaven.org/cake_1k.gltf", include } } } });
      }
      if (url === "https://dl.polyhaven.org/cake_1k.gltf") {
        return Response.json({ images: [{ uri: "textures/cake_diff_1k.jpg" }], buffers: [{ uri: "cake.bin" }] });
      }
      return new Response("not found", { status: 404 });
    });

    const gltf = await loadPolyhavenGltf("carrot_cake", fetcher);

    expect(gltf.images?.[0].uri).toBe(include["textures/cake_diff_1k.jpg"].url);
    expect(gltf.buffers?.[0].uri).toBe(include["cake.bin"].url);
  });

  it("rejects assets that are not allow-listed without calling the network", async () => {
    const fetcher = vi.fn();
    await expect(loadPolyhavenGltf("lemon", fetcher)).rejects.toThrow(/not available/i);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails when the upstream file map is unavailable", async () => {
    const fetcher = vi.fn(async () => new Response("down", { status: 503 }));
    await expect(loadPolyhavenGltf("croissant", fetcher)).rejects.toThrow(/upstream/i);
  });
});
