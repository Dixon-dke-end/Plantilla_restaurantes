"use client";

import { useCallback, useRef, useState } from "react";

const KEY = "ember.kdsChime";

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Optional two-tone chime for new tickets (Web Audio, no asset files). */
export function useChime() {
  const [enabled, setEnabled] = useState<boolean>(() => (typeof window === "undefined" ? false : readPreference()));
  const ctx = useRef<AudioContext | null>(null);

  const audio = useCallback(() => {
    if (!ctx.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx.current = new Ctor();
    }
    return ctx.current;
  }, []);

  const play = useCallback(() => {
    const c = audio();
    if (!c) return;
    if (c.state === "suspended") void c.resume();
    const start = c.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + i * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.25, start + i * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.16 + 0.35);
      osc.connect(gain).connect(c.destination);
      osc.start(start + i * 0.16);
      osc.stop(start + i * 0.16 + 0.4);
    });
  }, [audio]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (next) {
        // Browsers only allow audio after a user gesture: this click is that gesture.
        audio();
        play();
      }
      return next;
    });
  }, [audio, play]);

  return { enabled, toggle, play };
}
