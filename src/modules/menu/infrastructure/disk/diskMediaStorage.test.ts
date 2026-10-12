import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, readFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DiskMediaStorage, resolveMediaPath } from "./diskMediaStorage";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "ember-media-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const glb = () => new Blob([new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0, 1, 2, 3, 4])]);
const png = () => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])]);

describe("DiskMediaStorage", () => {
  it("stores validated files under a public /media URL and reads them back", async () => {
    const storage = new DiskMediaStorage({ dir });
    const url = await storage.upload(glb(), "model-glb", "My Cake!.glb");
    expect(url).toMatch(/^\/media\/model-glb\/[a-f0-9-]+\.glb$/);
    const read = await storage.read(url.replace("/media/", "").split("/"));
    expect(read?.contentType).toBe("model/gltf-binary");
    expect(read?.data.byteLength).toBe(12);
    const onDisk = await readFile(path.join(dir, "model-glb", path.basename(url)));
    expect(onDisk.byteLength).toBe(12);
  });

  it("derives the extension from the content, not the file name", async () => {
    const storage = new DiskMediaStorage({ dir });
    const url = await storage.upload(png(), "image", "evil.html");
    expect(url.endsWith(".png")).toBe(true);
  });

  it("rejects content that does not match the declared kind", async () => {
    const storage = new DiskMediaStorage({ dir });
    await expect(storage.upload(png(), "model-glb")).rejects.toThrow(/glb/i);
    await expect(storage.upload(new Blob(["<script>"]), "image")).rejects.toThrow();
  });

  it("removes files by URL and ignores URLs it does not own", async () => {
    const storage = new DiskMediaStorage({ dir });
    const url = await storage.upload(png(), "image");
    await storage.remove(url);
    await expect(stat(path.join(dir, "image", path.basename(url)))).rejects.toThrow();
    await expect(storage.remove("https://example.com/x.png")).resolves.toBeUndefined();
    await expect(storage.remove("/media/../../etc/passwd")).resolves.toBeUndefined();
  });

  it("returns null when reading missing files or traversal attempts", async () => {
    const storage = new DiskMediaStorage({ dir });
    expect(await storage.read(["image", "missing.png"])).toBeNull();
    expect(await storage.read(["..", "secret.txt"])).toBeNull();
    expect(await storage.read(["image", "note.txt"])).toBeNull();
  });
});

describe("resolveMediaPath", () => {
  it("joins safe segments below the base directory", () => {
    expect(resolveMediaPath("/data/uploads", ["image", "a.png"])).toBe(path.resolve("/data/uploads", "image", "a.png"));
  });
  it.each([
    [["..", "x"]],
    [["image", "..", "..", "etc", "passwd"]],
    [["image", "a\0.png"]],
    [["image", "..\\x"]],
    [["/etc/passwd"]],
    [[]],
  ])("rejects unsafe segments %j", (segments) => {
    expect(resolveMediaPath("/data/uploads", segments)).toBeNull();
  });
});
