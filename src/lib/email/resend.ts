/**
 * Resend Email Integration for VTStack
 */

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY || '';
  const from = options.from || process.env.RESEND_FROM_EMAIL || 'VTStack <support@vtstack.ng>';
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  if (!apiKey) {
    console.warn('[Email:Resend] RESEND_API_KEY is not set. Email not sent.');
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  try {
    let res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    let data = await res.json();
    if (!res.ok) {
      console.warn('[Email:Resend] Initial send attempt failed:', data);
      const errorMsg = (data.message || '').toLowerCase();
      if ((errorMsg.includes('domain') || errorMsg.includes('not verified') || data.name === 'validation_error') && !from.includes('onboarding@resend.dev')) {
        console.info('[Email:Resend] Retrying via onboarding@resend.dev in case custom domain is unverified...');
        res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'VTStack <onboarding@resend.dev>',
            to: recipients,
            subject: options.subject,
            html: options.html,
            text: options.text,
          }),
        });
        data = await res.json();
      }
    }

    if (!res.ok) {
      console.error('[Email:Resend] Failed to send email:', data);
      return { success: false, error: data.message || 'Failed to send email via Resend' };
    }

    return { success: true, id: data.id };
  } catch (error: any) {
    console.error('[Email:Resend] Request failed:', error);
    return { success: false, error: error.message || 'Unknown network error' };
  }
}

export async function sendOtpEmail(email: string, otp: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 700;">VTStack</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Next-Generation Virtual Accounts & Payments</p>
      </div>
      <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 12px 0;">Verification Code</h2>
        <p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">
          Use the 6-digit one-time code below to verify your account or authorize your action. This code expires in 10 minutes.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #4f46e5; background: #eef2ff; padding: 12px 24px; border-radius: 8px; font-family: monospace;">
            ${otp}
          </span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
          If you did not request this verification code, please ignore this email or contact support.
        </p>
      </div>
      <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        &copy; ${new Date().getFullYear()} VTStack Systems. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Your VTStack Verification Code: ${otp}`,
    html,
    text: `Your VTStack verification code is: ${otp}. It will expire in 10 minutes.`,
  });
}

export async function sendPasswordResetEmail(email: string, otp: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 700;">VTStack</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Password Reset Request</p>
      </div>
      <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 12px 0;">Reset Your Password</h2>
        <p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">
          We received a request to reset the password for your VTStack account. Use the code below to complete the reset:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #dc2626; background: #fef2f2; padding: 12px 24px; border-radius: 8px; font-family: monospace;">
            ${otp}
          </span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">
          If you did not make this request, you can safely disregard this message.
        </p>
      </div>
      <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        &copy; ${new Date().getFullYear()} VTStack Systems. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `VTStack Password Reset OTP: ${otp}`,
    html,
    text: `Your VTStack password reset code is: ${otp}.`,
  });
}

export async function sendBroadcastEmail(recipients: string[], subject: string, message: string) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 700;">VTStack</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Official Announcement</p>
      </div>
      <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 12px 0;">${subject}</h2>
        <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-line;">
          ${message}
        </div>
      </div>
      <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        &copy; ${new Date().getFullYear()} VTStack Systems. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({
    to: recipients,
    subject: `[VTStack] ${subject}`,
    html,
    text: message,
  });
}

export async function sendWelcomeEmail(email: string, recipientName?: string) {
  const name = recipientName || 'Valued Partner';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vtstack.ng';
  const loginUrl = `${appUrl}/login`;
  const supportEmail = 'support@vtstack.ng';
  const websiteUrl = 'https://vtstack.ng';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">VTStack</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Next-Generation Virtual Accounts & Payments</p>
      </div>

      <div style="background: #f8fafc; border-radius: 10px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 14px 0; font-weight: 700;">Hi ${name},</h2>
        <p style="color: #334155; font-size: 15px; margin: 0 0 12px 0; font-weight: 600;">Welcome to VTStack!</p>
        <p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">
          We're excited to have you on board. VTStack is designed to help you build, manage, and scale your digital infrastructure with ease.
        </p>
        <p style="color: #475569; font-size: 14px; margin: 0 0 20px 0; line-height: 1.6;">
          Your account has been created successfully, and you're ready to get started.
        </p>

        <h3 style="font-size: 14px; color: #1e293b; margin: 0 0 10px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">What's next?</h3>
        <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
          <li>Explore your VTStack dashboard.</li>
          <li>Configure your account settings.</li>
          <li>Discover the tools and services available to you.</li>
        </ul>

        <div style="text-align: center; margin: 28px 0 20px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 36px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.25);">
            Get Started
          </a>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
          If you need assistance, our support team is here to help.
        </p>
        <p style="color: #334155; font-size: 13px; line-height: 1.5; margin: 0; font-weight: 500;">
          Thank you for choosing VTStack!
        </p>
      </div>

      <div style="color: #475569; font-size: 13px; line-height: 1.6; padding-top: 8px;">
        <p style="margin: 0;">Best regards,</p>
        <p style="margin: 0; font-weight: 700; color: #1e293b;">The VTStack Team</p>
        <p style="margin: 4px 0 0 0;">
          <a href="mailto:${supportEmail}" style="color: #4f46e5; text-decoration: none;">${supportEmail}</a><br />
          <a href="${websiteUrl}" style="color: #4f46e5; text-decoration: none;">${websiteUrl}</a>
        </p>
      </div>

      <div style="text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
        &copy; ${new Date().getFullYear()} VTStack (vtstack.ng). All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Welcome to VTStack, ${name}!`,
    html,
    text: `Hi ${name},\n\nWelcome to VTStack!\n\nWe're excited to have you on board. VTStack is designed to help you build, manage, and scale your digital infrastructure with ease.\n\nYour account has been created successfully, and you're ready to get started.\n\nWhat's next?\n- Explore your VTStack dashboard.\n- Configure your account settings.\n- Discover the tools and services available to you.\n\nGet Started: ${loginUrl}\n\nIf you need assistance, our support team is here to help.\n\nThank you for choosing VTStack!\n\nBest regards,\nThe VTStack Team\n${supportEmail}\n${websiteUrl}`,
  });
}

