"use client";

import { Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { cn } from "@/shared/ui/cn";

/** Drag-and-drop / click-to-browse file picker. Presentational: the parent owns the file. */
export function FileDropzone({
  label,
  hint,
  accept,
  extensions,
  fileName,
  onFile,
  onClear,
  error,
}: {
  label: string;
  hint: string;
  /** Value for the <input accept> attribute. */
  accept: string;
  /** Lower-case extensions (with dot) that are allowed, e.g. [".glb"]. */
  extensions: string[];
  /** Name of the currently chosen / stored file, if any. */
  fileName?: string | null;
  onFile: (file: File) => void;
  onClear?: () => void;
  error?: string | null;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function accept1(file: File | undefined) {
    if (!file) return;
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!extensions.includes(ext)) {
      setLocalError(`Elige un archivo ${extensions.join(" o ")}.`);
      return;
    }
    setLocalError(null);
    onFile(file);
  }

  const message = localError ?? error;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept1(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex min-h-28 flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed px-4 py-5 text-center transition-colors",
          dragging ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-ink/30",
          message && "border-red",
        )}
      >
        {fileName ? (
          <div className="flex w-full items-center justify-between gap-3 text-left">
            <p className="min-w-0 truncate text-sm font-medium">{fileName}</p>
            <div className="flex shrink-0 gap-2">
              <label
                htmlFor={id}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] border border-line px-3 text-sm font-medium hover:border-ink/30"
              >
                Reemplazar
              </label>
              {onClear ? (
                <button
                  type="button"
                  onClick={onClear}
                  aria-label={`Quitar ${label}`}
                  className="grid size-11 place-items-center rounded-[10px] text-muted hover:bg-red-soft hover:text-red"
                >
                  <X size={18} aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <Upload size={22} className="text-muted" aria-hidden />
            <p className="text-sm">
              Arrastra un archivo aquí o{" "}
              <label htmlFor={id} className="cursor-pointer font-medium text-accent-strong underline underline-offset-4">
                explora
              </label>
            </p>
            <p className="text-xs text-muted">{hint}</p>
          </>
        )}
        <input
          id={id}
          ref={input}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            accept1(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {message ? (
        <p role="alert" className="text-sm text-red">
          {message}
        </p>
      ) : null}
    </div>
  );
}
