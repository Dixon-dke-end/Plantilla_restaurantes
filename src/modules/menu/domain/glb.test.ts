import { describe, expect, it } from "vitest";
import { bakeScaleIntoGlb, bakeScaleIntoGltfJson, readGlbJson } from "./glb";

function buildGlb(json: object, bin?: Uint8Array): ArrayBuffer {
  const enc = new TextEncoder();
  const raw = enc.encode(JSON.stringify(json));
  const pad = (4 - (raw.length % 4)) % 4;
  const jsonBytes = new Uint8Array(raw.length + pad).fill(0x20);
  jsonBytes.set(raw);
  const binLen = bin ? Math.ceil(bin.length / 4) * 4 : 0;
  const total = 12 + 8 + jsonBytes.length + (bin ? 8 + binLen : 0);
  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonBytes.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(out, 20, jsonBytes.length).set(jsonBytes);
  if (bin) {
    const o = 20 + jsonBytes.length;
    view.setUint32(o, binLen, true);
    view.setUint32(o + 4, 0x004e4942, true);
    new Uint8Array(out, o + 8, bin.length).set(bin);
  }
  return out;
}

const base = {
  asset: { version: "2.0" },
  scene: 0,
  scenes: [{ nodes: [0, 1] }],
  nodes: [{ mesh: 0 }, { mesh: 0, translation: [1, 0, 0] }],
  meshes: [{ primitives: [] }],
};

describe("bakeScaleIntoGltfJson", () => {
  it("wraps the scene roots in a scaled node", () => {
    const out = bakeScaleIntoGltfJson(base, 2) as typeof base;
    expect(out.nodes).toHaveLength(3);
    expect(out.scenes[0].nodes).toEqual([2]);
    expect(out.nodes[2]).toMatchObject({ scale: [2, 2, 2], children: [0, 1] });
  });
  it("does not mutate the input", () => {
    bakeScaleIntoGltfJson(base, 2);
    expect(base.nodes).toHaveLength(2);
  });
  it("is a no-op for scale 1", () => {
    expect(bakeScaleIntoGltfJson(base, 1)).toEqual(base);
  });
  it("rejects invalid scales", () => {
    expect(() => bakeScaleIntoGltfJson(base, 0)).toThrow(RangeError);
    expect(() => bakeScaleIntoGltfJson(base, NaN)).toThrow(RangeError);
  });
});

describe("bakeScaleIntoGlb", () => {
  it("rewrites the JSON chunk and keeps the BIN chunk and valid headers", () => {
    const bin = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const out = bakeScaleIntoGlb(buildGlb(base, bin), 1.6);
    const view = new DataView(out);
    expect(view.getUint32(0, true)).toBe(0x46546c67);
    expect(view.getUint32(8, true)).toBe(out.byteLength);
    expect(out.byteLength % 4).toBe(0);
    const json = readGlbJson(out) as typeof base;
    expect((json.nodes[2] as { scale?: number[] }).scale).toEqual([1.6, 1.6, 1.6]);
    const jsonLen = view.getUint32(12, true);
    const binHeader = 20 + jsonLen;
    expect(view.getUint32(binHeader, true)).toBe(8);
    expect(Array.from(new Uint8Array(out, binHeader + 8, 8))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it("works for a GLB without a BIN chunk", () => {
    const out = bakeScaleIntoGlb(buildGlb(base), 3);
    expect((readGlbJson(out) as typeof base).scenes[0].nodes).toEqual([2]);
  });
  it("throws on non-GLB input", () => {
    expect(() => bakeScaleIntoGlb(new ArrayBuffer(32), 2)).toThrow(/glb/i);
  });
});
