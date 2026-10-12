"use client";

import { useState } from "react";
import { cn } from "./cn";

/**
 * Plain <img> on purpose: image URLs come from many hosts (Poly Haven, Unsplash, our own /media
 * uploads and local blob: previews). Falls back to an elegant typographic card when missing or broken.
 */
export function Img({
  src,
  alt,
  fallbackLabel,
  className,
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  /** Text for the typographic placeholder (usually the dish name). */
  fallbackLabel?: string;
  className?: string;
  priority?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const broken = !src || failedSrc === src;

  if (broken) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "grid place-items-center bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-paper))] p-4 text-center",
          className,
        )}
      >
        <span className="font-display text-xl leading-tight text-accent-strong sm:text-2xl">{fallbackLabel ?? alt}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={cn("object-cover", className)}
    />
  );
}
