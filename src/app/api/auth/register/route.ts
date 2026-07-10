import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, memberships } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, createAccessToken, createRefreshToken } from "@/lib/auth";
import { withMiddleware } from "@/lib/auth-middleware";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  organizationName: z.string().min(2),
});

export const dynamic = "force-dynamic";

export const POST = withMiddleware(
  async (req) => {
    const body = req.validatedBody as z.infer<typeof registerSchema>;

    // ── Hard allowlist ───────────────────────────────────────────
    // Only the configured email can create an account. Set
    // ALLOWED_REGISTRATION_EMAIL in the environment to change it.
    const allowedEmail = (process.env.ALLOWED_REGISTRATION_EMAIL ?? "royokola3@gmail.com").toLowerCase().trim();

    if (body.email.toLowerCase().trim() !== allowedEmail) {
      return NextResponse.json(
        { error: "Registration is restricted to the platform owner.", code: "EMAIL_NOT_ALLOWED", field: "email" },
        { status: 403 }
      );
    }

    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered", code: "EMAIL_EXISTS" },
        { status: 409 }
      );
    }
    
    // Hash password
    const passwordHash = await hashPassword(body.password);
    
    // Create organization
    const [organization] = await db
      .insert(organizations)
      .values({
        name: body.organizationName,
        slug: body.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        plan: "free",
        settings: { requireMfaForActive: true, allowActiveScans: false },
        quotas: { monthlyScans: 50, concurrentScans: 2 },
      })
      .returning();
    
    // Create user
    const [user] = await db
      .insert(users)
      .values({
        email: body.email,
        displayName: body.name,
        passwordHash,
        mfaEnabled: false,
      })
      .returning();
    
    // Create membership (user -> organization)
    const [membership] = await db
      .insert(memberships)
      .values({
        organizationId: organization.id,
        userId: user.id,
        role: "owner", // First user is owner
      })
      .returning();
    
    // Create access and refresh tokens
    const accessToken = await createAccessToken({
      userId: user.id,
      organizationId: organization.id,
      membershipId: membership.id,
      role: membership.role,
    });
    
    const refreshToken = await createRefreshToken({
      userId: user.id,
      organizationId: organization.id,
      membershipId: membership.id,
      role: membership.role,
    });
    
    // Set cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.displayName,
        mfaEnabled: user.mfaEnabled,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
      },
    });
    
    response.cookies.set("aegis_access", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });
    
    response.cookies.set("aegis_refresh", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    
    return response;
  },
  {
    validateBody: registerSchema,
    auditAction: "auth.register",
    auditResourceType: "auth",
    rateLimit: { maxRequests: 3, windowMs: 60_000 },
  }
);