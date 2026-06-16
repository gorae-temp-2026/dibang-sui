-- Allow admin to create weddings without host assignment
-- Host validation is enforced at API level (host API) instead of DB level
ALTER TABLE weddings DROP CONSTRAINT IF EXISTS weddings_at_least_one_host;

-- hosts_differ: NULL IS DISTINCT FROM NULL = false, blocking both-null inserts
-- Replace with conditional check: only enforce when both are non-null
ALTER TABLE weddings DROP CONSTRAINT IF EXISTS weddings_hosts_differ;
ALTER TABLE weddings ADD CONSTRAINT weddings_hosts_differ
  CHECK (host1_id IS NULL OR host2_id IS NULL OR host1_id IS DISTINCT FROM host2_id);
