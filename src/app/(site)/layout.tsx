import type { ReactNode } from "react";
import { CartDrawer } from "@/modules/orders/ui/CartDrawer";
import { CheckoutDialog } from "@/modules/orders/ui/CheckoutDialog";
import { SiteFooter } from "@/shared/ui/SiteFooter";
import { SiteHeader } from "@/shared/ui/SiteHeader";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <CartDrawer />
      <CheckoutDialog />
    </>
  );
}
