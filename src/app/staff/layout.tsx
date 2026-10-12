import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RequireRole } from "@/modules/auth/ui/RequireRole";
import { StaffShell } from "@/shared/ui/AppShell";

export const metadata: Metadata = { title: { default: "Personal", template: "%s · Personal" }, robots: { index: false } };

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="employee">
      <StaffShell>{children}</StaffShell>
    </RequireRole>
  );
}
