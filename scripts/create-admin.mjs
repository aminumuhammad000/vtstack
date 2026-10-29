import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, val] = arg.replace(/^--/, '').split('=');
  acc[key] = val || true;
  return acc;
}, {});

const email = args.email || 'admin@vtstack.ng';
const password = args.password || 'password123';
const firstName = args.firstName || 'VTStack';
const lastName = args.lastName || 'Admin';
const role = args.role || 'admin';
const phone = args.phone || '+2348000000000';

const randomHex = crypto.randomBytes(12).toString('hex');
const liveApiKey = args.liveApiKey || `vtp_live_admin_${randomHex}`;
const testApiKey = args.testApiKey || `vtp_test_admin_${randomHex}`;

async function main() {
  console.log('====================================================');
  console.log('       VTStack Admin & API Key Provisioning         ');
  console.log('====================================================');
  console.log(`Email:        ${email}`);
  console.log(`Role:         ${role}`);
  console.log(`Live API Key: ${liveApiKey}`);
  console.log(`Test API Key: ${testApiKey}`);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && !supabaseUrl.includes('placeholder') && serviceKey && !serviceKey.includes('placeholder')) {
    console.log(`\nConnecting to Supabase at ${supabaseUrl}...`);
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: existingUser, error: fetchErr } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      console.error('Error checking user in Supabase:', fetchErr.message);
    }

    if (existingUser) {
      console.log(`Updating existing user (${existingUser.id}) to ${role} with API keys...`);
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          role,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
          phone,
          status: 'active',
          kyc_level: 3,
          kyc_status: 'verified',
          kyc_tier: 't3',
          api_key: liveApiKey,
          live_api_key: liveApiKey,
          test_api_key: testApiKey,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingUser.id);

      if (updateErr) {
        console.error('Failed to update user in Supabase:', updateErr.message);
      } else {
        console.log('Admin user updated successfully in Supabase!');
      }
    } else {
      console.log('Inserting new admin user into Supabase...');
      const { error: insertErr } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
          phone,
          role,
          status: 'active',
          kyc_level: 3,
          kyc_status: 'verified',
          kyc_tier: 't3',
          api_key: liveApiKey,
          live_api_key: liveApiKey,
          test_api_key: testApiKey,
          is_payout_enabled: true,
          payout_request_status: 'approved',
          settlement_enabled: true,
          webhook_active: true,
          is_email_verified: true,
        });

      if (insertErr) {
        console.error('Failed to insert user into Supabase:', insertErr.message);
      } else {
        console.log('Admin user created successfully in Supabase!');
      }
    }
  } else {
    console.log('\n[INFO] Supabase credentials not set in environment.');
    console.log('Default in-memory store in VTStack is pre-configured with:');
  }

  console.log('\n----------------------------------------------------');
  console.log('CREDENTIALS & ACCESS SUMMARY:');
  console.log('----------------------------------------------------');
  console.log(`Admin Portal:      http://localhost:3000/admin`);
  console.log(`Admin Login:       http://localhost:3000/admin/login`);
  console.log(`Email:             ${email}`);
  console.log(`Password:          ${password}`);
  console.log(`Role:              ${role}`);
  console.log(`Live API Key:      ${liveApiKey}`);
  console.log(`Test API Key:      ${testApiKey}`);
  console.log('\nAUTHENTICATION HEADERS:');
  console.log(`Option 1 (Header): x-api-key: ${liveApiKey}`);
  console.log(`Option 2 (Bearer): Authorization: Bearer ${liveApiKey}`);
  console.log('====================================================\n');
}

main().catch(console.error);
