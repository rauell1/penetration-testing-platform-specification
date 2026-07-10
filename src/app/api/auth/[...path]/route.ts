import { neonAuth } from "@/lib/auth/server";

/**
 * Neon Auth catch-all API handler.
 *
 * Returns 503 (Not Configured) until NEON_AUTH_BASE_URL and
 * NEON_AUTH_COOKIE_SECRET are set in the environment. This lets
 * the legacy JWT routes (/api/auth/login, /register, /logout)
 * remain the active auth system without conflicts.
 *
 * Once the env vars are set, this handler proxies all Neon Auth
 * API calls (sign-in, sign-up, sign-out, session, OAuth callbacks).
 * More specific routes take precedence over this catch-all in Next.js,
 * so the legacy routes should be removed once the full migration is done.
 */

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  if (!neonAuth) return Response.json({ error: "Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET." }, { status: 503 });
  return neonAuth.handler().GET(req, ctx);
}

export async function POST(req: Request, ctx: Ctx) {
  if (!neonAuth) return Response.json({ error: "Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET." }, { status: 503 });
  return neonAuth.handler().POST(req, ctx);
}
