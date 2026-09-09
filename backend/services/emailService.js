const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const nodemailer = require('nodemailer');

// Load environment configuration with direct fallbacks
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = (process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER || 'vibzzpvtltd@gmail.com').trim();
const SMTP_PASS = (process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || 'avhe yuxd lowr zhbw').replace(/\s+/g, '').trim();

// Format FROM header: "Display Name <email@gmail.com>"
let SMTP_FROM = process.env.SMTP_FROM || process.env.EMAIL_FROM;
if (!SMTP_FROM) {
  SMTP_FROM = `"Vibzz Platform" <${SMTP_USER || 'no-reply@vibe.com'}>`;
} else if (SMTP_FROM.includes('<') && SMTP_USER && SMTP_HOST.includes('gmail.com')) {
  // Extract display name if custom domain is in FROM but using Gmail SMTP to avoid SPF/DMARC bounce
  const match = SMTP_FROM.match(/^"?([^"<]+)"?\s*<([^>]+)>/);
  if (match) {
    const displayName = match[1].trim();
    SMTP_FROM = `"${displayName}" <${SMTP_USER}>`;
  }
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (SMTP_USER && SMTP_PASS) {
    const isSecure = SMTP_PORT === 465 || process.env.SMTP_SECURE === 'true';
    transporter = nodemailer.createTransport({
      host: SMTP_HOST || 'smtp.gmail.com',
      port: SMTP_PORT || (isSecure ? 465 : 587),
      secure: isSecure, // true for 465, false for 587 (STARTTLS)
      requireTLS: !isSecure,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      family: 4, // Force IPv4 DNS lookup to prevent ENETUNREACH on cloud/Docker
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
      },
    });
    console.log(`📧 Email Service: Configured SMTP transport on ${SMTP_HOST}:${SMTP_PORT || (isSecure ? 465 : 587)} (secure: ${isSecure}, user: ${SMTP_USER})`);
  } else {
    console.log('⚠️ Email Service: SMTP credentials not provided in .env. Falling back to Console Logger.');
  }

  return transporter;
}

/**
 * Generate branded HTML Email Template for OTP
 */
