import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, memberships } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyPassword, createAccessToken, createRefreshToken } from "@/lib/auth";
import { withMiddleware } from "@/lib/auth-middleware";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const dynamic = "force-dynamic";

export const POST = withMiddleware(
  async (req) => {
    const body = req.validatedBody as z.infer<typeof loginSchema>;
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }
    
    // Verify password
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid credentials", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }
    const passwordMatch = await verifyPassword(body.password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid credentials", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }
    
    // Get user's organization and membership
    const [membership] = await db
      .select()
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
      .where(
        and(
          eq(memberships.userId, user.id),
          eq(organizations.emergencyStop, false)
        )
      )
      .limit(1);
    
    if (!membership) {
      return NextResponse.json(
        { error: "No organization access", code: "NO_ORG_ACCESS" },
        { status: 403 }
      );
    }
    
    // Create tokens
    const accessToken = await createAccessToken({
      userId: user.id,
      organizationId: membership.organizations.id,
      membershipId: membership.memberships.id,
      role: membership.memberships.role,
    });
    
    const refreshToken = await createRefreshToken({
      userId: user.id,
      organizationId: membership.organizations.id,
      membershipId: membership.memberships.id,
      role: membership.memberships.role,
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
        id: membership.organizations.id,
        name: membership.organizations.name,
        slug: membership.organizations.slug,
        plan: membership.organizations.plan,
      },
    });
    
    response.cookies.set("aegis_access", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });
    
    response.cookies.set("aegis_refresh", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });
    
    return response;
  },
  {
    validateBody: loginSchema,
    auditAction: "auth.login",
    auditResourceType: "auth",
    rateLimit: { maxRequests: 5, windowMs: 60_000 },
  }
);