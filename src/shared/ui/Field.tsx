import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

const control =
  "w-full min-h-11 rounded-[10px] border bg-surface px-3.5 text-base text-ink placeholder:text-muted/70 " +
  "transition-colors duration-150 focus:border-accent disabled:opacity-60 sm:text-sm";

export const inputClass = (invalid?: boolean) => cn(control, invalid ? "border-red" : "border-line hover:border-ink/30");

export function Input({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cn(inputClass(invalid), className)} aria-invalid={invalid || undefined} {...props} />;
}

export function Textarea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(inputClass(invalid), "min-h-24 py-2.5", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({ invalid, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className={cn(inputClass(invalid), "pr-9", className)} aria-invalid={invalid || undefined} {...props}>
      {children}
    </select>
  );
}

/** Label + control + hint/error wiring. The child receives the generated id and aria props. */
export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (props: { id: string; invalid: boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children({ id, invalid: Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