export async function sendAccountApprovedEmail(email: string, recipientName?: string) {
  const name = recipientName || 'Valued Partner';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vtstack.ng';
  const loginUrl = `${appUrl}/login`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">VTStack</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Next-Generation Virtual Accounts & Payments</p>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: #22c55e; border-radius: 50%; margin-bottom: 12px; color: #ffffff; font-size: 22px; font-weight: bold;">
          ✓
        </div>
        <h2 style="font-size: 20px; color: #15803d; margin: 0 0 8px 0; font-weight: 700;">Account Approved & Activated!</h2>
        <p style="color: #166534; font-size: 14px; margin: 0; line-height: 1.5;">
          Hello <strong>${name}</strong>, your VTStack merchant account has been reviewed and approved by our administration team.
        </p>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <h3 style="font-size: 15px; color: #1e293b; margin: 0 0 12px 0; font-weight: 600;">What you can do now:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
          <li>Generate dynamic and dedicated <strong>Virtual Accounts</strong></li>
          <li>Accept real-time bank transfer payments seamlessly</li>
          <li>Access live & test <strong>API Keys</strong> for integration</li>
          <li>Configure Webhooks to automate your financial operations</li>
          <li>Monitor your wallet, balances, and payouts in real-time</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${loginUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
          Access Your Dashboard
        </a>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0; text-align: center;">
        Direct link: <a href="${loginUrl}" style="color: #4f46e5; word-break: break-all;">${loginUrl}</a>
      </p>

      <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
        <p style="margin: 0 0 4px 0;">Need assistance? Reply to this email or contact <a href="mailto:support@vtstack.ng" style="color: #64748b;">support@vtstack.ng</a>.</p>
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} VTStack Systems. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Your VTStack Account Has Been Approved!`,
    html,
    text: `Hello ${name},\n\nYour VTStack merchant account has been approved and activated by the administrator!\n\nYou can now log in at ${loginUrl} to access virtual accounts, generate API keys, and manage payments.\n\nBest regards,\nVTStack Team`,
  });
}

export async function sendKycApprovedEmail(email: string, recipientName?: string, tier?: number | string) {
  const name = recipientName || 'Valued Partner';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vtstack.ng';
  const tierDisplay = tier ? `Tier ${tier}` : 'Full Verification';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800;">VTStack</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">KYC Verification Update</p>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: #22c55e; border-radius: 50%; margin-bottom: 12px; color: #ffffff; font-size: 22px; font-weight: bold;">
          ✓
        </div>
        <h2 style="font-size: 20px; color: #15803d; margin: 0 0 8px 0; font-weight: 700;">KYC Verified Successfully</h2>
        <p style="color: #166534; font-size: 14px; margin: 0; line-height: 1.5;">
          Hello <strong>${name}</strong>, your identity verification (${tierDisplay}) has been approved by our compliance department.
        </p>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0;">
          Your higher transaction and withdrawal limits are now unlocked and active across your VTStack account. You can verify your updated limits in your dashboard settings.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}/app" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px;">
          Open User Dashboard
        </a>
      </div>

      <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
        &copy; ${new Date().getFullYear()} VTStack Systems. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Your VTStack KYC Verification Has Been Approved (${tierDisplay})`,
    html,
    text: `Hello ${name},\n\nYour KYC verification (${tierDisplay}) has been approved by VTStack compliance. Higher limits are now active on your account.\n\nAccess your dashboard: ${appUrl}/app`,
  });
}

