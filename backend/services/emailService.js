const nodemailer = require('nodemailer');

// Load environment configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = (process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER || '').trim();
const SMTP_PASS = (process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').trim();

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
    const isGmail = (SMTP_HOST && SMTP_HOST.includes('gmail.com')) || (SMTP_USER && SMTP_USER.includes('@gmail.com'));

    if (isGmail) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        family: 4, // CRITICAL: Force IPv4 DNS lookup to prevent ENETUNREACH and timeout on Render cloud containers
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      console.log(`📧 Email Service: Configured Gmail SMTP transport with IPv4 (user: ${SMTP_USER})`);
    } else {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        family: 4, // Force IPv4
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
          rejectUnauthorized: false,
        },
      });
      console.log(`📧 Email Service: Configured SMTP transport (${SMTP_HOST}:${SMTP_PORT}, user: ${SMTP_USER}) with IPv4`);
    }
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
 * Send an OTP Email
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.otp - 6-digit OTP code
 * @param {string} params.purpose - 'registration' | 'password_reset' | 'login'
 * @param {string} [params.name] - User full name
 * @returns {Promise<{ success: boolean, message: string, messageId?: string, mock?: boolean }>}
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

  const transport = getTransporter();

  if (transport) {
    try {
      const info = await transport.sendMail({
        from: SMTP_FROM,
        to: cleanEmail,
        subject: subject,
        text: text,
        html: html,
      });

      console.log(`✉️ Email Sent Successfully to ${cleanEmail} (MessageId: ${info.messageId}) | OTP: ${otp}`);
      return {
        success: true,
        message: 'Verification code sent to your email.',
        messageId: info.messageId,
      };
    } catch (err) {
      console.error(`❌ Failed to send email via SMTP to ${cleanEmail}:`, err.message);
      // Fallback log so developer/user is not blocked
      console.log(`\n==================================================`);
      console.log(`📧 [FALLBACK EMAIL OTP]`);
      console.log(`To: ${cleanEmail}`);
      console.log(`Purpose: ${purpose}`);
      console.log(`🔑 OTP Code: ${otp}`);
      console.log(`==================================================\n`);

      return {
        success: true,
        message: 'Verification code generated (SMTP error logged to console).',
        error: err.message,
        mock: true,
      };
    }
  } else {
    // Console fallback logger when SMTP is not configured
    console.log(`\n==================================================`);
    console.log(`📧 [DEV EMAIL OTP DISPATCH]`);
    console.log(`To: ${cleanEmail}`);
    console.log(`Purpose: ${purpose}`);
    console.log(`🔑 OTP Code: ${otp}`);
    console.log(`⏱️ Expiry: 5 Minutes`);
    console.log(`==================================================\n`);

    return {
      success: true,
      message: `Verification code sent to ${cleanEmail} (logged to console for dev).`,
      mock: true,
    };
  }
}

module.exports = {
  sendOtpEmail,
  generateOtpEmailHtml,
};
