-- VTStack Seed Admin User with API Keys
-- Execute in Supabase SQL Editor to grant admin access and configure API keys

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
    is_payout_enabled,
    payout_request_status,
    api_key,
    live_api_key,
    test_api_key,
    settlement_enabled,
    webhook_active,
    is_email_verified,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'admin@vtstack.ng',
    '$2a$10$QSv7ztwOYgMkraMRgnxxque7TfNdYkBFW/ObbbY3NThqR45L.r/hG', -- password123
    'VTStack',
    'Admin',
    'VTStack Admin',
    '+2348000000000',
    'admin',
    'active',
    3,
    'verified',
    't3',
    TRUE,
    'approved',
    'vtp_live_admin_98a72b1c8f4d5e6a7b8c',
    'vtp_live_admin_98a72b1c8f4d5e6a7b8c',
    'vtp_test_admin_12a34b5c6d7e8f9a0b1c',
    TRUE,
    TRUE,
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    status = 'active',
    api_key = EXCLUDED.api_key,
    live_api_key = EXCLUDED.live_api_key,
    test_api_key = EXCLUDED.test_api_key,
    updated_at = NOW();
