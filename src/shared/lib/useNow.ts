"use client";

import { useSyncExternalStore } from "react";

/** One shared ticking clock (ms epoch), updated every `intervalMs` — drives live elapsed timers. */
function createClock(intervalMs: number) {
  const listeners = new Set<() => void>();
  let now = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!timer) {
        now = Date.now();
        timer = setInterval(() => {
          now = Date.now();
          listeners.forEach((l) => l());
        }, intervalMs);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    getSnapshot: () => (now === 0 ? (now = Date.now()) : now),
    getServerSnapshot: () => 0,
  };
}

const clock = createClock(1000);

export function useNow(): number {
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getServerSnapshot);
}
