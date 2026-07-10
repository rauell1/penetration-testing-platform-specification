import { sql } from "drizzle-orm";
import { db } from "@/db";
import { targets } from "@/db/schema";
import { withAuth } from "@/lib/auth-middleware";
import { paginationSchema, targetSchema } from "@/lib/validation";
import { and, eq, ilike } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const targetFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  kind: z.string().optional(),
  activeScansEnabled: z.coerce.boolean().optional(),
});

export const GET = withAuth({
  requiredRole: "viewer",
  validateQuery: targetFilterSchema,
  auditAction: "targets.list",
  auditResourceType: "target",
  rateLimit: { maxRequests: 100, windowMs: 60_000 },
}, async (req) => {
  const query = req.validatedQuery as { page: number; limit: number; search?: string; kind?: string; activeScansEnabled?: boolean };
  const offset = (query.page - 1) * query.limit;

  const conditions = [eq(targets.organizationId, req.authContext!.organization.id)];
  if (query.search) {
    conditions.push(
      sql`(${targets.label} ILIKE ${`%${query.search}%`} OR ${targets.primaryHost} ILIKE ${`%${query.search}%`})`
    );
  }
  if (query.kind) {
    conditions.push(eq(targets.kind, query.kind));
  }
  if (query.activeScansEnabled !== undefined) {
    conditions.push(eq(targets.activeScansEnabled, query.activeScansEnabled));
  }

  const rows = await db
    .select()
    .from(targets)
    .where(and(...conditions))
    .limit(query.limit)
    .offset(offset)
    .orderBy(sql`${targets.createdAt} desc`);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(targets)
    .where(and(...conditions));

  return NextResponse.json({
    targets: rows,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: count,
      totalPages: Math.ceil(count / query.limit),
    },
  });
});

export const POST = withAuth({
  requiredRole: "engineer",
  validateBody: targetSchema,
  auditAction: "targets.create",
  auditResourceType: "target",
  rateLimit: { maxRequests: 50, windowMs: 60_000 },
}, async (req) => {
  const body = req.validatedBody as z.infer<typeof targetSchema>;
  const auth = req.authContext!;

  // Check if target with same primaryHost already exists in this org
  const existing = await db
    .select({ id: targets.id })
    .from(targets)
    .where(and(eq(targets.organizationId, auth.organization.id), eq(targets.primaryHost, body.primaryHost)))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Target with this host already exists in organization", code: "DUPLICATE_HOST" },
      { status: 409 }
    );
  }

  const [target] = await db
    .insert(targets)
    .values({
      organizationId: auth.organization.id,
      label: body.label,
      primaryHost: body.primaryHost,
      kind: body.kind,
      baseUrl: body.scope?.allowHosts[0] ? `https://${body.scope.allowHosts[0]}` : `https://${body.primaryHost}`,
      activeScansEnabled: body.activeScansEnabled,
      createdByUserId: auth.user.id,
    })
    .returning();

  return NextResponse.json({ target }, { status: 201 });
});