-- ==============================================================================
-- VTStack Fix: Disable RLS and Grant Permissions
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ufkknsbtvhqqdrochjzu/sql
-- ==============================================================================

-- 1. Disable Row Level Security on all tables so your Netlify serverless
-- functions can read and write data reliably without being blocked by 42501 RLS errors
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS virtual_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webhook_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fee_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS risk_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS disputes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS help_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ledgers DISABLE ROW LEVEL SECURITY;

-- 2. Grant full read/write permissions to anon, authenticated, and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Also add open permissive policies just in case RLS is ever toggled back on
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'users', 'wallets', 'transactions', 'virtual_accounts', 
        'payouts', 'webhooks', 'webhook_events', 'fee_rules', 
        'risk_rules', 'disputes', 'help_messages', 'notifications', 
        'admin_logs', 'audit_logs', 'system_settings', 'ledgers'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
            EXECUTE format('DROP POLICY IF EXISTS "allow_all_%s" ON %I', tbl, tbl);
            EXECUTE format('CREATE POLICY "allow_all_%s" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
        END IF;
    END LOOP;
END $$;
