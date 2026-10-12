"use client";

import { useCallback, useEffect, useState } from "react";

export type Resource<T> = {
  data: T | undefined;
  error: Error | null;
  /** True until the first result (data or error) arrives. */
  loading: boolean;
  reload: () => void;
};

/**
 * Loads data through a port-backed async function. Keeps showing the previous data while
 * re-fetching (stale-while-revalidate), so live boards do not flicker.
 * `load` must be referentially stable (wrap in useCallback).
 * `initialData` (e.g. from an in-memory cache) is rendered on the first pass and then revalidated,
 * which lets a destination page paint real content in the same commit as a view transition.
 */
export function useResource<T>(load: () => Promise<T>, options?: { initialData?: T }): Resource<T> {
  const [state, setState] = useState<{ data?: T; error: Error | null }>(() => ({
    data: options?.initialData,
    error: null,
  }));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    load().then(
      (data) => {
        if (active) setState({ data, error: null });
      },
      (error: unknown) => {
        if (active) setState((s) => ({ data: s.data, error: error instanceof Error ? error : new Error(String(error)) }));
      },
    );
    return () => {
      active = false;
    };
  }, [load, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data: state.data, error: state.error, loading: state.data === undefined && state.error === null, reload };
}

/** Re-runs `callback` whenever `subscribe` signals a change, plus on an optional interval. */
export function useLiveRefresh(subscribe: (onChange: () => void) => () => void, callback: () => void, intervalMs?: number) {
  useEffect(() => {
    const off = subscribe(callback);
    const timer = intervalMs ? setInterval(callback, intervalMs) : undefined;
    return () => {
      off();
      if (timer) clearInterval(timer);
    };
  }, [subscribe, callback, intervalMs]);
}
