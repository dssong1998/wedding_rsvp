import { NextRequest, NextResponse } from "next/server";

const ADMIN_PATH = "/_admin-rsvp-portal";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isInvitePath = /^\/invited(?:@|%40)/i.test(pathname);

  if (
    pathname === "/" ||
    isInvitePath ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/fun") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith(`${ADMIN_PATH}`)
  ) {
    return NextResponse.next();
  }

  return NextResponse.redirect("https://dae-da.com/");
}

export const config = {
  matcher: ["/((?!api).*)"]
};