export async function sendKycRejectedEmail(email: string, recipientName?: string, reason?: string) {
  const name = recipientName || 'Valued Partner';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vtstack.ng';
  const defaultReason = reason || 'Document image was unreadable or details did not match.';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800;">VTStack</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">KYC Verification Notice</p>
      </div>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <h2 style="font-size: 18px; color: #991b1b; margin: 0 0 8px 0; font-weight: 700;">KYC Documents Require Attention</h2>
        <p style="color: #7f1d1d; font-size: 14px; margin: 0; line-height: 1.5;">
          Hello <strong>${name}</strong>, our compliance team was unable to verify your submitted KYC documents.
        </p>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <p style="font-size: 13px; color: #64748b; margin: 0 0 6px 0; font-weight: 600; text-transform: uppercase;">Reason:</p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0;">
          ${defaultReason}
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}/app/verification" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px;">
          Resubmit Verification
        </a>
      </div>

      <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
        &copy; ${new Date().getFullYear()} VTStack Systems. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `VTStack KYC Verification Update - Action Needed`,
    html,
    text: `Hello ${name},\n\nOur compliance team was unable to verify your KYC documents: ${defaultReason}\n\nPlease visit ${appUrl}/app/verification to resubmit.`,
  });
}

export async function sendPayoutApprovedEmail(email: string, recipientName?: string) {
  const name = recipientName || 'Valued Partner';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vtstack.ng';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 26px; font-weight: 800;">VTStack</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Payout API Access</p>
      </div>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: #22c55e; border-radius: 50%; margin-bottom: 12px; color: #ffffff; font-size: 22px; font-weight: bold;">
          ✓
        </div>
        <h2 style="font-size: 20px; color: #15803d; margin: 0 0 8px 0; font-weight: 700;">Payout API Access Approved</h2>
        <p style="color: #166534; font-size: 14px; margin: 0; line-height: 1.5;">
          Hello <strong>${name}</strong>, your request for automated programmatic Payouts has been approved by administration.
        </p>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0;">
          You can now initiate bulk payouts and single transfers directly through our Payout APIs using your live API key.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}/app/payout" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px;">
          Manage Payouts
        </a>
      </div>

      <div style="text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
        &copy; ${new Date().getFullYear()} VTStack Systems. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Your VTStack Payout API Access Has Been Approved!`,
    html,
    text: `Hello ${name},\n\nYour request for automated programmatic Payouts has been approved! You can now initiate transfers via the API or dashboard at ${appUrl}/app/payout.`,
  });
}
