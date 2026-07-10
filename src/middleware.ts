import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/auth/login",
  "/auth/register",
  "/api/health",
  "/_next/",
  "/favicon.ico",
  "/spec",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/") || pathname.startsWith(route));
  // also public: /spec/* pages, root /
  if (isPublic || pathname === "/" || pathname.startsWith("/spec")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("aegis_access")?.value;
  if (!token) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
