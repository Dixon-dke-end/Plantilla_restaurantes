import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js 16 proxy (formerly middleware). Optimistic gate only: staff/admin pages need a session
 * cookie, otherwise visitors are sent to /login. The real authorization happens server-side in every
 * API route (role check against the database) and again in the client-side RequireRole container.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*", "/admin/:path*"],
};
