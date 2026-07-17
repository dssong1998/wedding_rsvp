import { NextRequest, NextResponse } from "next/server";

const ADMIN_PUBLIC_PATH = "/admin-rsvp-portal";
const ADMIN_ALIAS_PREFIXES = ["/_admin-rsvp-portal", "/_admin-portal", "/admin-portal"];
const PUBLIC_ROOT_URL = "https://dae-da.com/";

function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

function resolveAdminAlias(pathname: string): string | null {
  for (const alias of ADMIN_ALIAS_PREFIXES) {
    if (pathname === alias) {
      return ADMIN_PUBLIC_PATH;
    }
    if (pathname.startsWith(`${alias}/`)) {
      return `${ADMIN_PUBLIC_PATH}${pathname.slice(alias.length)}`;
    }
  }
  return null;
}

export function middleware(request: NextRequest): NextResponse {
  const pathname = normalizePathname(request.nextUrl.pathname);
  const isInvitePath = /^\/invited(?:@|%40)/i.test(pathname);
  const adminAliasTarget = resolveAdminAlias(pathname);
  const isAdminPath =
    pathname === ADMIN_PUBLIC_PATH || pathname.startsWith(`${ADMIN_PUBLIC_PATH}/`);

  if (adminAliasTarget) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = adminAliasTarget;
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/notification" || pathname.startsWith("/notification/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/wedding-card";
    return NextResponse.redirect(redirectUrl);
  }

  if (
    pathname === "/" ||
    isAdminPath ||
    isInvitePath ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fun") ||
    pathname.startsWith("/information") ||
    pathname.startsWith("/wedding-card") ||
    pathname.startsWith("/wedding-gift") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  return NextResponse.redirect(PUBLIC_ROOT_URL);
}

export const config = {
  matcher: ["/((?!api).*)"]
};
