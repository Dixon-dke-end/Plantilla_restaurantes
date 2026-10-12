"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChefHat, ClipboardList, LayoutDashboard, LogOut, UtensilsCrossed, Users, ReceiptText } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/modules/auth/ui/AuthProvider";
import { hasRole, ROLE_LABELS } from "@/modules/auth/domain/roles";
import { cn } from "./cn";

type NavItem = { href: string; label: string; icon: typeof ChefHat };

const STAFF_NAV: NavItem[] = [
  { href: "/staff/kitchen", label: "Cocina", icon: ChefHat },
  { href: "/staff/new-order", label: "Nueva orden", icon: ClipboardList },
  { href: "/staff/orders", label: "Historial", icon: ReceiptText },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/dishes", label: "Platos", icon: UtensilsCrossed },
  { href: "/admin/team", label: "Equipo", icon: Users },
];

function useSignOut() {
  const { signOut } = useAuth();
  const router = useRouter();
  return async () => {
    await signOut();
    router.replace("/login");
    router.refresh();
  };
}

function UserBlock({ compact }: { compact?: boolean }) {
  const { user } = useAuth();
  const signOut = useSignOut();
  if (!user) return null;
  return (
    <div className={cn("flex items-center gap-3", compact ? "" : "border-t border-line pt-4")}>
      <div className="min-w-0 text-sm">
        <p className="truncate font-medium">{user.fullName}</p>
        <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
      </div>
      <button
        type="button"
        onClick={signOut}
        aria-label="Cerrar sesión"
        className="ml-auto grid size-11 shrink-0 place-items-center rounded-[10px] text-muted transition-colors hover:bg-ink/[.06] hover:text-ink"
      >
        <LogOut size={18} aria-hidden />
      </button>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Staff shell: dark theme, big touch targets (KDS / POS). */
export function StaffShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  return (
    <div className="theme-staff min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-4 px-4">
          <Link href="/staff/kitchen" className="font-display text-xl">
            Ember <span className="text-accent">&amp;</span> Salt
          </Link>
          <nav aria-label="Personal" className="flex flex-1 items-center gap-1 overflow-x-auto">
            {STAFF_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-[10px] px-4 text-base font-medium transition-colors",
                  isActive(pathname, href) ? "bg-accent text-on-accent" : "text-muted hover:bg-ink/[.06] hover:text-ink",
                )}
              >
                <Icon size={18} aria-hidden /> {label}
              </Link>
            ))}
            {hasRole(user?.role, "admin") ? (
              <Link href="/admin" className="ml-2 inline-flex min-h-12 shrink-0 items-center rounded-[10px] px-4 text-base text-muted hover:text-ink">
                Administración
              </Link>
            ) : null}
          </nav>
          <UserBlock compact />
        </div>
      </header>
      <main className="mx-auto max-w-[1800px] px-4 py-6">{children}</main>
    </div>
  );
}

/** Admin shell: light, calm, data-dense. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r print:hidden">
        <div className="flex items-center gap-3 px-4 py-3 lg:flex-col lg:items-stretch lg:gap-8 lg:p-5">
          <Link href="/admin" className="font-display text-xl">
            Ember <span className="text-accent">&amp;</span> Salt
            <span className="ml-2 text-xs font-sans text-muted">Administración</span>
          </Link>
          <nav aria-label="Administración" className="flex flex-1 items-center gap-1 overflow-x-auto lg:flex-col lg:items-stretch lg:overflow-visible">
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors",
                  isActive(pathname, href) ? "bg-ink text-paper" : "text-muted hover:bg-ink/[.06] hover:text-ink",
                )}
              >
                <Icon size={18} aria-hidden /> {label}
              </Link>
            ))}
            <Link href="/staff/kitchen" className="inline-flex min-h-11 shrink-0 items-center gap-3 rounded-[10px] px-3 text-sm text-muted hover:bg-ink/[.06] hover:text-ink lg:mt-4">
              <ChefHat size={18} aria-hidden /> Vista del personal
            </Link>
          </nav>
          <div className="lg:mt-auto">
            <UserBlock />
          </div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
