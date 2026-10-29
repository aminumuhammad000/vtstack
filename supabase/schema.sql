-- ==============================================================================
-- VTStack Complete Supabase Database Schema
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ufkknsbtvhqqdrochjzu/sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT,
    phone TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'subadmin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'inactive')),
    kyc_level INTEGER DEFAULT 0,
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    kyc_tier TEXT DEFAULT 'none' CHECK (kyc_tier IN ('none', 't1', 't2', 't3')),
    nin TEXT,
    bvn TEXT,
    identity_type TEXT,
    id_card_path TEXT,
    selfie_path TEXT,
    utility_bill_path TEXT,
    state TEXT,
    lga TEXT,
    address TEXT,
    business_name TEXT,
    business_address TEXT,
    business_phone TEXT,
    rc_number TEXT,
    cac_document_path TEXT,
    is_payout_enabled BOOLEAN DEFAULT FALSE,
    payout_request_status TEXT DEFAULT 'none' CHECK (payout_request_status IN ('none', 'pending', 'approved', 'rejected')),
    payout_request_reason TEXT,
    payout_secret_key_hash TEXT,
    payout_ip_whitelist JSONB DEFAULT '[]'::jsonb,
    payout_daily_limit NUMERIC DEFAULT 500000,
    payout_hourly_limit NUMERIC DEFAULT 100000,
    api_key TEXT,
    live_api_key TEXT,
    test_api_key TEXT,
    webhook_url TEXT,
    webhook_active BOOLEAN DEFAULT TRUE,
    settlement_enabled BOOLEAN DEFAULT TRUE,
    profile_picture TEXT,
    transaction_pin_hash TEXT,
    verification_token TEXT,
    is_email_verified BOOLEAN DEFAULT FALSE,
    reset_password_otp TEXT,
    reset_password_otp_expires TIMESTAMPTZ,
    saved_bank_details JSONB,
    payout_accounts JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    balance NUMERIC DEFAULT 0 CHECK (balance >= 0),
    cleared_balance NUMERIC DEFAULT 0 CHECK (cleared_balance >= 0),
    locked_balance NUMERIC DEFAULT 0 CHECK (locked_balance >= 0),
    currency TEXT DEFAULT 'NGN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Virtual Accounts Table
CREATE TABLE IF NOT EXISTS virtual_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    account_number TEXT UNIQUE NOT NULL,
    account_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    bank_type TEXT DEFAULT 'palmpay',
    email TEXT NOT NULL,
    alias TEXT,
    reference TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'frozen')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    category TEXT NOT NULL CHECK (category IN ('deposit', 'transfer', 'withdrawal', 'refund', 'fee', 'settlement', 'adjustment')),
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    fee NUMERIC DEFAULT 0,
    balance_before NUMERIC NOT NULL DEFAULT 0,
    balance_after NUMERIC NOT NULL DEFAULT 0,
    reference TEXT UNIQUE NOT NULL,
    customer_reference TEXT,
    external_ref TEXT,
    narration TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_cleared BOOLEAN DEFAULT TRUE,
    cleared_at TIMESTAMPTZ,
    flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Payouts Table
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    fee NUMERIC DEFAULT 0,
    payrant_fee NUMERIC DEFAULT 0,
    total_debit NUMERIC NOT NULL CHECK (total_debit >= 0),
    bank_code TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    payout_type TEXT DEFAULT 'external' CHECK (payout_type IN ('internal', 'external')),
    reference TEXT UNIQUE NOT NULL,
    external_ref TEXT,
    idempotency_key TEXT,
    status TEXT DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'LOCKED', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED')),
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    notify_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 6. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Fee Rules Table
CREATE TABLE IF NOT EXISTS fee_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    calculation_type TEXT NOT NULL,
    value NUMERIC NOT NULL,
    cap NUMERIC,
    floor NUMERIC,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Risk Rules Table
CREATE TABLE IF NOT EXISTS risk_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('velocity', 'amount_limit', 'blacklist', 'whitelist', 'geo_block')),
    condition TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('block', 'flag', 'review')),
    priority INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    hits INTEGER DEFAULT 0,
    last_triggered TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL DEFAULT 'global',
    general JSONB DEFAULT '{"companyName":"VTStack Systems","supportEmail":"support@vtstack.ng","currency":"NGN","timezone":"Africa/Lagos","maintenanceMode":false}'::jsonb,
    notifications JSONB DEFAULT '{"emailAlerts":true,"slackIntegration":false,"webhookRetries":3,"dailyReports":true}'::jsonb,
    security JSONB DEFAULT '{"twoFactorAuth":false,"sessionTimeout":30,"passwordExpiry":90,"ipWhitelist":""}'::jsonb,
    parent_account JSONB DEFAULT '{"accountName":"VTStack Operations","accountNumber":"9901827364","bankCode":"999992","type":"PRIMARY","status":"ACTIVE"}'::jsonb,
    global_settlement JSONB DEFAULT '{"status":false,"weekendSettlementEnabled":false,"scheduleType":"T1","schedulePeriod":"Daily","settlementAccounts":[]}'::jsonb,
    email_config JSONB DEFAULT '{"provider":"resend","fromEmail":"VTStack <onboarding@resend.dev>"}'::jsonb,
    payout JSONB DEFAULT '{"minAmount":100,"vtpayFeePercent":0.5,"bankSettlementFee":10,"bankSettlementThreshold":1000,"payoutTierStep":2500,"payoutTierFeeStep":25}'::jsonb,
    deposit JSONB DEFAULT '{"vtpayFeePercent":1.0,"virtualAccountChargePercent":0.5}'::jsonb,
    kyc_tier_limits JSONB DEFAULT '{"t1":{"dailyWithdrawalLimit":50000,"monthlyWithdrawalLimit":500000,"dailyDepositLimit":100000,"monthlyDepositLimit":1000000},"t2":{"dailyWithdrawalLimit":200000,"monthlyWithdrawalLimit":2000000,"dailyDepositLimit":500000,"monthlyDepositLimit":5000000},"t3":{"dailyWithdrawalLimit":1000000,"monthlyWithdrawalLimit":10000000,"dailyDepositLimit":5000000,"monthlyDepositLimit":50000000}}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Help Messages Table
CREATE TABLE IF NOT EXISTS help_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Communications Table
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID,
    recipient_id UUID,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'email',
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Webhook Logs Table
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event TEXT NOT NULL,
    url TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    status TEXT DEFAULT 'success',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Ledger Table (Double-Entry Bookkeeping)
CREATE TABLE IF NOT EXISTS ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    reference TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    purpose TEXT NOT NULL,
    balance_before NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Parent Account Ledger
CREATE TABLE IF NOT EXISTS parent_account_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_number TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
    category TEXT NOT NULL,
    reference TEXT NOT NULL,
    narration TEXT,
    balance_before NUMERIC DEFAULT 0,
    balance_after NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
CREATE INDEX IF NOT EXISTS idx_users_live_api_key ON users(live_api_key);
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_account_number ON virtual_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_virtual_accounts_user_id ON virtual_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_reference ON payouts(reference);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledgers_wallet_id ON ledgers(wallet_id);
