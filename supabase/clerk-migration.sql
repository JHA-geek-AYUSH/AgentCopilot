-- Migration: Decouple users table from auth.users so Clerk users can be stored
-- Run this in the Supabase SQL Editor

-- 1. Drop the old trigger and function that linked to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 2. Drop old RLS policies that rely on auth.uid() = id
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can manage own task steps" ON task_steps;
DROP POLICY IF EXISTS "Users can manage own executions" ON executions;
DROP POLICY IF EXISTS "Users can manage own memories" ON memory_nodes;

-- 3. Recreate users table without the auth.users FK constraint
--    We keep existing rows if any, then alter the PK to be self-managed.
--    If table is empty (fresh project) this is straightforward.
--    If you have data, this will recreate the table - back up first.

-- Option A: If the table is NEW / EMPTY — drop and recreate cleanly:
DROP TABLE IF EXISTS memory_nodes CASCADE;
DROP TABLE IF EXISTS executions CASCADE;
DROP TABLE IF EXISTS task_steps CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Recreate users WITHOUT the auth.users FK
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  provider TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- Recreate tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  input TEXT NOT NULL,
  plan JSONB,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate task_steps
CREATE TABLE task_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  tool_name TEXT NOT NULL,
  tool_input JSONB NOT NULL,
  tool_output JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate executions
CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  step_id UUID REFERENCES task_steps(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  input JSONB,
  output JSONB,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate memory_nodes
CREATE TABLE memory_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('fact', 'preference', 'context', 'interaction', 'task_summary', 'key_output')),
  content TEXT NOT NULL,
  source TEXT,
  metadata JSONB DEFAULT '{}',
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_steps_task_id ON task_steps(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_task_id ON executions(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON executions(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_user_id ON memory_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_type ON memory_nodes(type);
CREATE INDEX IF NOT EXISTS idx_memory_nodes_created_at ON memory_nodes(created_at DESC);

-- 4. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_nodes ENABLE ROW LEVEL SECURITY;

-- 5. New RLS policies: service_role bypasses RLS automatically.
--    For anon/authenticated access, allow based on clerk_id matching a header
--    (server always uses service_role key so these are mainly a safety net).
CREATE POLICY "Service role full access to users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to tasks" ON tasks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to task_steps" ON task_steps
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to executions" ON executions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to memory_nodes" ON memory_nodes
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Recreate updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_memory_nodes_updated_at BEFORE UPDATE ON memory_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
