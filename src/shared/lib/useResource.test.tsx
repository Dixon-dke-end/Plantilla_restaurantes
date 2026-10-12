// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useResource } from "./useResource";

describe("useResource", () => {
  it("starts in loading state without initial data and resolves", async () => {
    const load = vi.fn(async () => "fresh");
    const { result } = renderHook(() => useResource(load));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data).toBe("fresh"));
    expect(result.current.loading).toBe(false);
  });

  it("shows initial data on the very first render, then revalidates", async () => {
    const load = vi.fn(async () => "fresh");
    const { result } = renderHook(() => useResource(load, { initialData: "cached" }));
    expect(result.current.data).toBe("cached");
    expect(result.current.loading).toBe(false);
    await waitFor(() => expect(result.current.data).toBe("fresh"));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps the initial data when revalidation fails", async () => {
    const load = vi.fn(async () => {
      throw new Error("offline");
    });
    const { result } = renderHook(() => useResource(load, { initialData: "cached" }));
    await waitFor(() => expect(result.current.error?.message).toBe("offline"));
    expect(result.current.data).toBe("cached");
  });
});
