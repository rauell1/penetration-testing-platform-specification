import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  response.cookies.set("aegis_access", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
  response.cookies.set("aegis_refresh", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
  return response;
}

export async function GET() {
  return POST();
}
