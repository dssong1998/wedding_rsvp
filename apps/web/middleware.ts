import { NextRequest, NextResponse } from "next/server";

const ADMIN_PATH = "/_admin-rsvp-portal";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const isInvitePath = /^\/invited(?:@|%40)/i.test(pathname);

  if (
    pathname === "/" ||
    isInvitePath ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith(`${ADMIN_PATH}`)
  ) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/((?!api).*)"]
};
