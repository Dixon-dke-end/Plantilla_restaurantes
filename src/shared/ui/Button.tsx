import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "xl";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium whitespace-nowrap select-none " +
  "transition-[background-color,color,border-color,opacity,transform] duration-150 " +
  "disabled:pointer-events-none disabled:opacity-50 active:translate-y-px";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-95",
  secondary: "border border-line bg-surface text-ink hover:border-ink/30",
  ghost: "text-ink hover:bg-ink/[.06]",
  danger: "bg-red text-on-red hover:brightness-95",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-14 px-6 text-base",
  xl: "min-h-16 px-8 text-lg",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant, size, className, ...props }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
