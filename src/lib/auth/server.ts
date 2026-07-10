import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Neon Auth server instance (managed Better Auth).
 *
 * SETUP (one-time, in Neon Console):
 *   1. Project → Branch → Auth → Enable
 *   2. Copy the "Auth URL" from Configuration
 *   3. Set NEON_AUTH_BASE_URL in .env
 *   4. Generate a cookie secret:  openssl rand -base64 32
 *   5. Set NEON_AUTH_COOKIE_SECRET in .env
 *
 * Until those env vars are set, the legacy JWT auth (src/lib/auth.ts)
 * remains the active auth system. The register route is hard-locked
 * to ALLOWED_REGISTRATION_EMAIL (default: royokola3@gmail.com).
 */

const isConfigured = Boolean(
  process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET
);

export const neonAuth = isConfigured
  ? createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      },
    })
  : null;

export const isNeonAuthEnabled = isConfigured;
