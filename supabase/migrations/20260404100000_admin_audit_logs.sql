-- Admin audit logs for tracking all mutation operations
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  admin_email text NOT NULL DEFAULT '',
  action text NOT NULL,           -- 'create' | 'update' | 'delete'
  resource_type text NOT NULL,    -- 'wedding' | 'profile' | 'cash_gift' | ...
  resource_id text NOT NULL,      -- text for flexibility (UUID or composite keys)
  changes jsonb,                  -- { before?: {...}, after?: {...} }
  request_method text,            -- 'POST' | 'PATCH' | 'DELETE'
  request_path text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: service_role only (no client access)
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Index for querying by resource
CREATE INDEX idx_admin_audit_logs_resource
  ON admin_audit_logs (resource_type, resource_id);

-- Index for querying by admin user
CREATE INDEX idx_admin_audit_logs_admin
  ON admin_audit_logs (admin_user_id, created_at DESC);

-- Index for time-based queries
CREATE INDEX idx_admin_audit_logs_created
  ON admin_audit_logs (created_at DESC);
