-- Enable Row Level Security on all tenant-scoped tables
-- This migration must be run after the base schema is applied

-- Create a function to get current organization ID from session
CREATE OR REPLACE FUNCTION current_org_id() RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.current_org_id', true)::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on tenant tables
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorization_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_stage_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawler_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Organizations: only members can see their own org
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policies using current_org_id() - users can only access rows in their org

-- memberships
CREATE POLICY memberships_org_isolation ON memberships
  USING (organization_id = current_org_id());

-- invitations
CREATE POLICY invitations_org_isolation ON invitations
  USING (organization_id = current_org_id());

-- targets
CREATE POLICY targets_org_isolation ON targets
  USING (organization_id = current_org_id());

-- target_verifications
CREATE POLICY target_verifications_org_isolation ON target_verifications
  USING (organization_id = current_org_id());

-- authorization_artifacts
CREATE POLICY authorization_artifacts_org_isolation ON authorization_artifacts
  USING (organization_id = current_org_id());

-- scopes
CREATE POLICY scopes_org_isolation ON scopes
  USING (organization_id = current_org_id());

-- scope_rules
CREATE POLICY scope_rules_org_isolation ON scope_rules
  USING (organization_id = current_org_id());

-- scan_profiles
CREATE POLICY scan_profiles_org_isolation ON scan_profiles
  USING (organization_id = current_org_id());

-- auth_profiles
CREATE POLICY auth_profiles_org_isolation ON auth_profiles
  USING (organization_id = current_org_id());

-- scan_runs
CREATE POLICY scan_runs_org_isolation ON scan_runs
  USING (organization_id = current_org_id());

-- scan_stage_runs
CREATE POLICY scan_stage_runs_org_isolation ON scan_stage_runs
  USING (organization_id = current_org_id());

-- scan_jobs
CREATE POLICY scan_jobs_org_isolation ON scan_jobs
  USING (organization_id = current_org_id());

-- crawler_sessions
CREATE POLICY crawler_sessions_org_isolation ON crawler_sessions
  USING (organization_id = current_org_id());

-- discovered_routes
CREATE POLICY discovered_routes_org_isolation ON discovered_routes
  USING (organization_id = current_org_id());

-- findings
CREATE POLICY findings_org_isolation ON findings
  USING (organization_id = current_org_id());

-- finding_instances (via finding -> organization_id)
CREATE POLICY finding_instances_org_isolation ON finding_instances
  USING (
    EXISTS (
      SELECT 1 FROM findings f
      WHERE f.id = finding_instances.finding_id
      AND f.organization_id = current_org_id()
    )
  );

-- finding_evidence (via finding -> organization_id)
CREATE POLICY finding_evidence_org_isolation ON finding_evidence
  USING (
    EXISTS (
      SELECT 1 FROM findings f
      WHERE f.id = finding_evidence.finding_id
      AND f.organization_id = current_org_id()
    )
  );

-- finding_comments (via finding -> organization_id)
CREATE POLICY finding_comments_org_isolation ON finding_comments
  USING (
    EXISTS (
      SELECT 1 FROM findings f
      WHERE f.id = finding_comments.finding_id
      AND f.organization_id = current_org_id()
    )
  );

-- finding_state_history (via finding -> organization_id)
CREATE POLICY finding_state_history_org_isolation ON finding_state_history
  USING (
    EXISTS (
      SELECT 1 FROM findings f
      WHERE f.id = finding_state_history.finding_id
      AND f.organization_id = current_org_id()
    )
  );

-- reports
CREATE POLICY reports_org_isolation ON reports
  USING (organization_id = current_org_id());

-- audit_logs
CREATE POLICY audit_logs_org_isolation ON audit_logs
  USING (organization_id = current_org_id());

-- webhooks
CREATE POLICY webhooks_org_isolation ON webhooks
  USING (organization_id = current_org_id());

-- usage_counters
CREATE POLICY usage_counters_org_isolation ON usage_counters
  USING (organization_id = current_org_id());

-- organizations: users can only see orgs they're members of
CREATE POLICY organizations_member_access ON organizations
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = organizations.id
      AND m.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Users table: RLS for user data visibility within org
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_org_isolation ON users
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = users.id
      AND m.organization_id = current_org_id()
    )
  );

-- Grant usage on current_org_id function
GRANT EXECUTE ON FUNCTION current_org_id() TO PUBLIC;

-- Note: The application must set these session variables per request:
-- SET LOCAL app.current_org_id = '<org-uuid>';
-- SET LOCAL app.current_user_id = '<user-uuid>';