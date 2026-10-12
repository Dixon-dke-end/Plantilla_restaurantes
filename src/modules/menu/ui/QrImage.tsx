"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/**
 * Renders a QR code for `text`. Relative paths are resolved against the current origin, so the
 * code always points at the public site the page is served from.
 */
export function QrImage({
  text,
  size = 160,
  alt,
  onReady,
}: {
  text: string;
  size?: number;
  alt: string;
  /** Receives the full (absolute) URL encoded in the QR code and a high-resolution PNG data URL. */
  onReady?: (info: { url: string; pngDataUrl: string }) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const url = text.startsWith("/") ? `${window.location.origin}${text}` : text;
    const opts = { margin: 1, errorCorrectionLevel: "M" as const, color: { dark: "#1B1A17", light: "#FFFFFF" } };
    Promise.all([QRCode.toDataURL(url, { ...opts, width: size * 2 }), QRCode.toDataURL(url, { ...opts, width: 1024 })]).then(
      ([preview, large]) => {
        if (!active) return;
        setSrc(preview);
        onReady?.({ url, pngDataUrl: large });
      },
    );
    return () => {
      active = false;
    };
  }, [text, size, onReady]);

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} width={size} height={size} alt={alt} className="rounded-[10px] border border-line bg-white" />
  ) : (
    <div style={{ width: size, height: size }} className="animate-pulse rounded-[10px] bg-ink/[.07]" aria-hidden />
  );
}
