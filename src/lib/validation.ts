// ============================================================================
// Validation Schemas (Zod) - API boundary contracts
// ============================================================================

import { z } from "zod";
import type {
  Severity,
  FindingState,
  ScanRunStatus,
  VerificationType,
  VerificationStatus,
  ScopeRuleType,
  ScanProfileKind,
  Role,
} from "@/domain/types";

// ============================================================================
// Auth schemas
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  organizationName: z.string().min(2, "Organization name required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token required"),
});

// ============================================================================
// Organization-scoped resource schemas
// ============================================================================

export const targetScopeSchema = z.object({
  allowHosts: z.array(z.string()).min(1, "At least one allowed host required"),
  denyHosts: z.array(z.string()).default([]),
  allowPaths: z.array(z.string()).default(["/"]),
  denyPaths: z.array(z.string()).default([]),
  allowedMethods: z.array(z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const)).default(["GET", "POST", "HEAD", "OPTIONS"]),
  authRequired: z.boolean().default(false),
  maxRequestsPerSecond: z.number().int().positive().max(100).default(10),
  maxConcurrentRequests: z.number().int().positive().max(10).default(5),
  allowActive: z.boolean().default(true),
  requireVerification: z.boolean().default(true),
  pinnedHosts: z.array(z.object({
    host: z.string(),
    ips: z.array(z.string()),
  })).default([]),
});

export const targetSchema = z.object({
  label: z.string().min(1).max(128),
  primaryHost: z.string().min(1).max(255),
  kind: z.enum(["web_app", "api", "mobile_backend", "other"] as const),
  activeScansEnabled: z.boolean().default(false),
  scope: targetScopeSchema.optional(),
});

export const updateTargetSchema = targetSchema.partial();

export const scanProfileSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  kind: z.enum(["passive", "basic_active", "deep_active", "api_focused", "auth_focused"] as const),
  config: z.record(z.unknown()).default({}),
});

export const authProfileSchema = z.object({
  name: z.string().min(1).max(128),
  type: z.enum(["cookie", "header", "bearer", "oauth2", "form"] as const),
  config: z.record(z.unknown()),
});

export const scanRunSchema = z.object({
  targetId: z.string().uuid(),
  scanProfileId: z.string().uuid(),
  authProfileId: z.string().uuid().optional(),
  scopeId: z.string().uuid().optional(),
});

export const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(32).max(128).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  plan: z.enum(["free", "team", "enterprise"]).optional(),
  settings: z.object({
    requireMfaForActive: z.boolean().optional(),
    allowActiveScans: z.boolean().optional(),
  }).optional(),
});

export const organizationSchema = z.object({
  name: z.string().min(1).max(128),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  plan: z.enum(["free", "team", "enterprise"] as const).default("free"),
});

// ============================================================================
// Query parameter schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const findingFilterSchema = paginationSchema.extend({
  severity: z.enum(["info", "low", "medium", "high", "critical"]).optional(),
  state: z.enum(["open", "triaged", "in_progress", "resolved", "false_positive", "wont_fix"]).optional(),
  targetId: z.string().uuid().optional(),
  scanRunId: z.string().uuid().optional(),
  cwe: z.string().optional(),
  minConfidence: z.enum(["tentative", "likely", "confirmed"]).optional(),
});

export const scanRunFilterSchema = paginationSchema.extend({
  status: z.enum(["queued", "policy_preflight", "resolving", "crawling", "passive", "active", "normalizing", "reporting", "completed", "failed", "cancelled", "killed"]).optional(),
  targetId: z.string().uuid().optional(),
  scanProfileId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const targetFilterSchema = paginationSchema.extend({
  kind: z.enum(["web_app", "api", "mobile_backend", "other"]).optional(),
  verified: z.coerce.boolean().optional(),
  activeScansEnabled: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const organizationFilterSchema = paginationSchema.extend({
  plan: z.enum(["free", "team", "enterprise"]).optional(),
  search: z.string().optional(),
});

// ============================================================================
// Bulk operation schemas
// ============================================================================

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export const bulkUpdateFindingsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  state: z.enum(["triaged", "in_progress", "resolved", "false_positive", "wont_fix"]).optional(),
  assigneeId: z.string().uuid().optional(),
  severity: z.enum(["info", "low", "medium", "high", "critical"]).optional(),
});

// ============================================================================
// Type exports
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TargetInput = z.infer<typeof targetSchema>;
export type UpdateTargetInput = z.infer<typeof updateTargetSchema>;
export type ScanProfileInput = z.infer<typeof scanProfileSchema>;
export type AuthProfileInput = z.infer<typeof authProfileSchema>;
export type ScanRunInput = z.infer<typeof scanRunSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type FindingFilterParams = z.infer<typeof findingFilterSchema>;
export type ScanRunFilterParams = z.infer<typeof scanRunFilterSchema>;
export type TargetFilterParams = z.infer<typeof targetFilterSchema>;
export type OrganizationFilterParams = z.infer<typeof organizationFilterSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
export type BulkUpdateFindingsInput = z.infer<typeof bulkUpdateFindingsSchema>;