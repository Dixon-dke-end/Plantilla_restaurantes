import { ViewTransition, type ReactNode } from "react";

/**
 * Wraps a customer page so route changes cross-fade (old page out, new page in) through the browser
 * View Transitions API. Put it inside each page.tsx, not in a layout: layouts persist across
 * navigations, so enter/exit would never fire there. Browsers without support navigate normally.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