function generateOtpEmailHtml({ otp, purpose = 'registration', name = '' }) {
  let title = 'Verify Your Email Address';
  let subtitle = 'Thank you for joining Vibe. Use the 6-digit verification code below to complete your registration.';
  let icon = '🔐';

  if (purpose === 'password_reset') {
    title = 'Password Reset Request';
    subtitle = 'We received a request to reset your Vibe account password. Use the verification code below to continue.';
    icon = '🔑';
  } else if (purpose === 'login') {
    title = 'Login Verification Code';
    subtitle = 'Use this code to securely sign in to your Vibe account.';
    icon = '🛡️';
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f0f0f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0c0d12; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" max-width="520" style="max-width: 520px; background-color: #161822; border-radius: 18px; border: 1px solid #282b3a; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.6);">
          
          <!-- Header Bar -->
          <tr>
            <td style="background: linear-gradient(135deg, #1A1A24 0%, #101015 100%); padding: 32px 30px 24px 30px; text-align: center; border-bottom: 1px solid #232533;">
              <div style="font-size: 32px; margin-bottom: 8px;">${icon}</div>
              <div style="display: inline-block; background-color: rgba(245, 197, 24, 0.12); color: #F5C518; font-weight: 800; font-size: 11px; letter-spacing: 1.5px; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; border: 1px solid rgba(245, 197, 24, 0.3); margin-bottom: 12px;">
                VIBZZ SECURE VERIFICATION
              </div>
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.3px;">
                ${title}
              </h1>
              ${name ? `<p style="color: #F5C518; font-size: 14px; margin: 0; font-weight: 600;">Hello, ${name}</p>` : ''}
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 30px 32px; text-align: center;">
              <p style="color: #9d9fad; font-size: 14px; line-height: 22px; margin: 0 0 28px 0;">
                ${subtitle}
              </p>

              <!-- OTP Display Box -->
              <div style="background: linear-gradient(180deg, #1F2230 0%, #171924 100%); border: 1.5px dashed #F5C518; border-radius: 14px; padding: 22px 16px; margin: 0 auto 28px auto; text-align: center;">
                <div style="font-size: 11px; color: #8a8d9f; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 8px;">
                  Your 6-Digit Verification Code
                </div>
                <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #F5C518; font-family: 'Courier New', Courier, monospace; text-shadow: 0 2px 10px rgba(245,197,24,0.3);">
                  ${otp}
                </div>
                <div style="font-size: 12px; color: #33C481; font-weight: 600; margin-top: 10px;">
                  ⏱️ Valid for 5 minutes only
                </div>
              </div>

              <!-- Security Notice -->
              <div style="background-color: rgba(240, 85, 95, 0.08); border-left: 3px solid #F0555F; border-radius: 6px; padding: 12px 16px; text-align: left; margin-bottom: 20px;">
                <p style="color: #ff9b9b; font-size: 12px; line-height: 18px; margin: 0;">
                  <strong>Security Reminder:</strong> Never share this OTP with anyone. Vibe representatives will never ask for your verification code or password.
                </p>
              </div>

              <p style="color: #6c6e7e; font-size: 12px; line-height: 18px; margin: 0;">
                If you did not request this verification code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #101118; padding: 20px 30px; text-align: center; border-top: 1px solid #1e212c;">
              <p style="color: #555768; font-size: 11px; margin: 0 0 6px 0;">
                © ${new Date().getFullYear()} Vibe Mobility Platform. All rights reserved.
              </p>
              <p style="color: #444654; font-size: 10px; margin: 0;">
                Automated security notification · Please do not reply directly to this email
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send an OTP Email (Supports Resend REST API, Brevo REST API, or SMTP)
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.otp - 6-digit OTP code
 * @param {string} params.purpose - 'registration' | 'password_reset' | 'login'
 * @param {string} [params.name] - User full name
 * @returns {Promise<{ success: boolean, message: string, messageId?: string, error?: string }>}
 */
async function sendOtpEmail({ to, otp, purpose = 'registration', name = '' }) {
  if (!to || !to.includes('@')) {
    return { success: false, message: 'Invalid recipient email address.' };
  }

  const cleanEmail = to.trim().toLowerCase();
  let subject = `[Vibzz] Your Verification Code: ${otp}`;
  if (purpose === 'password_reset') {
    subject = `[Vibzz] Password Reset Code: ${otp}`;
  }

  const html = generateOtpEmailHtml({ otp, purpose, name });
  const text = `Your Vibe verification code is: ${otp}. This code is valid for 5 minutes. Do not share this code with anyone.`;

  // 1. Primary Priority: Resend HTTP REST API (Port 443 - NEVER blocked on Render/AWS)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      console.log(`✉️ [Email Service] Sending email to ${cleanEmail} via Resend REST API...`);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Vibzz <onboarding@resend.dev>',
          to: [cleanEmail],
          subject: subject,
          html: html,
          text: text,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.id) {
        console.log(`✉️ [Resend API] Email Sent Successfully to ${cleanEmail} (ID: ${resData.id}) | OTP: ${otp}`);
        return {
          success: true,
          message: 'Verification code sent to your email.',
          messageId: resData.id,
        };
      }
      console.warn('⚠️ [Resend API] Error response:', resData);
    } catch (resendErr) {
      console.error('❌ [Resend API] Request failed:', resendErr.message);
    }
  }

  // 2. Secondary Priority: Brevo HTTP REST API (Port 443)
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      console.log(`✉️ [Email Service] Sending email to ${cleanEmail} via Brevo REST API...`);
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Vibzz Support', email: process.env.BREVO_SENDER || 'vibzzpvtltd@gmail.com' },
          to: [{ email: cleanEmail }],
          subject: subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      const resData = await res.json();
      if (res.ok && (resData.messageId || resData.id)) {
        console.log(`✉️ [Brevo API] Email Sent Successfully to ${cleanEmail} | OTP: ${otp}`);
        return {
          success: true,
          message: 'Verification code sent to your email.',
          messageId: resData.messageId || resData.id,
        };
      }
      console.warn('⚠️ [Brevo API] Error response:', resData);
    } catch (brevoErr) {
      console.error('❌ [Brevo API] Request failed:', brevoErr.message);
    }
  }

  // 3. Fallback: Direct SMTP Transport (with dual port 587/465 auto-fallback)
  if (SMTP_USER && SMTP_PASS) {
    const primaryPort = SMTP_PORT || 587;
    const primarySecure = primaryPort === 465 || process.env.SMTP_SECURE === 'true';

    try {
      const transport = nodemailer.createTransport({
        host: SMTP_HOST || 'smtp.gmail.com',
        port: primaryPort,
        secure: primarySecure,
        requireTLS: !primarySecure,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        family: 4,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
      });

      const info = await transport.sendMail({
        from: SMTP_FROM,
        to: cleanEmail,
        subject: subject,
        text: text,
        html: html,
      });

      console.log(`✉️ Email Sent Successfully via SMTP (${primaryPort}) to ${cleanEmail} (MessageId: ${info.messageId}) | OTP: ${otp}`);
      return {
        success: true,
        message: 'Verification code sent to your email.',
        messageId: info.messageId,
      };
    } catch (primaryErr) {
      console.warn(`⚠️ [SMTP] Port ${primaryPort} failed (${primaryErr.message}). Trying alternate SMTP port...`);

      try {
        const altPort = primaryPort === 465 ? 587 : 465;
        const altSecure = altPort === 465;

        const altTransport = nodemailer.createTransport({
          host: SMTP_HOST || 'smtp.gmail.com',
          port: altPort,
          secure: altSecure,
          requireTLS: !altSecure,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
          family: 4,
          connectionTimeout: 8000,
          greetingTimeout: 8000,
          socketTimeout: 10000,
          tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
          },
        });

        const altInfo = await altTransport.sendMail({
          from: SMTP_FROM,
          to: cleanEmail,
          subject: subject,
          text: text,
          html: html,
        });

        console.log(`✉️ Email Sent Successfully via Alternate SMTP port ${altPort} to ${cleanEmail} (MessageId: ${altInfo.messageId}) | OTP: ${otp}`);
        return {
          success: true,
          message: 'Verification code sent to your email.',
          messageId: altInfo.messageId,
        };
      } catch (err) {
        console.error(`❌ Failed to send email via SMTP (both ports) to ${cleanEmail}:`, err.message);
        return {
          success: false,
          message: `Failed to send verification email via SMTP: ${err.message}`,
          error: err.message,
        };
      }
    }
  } else {
    console.error('❌ Email Service: No email provider or SMTP credentials configured.');
    return {
      success: false,
      message: 'Email service is not configured on server.',
    };
  }
}

module.exports = {
  sendOtpEmail,
  generateOtpEmailHtml,
};
