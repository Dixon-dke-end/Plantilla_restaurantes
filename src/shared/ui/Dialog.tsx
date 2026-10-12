"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

type BaseProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/** Hooks a native <dialog> to the `open` prop. Native modals give us focus trapping and Escape for free. */
function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = () => onClose();
    el.addEventListener("close", handle);
    return () => el.removeEventListener("close", handle);
  }, [onClose]);
  return ref;
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Cerrar"
      className="grid size-11 place-items-center rounded-[10px] text-muted transition-colors hover:bg-ink/[.06] hover:text-ink"
    >
      <X size={20} aria-hidden />
    </button>
  );
}

export function Dialog({ open, onClose, title, children, footer, className }: BaseProps) {
  const ref = useModal(open, onClose);
  return (
    <dialog
      ref={ref}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={cn(
        "m-auto w-[calc(100%-32px)] max-w-lg rounded-[14px] border border-line bg-surface p-0 shadow-xl",
        "open:animate-fade-up",
        className,
      )}
    >
      {open ? (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 pr-3">
            <h2 className="font-display text-xl">{title}</h2>
            <CloseButton onClose={onClose} />
          </div>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          {footer ? <div className="border-t border-line px-5 py-4">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}

export function Drawer({ open, onClose, title, children, footer, className }: BaseProps) {
  const ref = useModal(open, onClose);
  return (
    <dialog
      ref={ref}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={cn(
        "m-0 ml-auto h-dvh max-h-dvh w-full max-w-md rounded-none border-l border-line bg-surface p-0 shadow-xl",
        className,
      )}
    >
      {open ? (
        <div className="flex h-dvh flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 pr-3">
            <h2 className="font-display text-xl">{title}</h2>
            <CloseButton onClose={onClose} />
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer ? <div className="border-t border-line px-5 py-4">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}
