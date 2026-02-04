-- Memory API Tables
-- Run this migration against your Supabase project

-- Users table (if not already exists via Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Memory instances - one per user (could expand to many)
CREATE TABLE IF NOT EXISTS memory_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  db_path TEXT NOT NULL,
  name TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

-- API keys for authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used TIMESTAMPTZ
);

-- Usage log for rate limiting and metering
CREATE TABLE IF NOT EXISTS usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tokens_used INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_instances_user_id ON memory_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_user_id_timestamp ON usage_log(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_log_timestamp ON usage_log(timestamp DESC);

-- RLS Policies (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY memory_instances_select_own ON memory_instances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY api_keys_select_own ON api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY usage_log_select_own ON usage_log FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (for API)
CREATE POLICY users_service_all ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY memory_instances_service_all ON memory_instances FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY api_keys_service_all ON api_keys FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY usage_log_service_all ON usage_log FOR ALL USING (auth.role() = 'service_role');

-- Function to clean old usage logs (keep 30 days)
CREATE OR REPLACE FUNCTION clean_old_usage_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM usage_log WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger for users
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
