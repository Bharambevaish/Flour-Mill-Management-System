import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIES } from "@/lib/cookies";

/**
 * Next.js 16 renamed middleware → proxy. This file runs before every request.
 *
 * NOTE: proxy only does OPTIMISTIC checks (cookie presence) — cheap, no DB.
 * Real authorization (session validity + ownership) happens in the secure
 * Data Access Layer inside route handlers / server components.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasOwnerSession = Boolean(request.cookies.get(COOKIES.ownerSession)?.value);
  const hasCustomerSession = Boolean(request.cookies.get(COOKIES.customerSession)?.value);

  const isApi = pathname.startsWith("/api");

  if (!isApi && pathname.startsWith("/owner") && !hasOwnerSession) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (!isApi && pathname.startsWith("/my") && pathname !== "/my/login" && !hasCustomerSession) {
    return NextResponse.redirect(new URL("/my/login", request.nextUrl));
  }

  // Authed users shouldn't linger on login/landing pages. Never bounce a login
  // page that carries a notice (?error=...) though — that cookie is stale and
  // bouncing it back to the protected page would ping-pong straight into a
  // "session expired" loop the user can't escape.
  const carriesNotice = request.nextUrl.searchParams.has("error");
  if (pathname === "/login" && hasOwnerSession && !carriesNotice) {
    return NextResponse.redirect(new URL("/owner", request.nextUrl));
  }
  if (pathname === "/my/login" && hasCustomerSession && !carriesNotice) {
    return NextResponse.redirect(new URL("/my", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};