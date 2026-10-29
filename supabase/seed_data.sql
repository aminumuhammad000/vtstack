-- ==============================================================================
-- VTStack Initial Seed Data
-- Run this in your Supabase SQL Editor right after running schema.sql:
-- https://supabase.com/dashboard/project/ufkknsbtvhqqdrochjzu/sql
-- ==============================================================================

-- 1. Seed Users (Admin and Demo Merchant)
-- Passwords are encrypted bcrypt hashes for: password123
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    full_name,
    phone,
    role,
    status,
    kyc_level,
    kyc_status,
    kyc_tier,
    business_name,
    is_payout_enabled,
    payout_request_status,
    api_key,
    live_api_key,
    test_api_key,
    settlement_enabled,
    webhook_active,
    is_email_verified,
    payout_daily_limit,
    payout_hourly_limit,
    created_at,
    updated_at
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'admin@vtstack.ng',
    '$2a$10$QSv7ztwOYgMkraMRgnxxque7TfNdYkBFW/ObbbY3NThqR45L.r/hG',
    'VTStack',
    'Admin',
    'VTStack Admin',
    '+2348000000000',
    'admin',
    'active',
    3,
    'verified',
    't3',
    'VTStack Platform Admin',
    TRUE,
    'approved',
    'vtp_live_admin_98a72b1c8f4d5e6a7b8c',
    'vtp_live_admin_98a72b1c8f4d5e6a7b8c',
    'vtp_test_admin_12a34b5c6d7e8f9a0b1c',
    TRUE,
    TRUE,
    TRUE,
    10000000,
    2000000,
    NOW(),
    NOW()
),
(
    '22222222-2222-2222-2222-222222222222',
    'merchant@example.com',
    '$2a$10$QSv7ztwOYgMkraMRgnxxque7TfNdYkBFW/ObbbY3NThqR45L.r/hG',
    'Apex',
    'Merchant',
    'Apex Merchant Store',
    '+2348123456789',
    'user',
    'active',
    2,
    'verified',
    't2',
    'Apex Store Ltd',
    TRUE,
    'approved',
    'vtp_live_98a72b1c8f4d5e6a7b8c',
    'vtp_live_98a72b1c8f4d5e6a7b8c',
    'vtp_test_12a34b5c6d7e8f9a0b1c',
    TRUE,
    TRUE,
    TRUE,
    1000000,
    250000,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    api_key = EXCLUDED.api_key,
    live_api_key = EXCLUDED.live_api_key,
    test_api_key = EXCLUDED.test_api_key,
    updated_at = NOW();

-- 2. Seed Wallets
INSERT INTO wallets (
    id,
    user_id,
    balance,
    cleared_balance,
    locked_balance,
    currency,
    created_at,
    updated_at
) VALUES 
(
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    450000,
    450000,
    0,
    'NGN',
    NOW(),
    NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    balance = EXCLUDED.balance,
    cleared_balance = EXCLUDED.cleared_balance,
    updated_at = NOW();

-- 3. Seed Virtual Accounts (PalmPay Dedicated Account)
INSERT INTO virtual_accounts (
    id,
    user_id,
    account_number,
    account_name,
    bank_name,
    bank_type,
    email,
    alias,
    reference,
    status,
    created_at,
    updated_at
) VALUES 
(
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    '9902345678',
    'VTStack - Apex Store Ltd',
    'PalmPay',
    'palmpay',
    'merchant@example.com',
    'Main Collection Account',
    'REF-VA-9902345',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (account_number) DO UPDATE SET
    status = 'active',
    updated_at = NOW();

-- 4. Seed Transactions
INSERT INTO transactions (
    id,
    wallet_id,
    user_id,
    type,
    category,
    amount,
    fee,
    balance_before,
    balance_after,
    reference,
    customer_reference,
    narration,
    status,
    is_cleared,
    cleared_at,
    created_at
) VALUES 
(
    '55555555-5555-5555-5555-555555555551',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'credit',
    'deposit',
    150000,
    250,
    300000,
    449750,
    'TXN-DEP-849201',
    'ORD-772184',
    'PalmPay Virtual Account Deposit - Jane Doe',
    'success',
    TRUE,
    NOW(),
    NOW() - INTERVAL '4 hours'
),
(
    '55555555-5555-5555-5555-555555555552',
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'credit',
    'deposit',
    200000,
    350,
    100350,
    300000,
    'TXN-DEP-849202',
    'ORD-772185',
    'PalmPay Virtual Account Deposit - Ahmed Musa',
    'success',
    TRUE,
    NOW(),
    NOW() - INTERVAL '8 hours'
)
ON CONFLICT (reference) DO NOTHING;

-- 5. Seed System Settings
INSERT INTO system_settings (
    id,
    key,
    general,
    notifications,
    security,
    parent_account,
    global_settlement,
    email_config,
    payout,
    deposit,
    kyc_tier_limits,
    updated_at
) VALUES 
(
    '66666666-6666-6666-6666-666666666666',
    'global',
    '{"companyName":"VTStack Systems","supportEmail":"support@vtstack.ng","currency":"NGN","timezone":"Africa/Lagos","maintenanceMode":false}'::jsonb,
    '{"emailAlerts":true,"slackIntegration":false,"webhookRetries":3,"dailyReports":true}'::jsonb,
    '{"twoFactorAuth":false,"sessionTimeout":30,"passwordExpiry":90,"ipWhitelist":""}'::jsonb,
    '{"accountName":"VTStack Operations","accountNumber":"9901827364","bankCode":"999992","type":"PRIMARY","status":"ACTIVE"}'::jsonb,
    '{"status":true,"weekendSettlementEnabled":false,"scheduleType":"T1","schedulePeriod":"Daily","settlementAccounts":[]}'::jsonb,
    '{"provider":"resend","fromEmail":"VTStack <support@vtstack.ng>"}'::jsonb,
    '{"minAmount":100,"vtpayFeePercent":0.5,"bankSettlementFee":10,"bankSettlementThreshold":1000,"payoutTierStep":2500,"payoutTierFeeStep":25}'::jsonb,
    '{"vtpayFeePercent":1.0,"virtualAccountChargePercent":0.5}'::jsonb,
    '{"t1":{"dailyWithdrawalLimit":50000,"monthlyWithdrawalLimit":500000,"dailyDepositLimit":100000,"monthlyDepositLimit":1000000},"t2":{"dailyWithdrawalLimit":200000,"monthlyWithdrawalLimit":2000000,"dailyDepositLimit":500000,"monthlyDepositLimit":5000000},"t3":{"dailyWithdrawalLimit":1000000,"monthlyWithdrawalLimit":10000000,"dailyDepositLimit":5000000,"monthlyDepositLimit":50000000}}'::jsonb,
    NOW()
)
ON CONFLICT (key) DO UPDATE SET
    general = EXCLUDED.general,
    parent_account = EXCLUDED.parent_account,
    email_config = EXCLUDED.email_config,
    updated_at = NOW();

-- 6. Seed Default Fee Rules
INSERT INTO fee_rules (
    name,
    type,
    calculation_type,
    value,
    cap,
    floor,
    is_active
) VALUES 
('Standard Deposit Fee', 'deposit', 'percentage', 1.0, 2000, 50, TRUE),
('Tiered Payout Band Fee', 'payout', 'fixed', 25, 500, 25, TRUE),
('Virtual Account Maintenance', 'maintenance', 'fixed', 0, 0, 0, TRUE)
ON CONFLICT DO NOTHING;

-- 7. Seed Default Risk Rules
INSERT INTO risk_rules (
    name,
    type,
    condition,
    action,
    priority,
    status
) VALUES 
('High Velocity Transactions', 'velocity', 'transactions_per_minute > 20', 'flag', 1, 'active'),
('Single Payout Hard Ceiling', 'amount_limit', 'amount > 5000000', 'review', 1, 'active'),
('Suspicious Geo Location', 'geo_block', 'country != "NG"', 'flag', 2, 'active')
ON CONFLICT DO NOTHING;

-- 8. Seed Default System Audit Log
INSERT INTO audit_logs (
    admin_id,
    admin_email,
    action,
    resource,
    details
) VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'admin@vtstack.ng',
    'SYSTEM_INITIALIZATION',
    'DATABASE_SEED',
    '{"message":"Initial VTStack database schema and seed data deployed successfully"}'::jsonb
);
