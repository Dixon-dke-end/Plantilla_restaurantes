import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RequireRole } from "@/modules/auth/ui/RequireRole";
import { AdminShell } from "@/shared/ui/AppShell";

export const metadata: Metadata = { title: { default: "Administración", template: "%s · Administración" }, robots: { index: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="admin">
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
