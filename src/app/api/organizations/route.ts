import { db } from "@/db";
import { organizations } from "@/db/schema";
import { withAuth } from "@/lib/auth-middleware";
import { organizationSchema, paginationSchema } from "@/lib/validation";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = withAuth({
  requiredRole: "viewer",
  validateQuery: paginationSchema,
  auditAction: "organizations.list",
  auditResourceType: "organization",
  rateLimit: { maxRequests: 100, windowMs: 60_000 },
}, async (req) => {
  const query = req.validatedQuery as { page: number; limit: number; sort?: string; order: "asc" | "desc" };
  const offset = (query.page - 1) * query.limit;

  const rows = await db
    .select()
    .from(organizations)
    .limit(query.limit)
    .offset(offset)
    .orderBy(sql`${query.sort || "created_at"} ${query.order}`);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(organizations);

  return NextResponse.json({
    organizations: rows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: count,
      totalPages: Math.ceil(count / query.limit),
    },
  });
});

export const POST = withAuth({
  requiredRole: "admin",
  validateBody: organizationSchema,
  auditAction: "organizations.create",
  auditResourceType: "organization",
  rateLimit: { maxRequests: 20, windowMs: 60_000 },
}, async (req) => {
  const body = req.validatedBody as { name: string; slug: string; plan: string };

  // Check slug uniqueness
  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, body.slug))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Organization slug already exists", code: "DUPLICATE_SLUG" },
      { status: 409 }
    );
  }

  const [org] = await db
    .insert(organizations)
    .values({
      name: body.name,
      slug: body.slug,
      plan: body.plan,
      settings: { allowActiveScans: false, requireMfaForActive: true },
      quotas: { monthlyScans: 200, concurrentScans: 3 },
    })
    .returning();

  return NextResponse.json({ organization: org }, { status: 201 });
});