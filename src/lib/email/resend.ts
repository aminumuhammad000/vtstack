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
