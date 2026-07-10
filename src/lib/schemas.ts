import { z } from "zod";

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

export const createTargetSchema = z.object({
  label: z.string().min(1).max(128),
  primaryHost: z.string().min(1).max(255),
  kind: z.enum(["web_app", "api", "mobile_backend", "other"]),
  activeScansEnabled: z.boolean().default(false),
  scope: z.object({
    allowHosts: z.array(z.string()).min(1),
    denyHosts: z.array(z.string()).default([]),
    allowPaths: z.array(z.string()).default(["/"]),
    denyPaths: z.array(z.string()).default([]),
    allowedMethods: z.array(z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])).default(["GET", "POST", "HEAD", "OPTIONS"]),
    authRequired: z.boolean().default(false),
    maxRequestsPerSecond: z.number().int().positive().max(100).default(10),
    maxConcurrentRequests: z.number().int().positive().max(10).default(5),
    allowActive: z.boolean().default(true),
    requireVerification: z.boolean().default(true),
    pinnedHosts: z.array(z.object({
      host: z.string(),
      ips: z.array(z.string()),
    })).default([]),
  }).optional(),
});

export const updateTargetSchema = createTargetSchema.partial();

export const createScanProfileSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  kind: z.enum(["passive", "basic_active", "deep_active", "api_focused", "auth_focused"] as const),
  config: z.record(z.unknown()).default({}),
});

export const createAuthProfileSchema = z.object({
  name: z.string().min(1).max(128),
  type: z.enum(["cookie", "header", "bearer", "oauth2", "form"] as const),
  config: z.record(z.unknown()),
});

export const createScanRunSchema = z.object({
  targetId: z.string().uuid(),
  scanProfileId: z.string().uuid(),
  authProfileId: z.string().uuid().optional(),
  scopeId: z.string().uuid().optional(),
});

export const createWebhookSchema = z.object({
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
});

export const scanRunFilterSchema = paginationSchema.extend({
  status: z.enum(["queued", "policy_preflight", "resolving", "crawling", "passive", "active", "normalizing", "reporting", "completed", "failed", "cancelled", "killed"]).optional(),
  targetId: z.string().uuid().optional(),
});

// ============================================================================
// Type exports
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateTargetInput = z.infer<typeof createTargetSchema>;
export type UpdateTargetInput = z.infer<typeof updateTargetSchema>;
export type CreateScanProfileInput = z.infer<typeof createScanProfileSchema>;
export type CreateAuthProfileInput = z.infer<typeof createAuthProfileSchema>;
export type CreateScanRunInput = z.infer<typeof createScanRunSchema>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type FindingFilterParams = z.infer<typeof findingFilterSchema>;
export type ScanRunFilterParams = z.infer<typeof scanRunFilterSchema>;