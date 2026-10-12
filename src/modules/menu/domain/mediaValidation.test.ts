import { describe, expect, it } from "vitest";
import {
  contentTypeForExt,
  detectMediaType,
  MAX_IMAGE_BYTES,
  MAX_MODEL_BYTES,
  validateUpload,
} from "./mediaValidation";

const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const GLB = bytes(0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0);
const USDZ = bytes(0x50, 0x4b, 0x03, 0x04);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

describe("detectMediaType", () => {
  it("recognizes files by magic bytes", () => {
    expect(detectMediaType(GLB)).toBe("glb");
    expect(detectMediaType(USDZ)).toBe("usdz");
    expect(detectMediaType(PNG)).toBe("png");
    expect(detectMediaType(JPEG)).toBe("jpeg");
    expect(detectMediaType(WEBP)).toBe("webp");
  });
  it("returns null for anything else", () => {
    expect(detectMediaType(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(detectMediaType(new Uint8Array([]))).toBeNull();
  });
});

describe("validateUpload", () => {
  it("accepts matching kind and content", () => {
    expect(validateUpload("model-glb", GLB, GLB.length)).toEqual({ ok: true, ext: "glb", contentType: "model/gltf-binary" });
    expect(validateUpload("model-usdz", USDZ, USDZ.length)).toEqual({ ok: true, ext: "usdz", contentType: "model/vnd.usdz+zip" });
    expect(validateUpload("image", PNG, PNG.length)).toMatchObject({ ok: true, ext: "png" });
    expect(validateUpload("image", JPEG, JPEG.length)).toMatchObject({ ok: true, ext: "jpg" });
    expect(validateUpload("image", WEBP, WEBP.length)).toMatchObject({ ok: true, ext: "webp" });
  });
  it("rejects a mismatch between declared kind and real content", () => {
    expect(validateUpload("model-glb", PNG, PNG.length).ok).toBe(false);
    expect(validateUpload("image", GLB, GLB.length).ok).toBe(false);
    expect(validateUpload("model-usdz", GLB, GLB.length).ok).toBe(false);
  });
  it("enforces size limits (50 MB models, 8 MB images)", () => {
    expect(MAX_MODEL_BYTES).toBe(50 * 1024 * 1024);
    expect(MAX_IMAGE_BYTES).toBe(8 * 1024 * 1024);
    expect(validateUpload("model-glb", GLB, MAX_MODEL_BYTES + 1)).toMatchObject({ ok: false });
    expect(validateUpload("image", PNG, MAX_IMAGE_BYTES + 1)).toMatchObject({ ok: false });
    expect(validateUpload("image", PNG, 0).ok).toBe(false);
  });
});

describe("contentTypeForExt", () => {
  it("maps served extensions, including the iOS Quick Look usdz type", () => {
    expect(contentTypeForExt("glb")).toBe("model/gltf-binary");
    expect(contentTypeForExt("usdz")).toBe("model/vnd.usdz+zip");
    expect(contentTypeForExt("png")).toBe("image/png");
    expect(contentTypeForExt("jpg")).toBe("image/jpeg");
    expect(contentTypeForExt("webp")).toBe("image/webp");
    expect(contentTypeForExt("html")).toBeNull();
  });
});
