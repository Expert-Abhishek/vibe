const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { getIO } = require('../config/socket');

const router = express.Router();

// Configuration from Environment Variables
const WHATSAPP_BUSINESS_PHONE = process.env.WHATSAPP_BUSINESS_PHONE || '918088626099';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'vibe_whatsapp_verify_token_2026';
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

// Clean Business Phone Number (digits only, e.g., 918088626099)
function getCleanBusinessNumber() {
  let num = String(WHATSAPP_BUSINESS_PHONE || '').replace(/\D/g, '');
  if (num.length === 10) {
    num = `91${num}`;
  }
  return num || '918088626099';
}

// Ensure Database Table Exists
db.query(`
  CREATE TABLE IF NOT EXISTS whatsapp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    verification_code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'auth',
    status VARCHAR(20) DEFAULT 'PENDING',
    sender_whatsapp_id VARCHAR(50),
    attempts INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_wa_verif_code_status ON whatsapp_verifications(verification_code, status);
  CREATE INDEX IF NOT EXISTS idx_wa_verif_session ON whatsapp_verifications(session_id);
  CREATE INDEX IF NOT EXISTS idx_wa_verif_phone ON whatsapp_verifications(phone_number);
`).catch((err) => console.warn('[WhatsApp Auth] Table init warning:', err.message));

// Rate Limiting (In-Memory Sliding Window: Max 5 requests per 10 minutes per phone/IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 6;

function checkRateLimit(key) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(key, entry);
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const remainingSecs = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds: remainingSecs };
  }

  entry.count += 1;
  rateLimitMap.set(key, entry);
  return { allowed: true };
}

// Cleanup rateLimitMap every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.resetAt) rateLimitMap.delete(k);
  }
}, 30 * 60 * 1000);

/**
 * 1. POST /api/auth/whatsapp/initiate
 * Generate cryptographically secure 6-digit code & WhatsApp deep link
 */
router.post(['/initiate', '/send-otp'], async (req, res) => {
  try {
    const { phone, phoneNumber, purpose = 'auth', metadata = {} } = req.body;
    const rawPhone = (phone || phoneNumber || '').trim();

    if (!rawPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required.',
      });
    }

    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);

    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number.',
      });
    }

    // Rate Limiting check
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'client';
    const rateCheck = checkRateLimit(`${cleanPhone}_${clientIp}`);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many verification requests. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        retryAfter: rateCheck.retryAfterSeconds,
      });
    }

    // Generate Cryptographically Secure 6-Digit Code
    const verificationCode = crypto.randomInt(100000, 1000000).toString();
    const sessionId = `wa_${crypto.randomBytes(16).toString('hex')}`;
    const expiresInSeconds = 300; // 5 minutes TTL
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // Invalidate existing pending verifications for this phone number
    await db.query(
      `UPDATE whatsapp_verifications 
       SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP 
       WHERE phone_number = $1 AND status = 'PENDING'`,
      [cleanPhone]
    );

    // Save to Database
    await db.query(
      `INSERT INTO whatsapp_verifications (
         session_id, phone_number, verification_code, purpose, status, expires_at, metadata
       ) VALUES ($1, $2, $3, $4, 'PENDING', $5, $6)`,
      [sessionId, cleanPhone, verificationCode, purpose, expiresAt, JSON.stringify(metadata)]
    );

    const businessPhone = getCleanBusinessNumber();
    const prefillText = `VERIFY ${verificationCode}`;
    const deepLink = `https://wa.me/${businessPhone}?text=${encodeURIComponent(prefillText)}`;

    console.log(`[WhatsApp Reverse OTP] 🚀 Session initiated for +91 ${cleanPhone} | Code: ${verificationCode} | Session: ${sessionId}`);

    return res.status(200).json({
      success: true,
      message: 'WhatsApp verification session initiated successfully.',
      sessionId,
      verificationCode,
      deepLink,
      businessPhone,
      phone: cleanPhone,
      expiresInSeconds,
      expiresAt: expiresAt.toISOString(),
      instructions: `Send "VERIFY ${verificationCode}" to +${businessPhone} via WhatsApp.`,
    });
  } catch (error) {
    console.error('[WhatsApp Auth] Error in initiate:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate WhatsApp verification session.',
      error: error.message,
    });
  }
});

/**
 * 2. GET /api/auth/whatsapp/status/:sessionId
 * Polling endpoint for frontend verification status listener
 */
router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const result = await db.query(
      `SELECT session_id, phone_number, purpose, status, expires_at, verified_at, sender_whatsapp_id, created_at
       FROM whatsapp_verifications
       WHERE session_id = $1
       LIMIT 1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Verification session not found or invalid.',
        status: 'NOT_FOUND',
        verified: false,
      });
    }

    const record = result.rows[0];
    const now = new Date();

    // Check if expired while in PENDING state
    if (record.status === 'PENDING' && now > new Date(record.expires_at)) {
      await db.query(
        `UPDATE whatsapp_verifications SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE session_id = $1`,
        [sessionId]
      );
      record.status = 'EXPIRED';
    }

    const isVerified = record.status === 'VERIFIED';

    return res.json({
      success: true,
      sessionId: record.session_id,
      phone: record.phone_number,
      purpose: record.purpose,
      status: record.status,
      verified: isVerified,
      verifiedAt: record.verified_at,
      expiresAt: record.expires_at,
    });
  } catch (error) {
    console.error('[WhatsApp Auth] Error checking status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check verification status.',
      error: error.message,
    });
  }
});

/**
 * Helper: Verify Meta X-Hub-Signature-256
 */
function verifyMetaSignature(req) {
  if (!WHATSAPP_APP_SECRET) {
    // If secret is not configured in env, allow for local testing
    return true;
  }

  const signatureHeader = req.headers['x-hub-signature-256'];
  if (!signatureHeader) {
    console.warn('[WhatsApp Webhook] Missing X-Hub-Signature-256 header.');
    return false;
  }

  const parts = signatureHeader.split('sha256=');
  const signature = parts[1] || '';

  const rawBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  const expectedSignature = crypto
    .createHmac('sha256', WHATSAPP_APP_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch (e) {
    return false;
  }
}

/**
 * 3. GET /webhook & /api/auth/whatsapp/webhook
 * Handles Meta Cloud API Webhook Subscription Challenge
 */
router.get(['/', '/webhook'], (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[WhatsApp Webhook] Verification request received:', { mode, token, challengePresent: !!challenge });

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ [WhatsApp Webhook] Subscription challenge verified successfully!');
      return res.status(200).send(challenge);
    }

    console.warn('❌ [WhatsApp Webhook] Subscription verification token mismatch.');
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Verify token does not match.',
    });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error in verification challenge:', error);
    return res.status(500).send('Internal Server Error');
  }
});

/**
 * 4. POST /webhook & /api/auth/whatsapp/webhook
 * Meta Cloud API Inbound Message Webhook Handler
 */
router.post(['/', '/webhook'], async (req, res) => {
  // Always return 200 OK fast to acknowledge Meta Cloud API
  try {
    // Validate Signature if App Secret is set
    if (!verifyMetaSignature(req)) {
      console.warn('[WhatsApp Webhook] ⚠️ Invalid X-Hub-Signature-256 signature.');
      return res.status(403).json({ success: false, message: 'Invalid signature' });
    }

    const payload = req.body;
    console.log('[WhatsApp Webhook] 📩 Incoming Webhook Payload received:', JSON.stringify(payload, null, 2));

    // Fast check for Meta WhatsApp event structure
    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      // Status updates or non-message webhook events (e.g. delivered, read)
      return res.status(200).json({ status: 'EVENT_RECEIVED' });
    }

    for (const msg of messages) {
      const fromNumber = (msg.from || '').trim(); // e.g. "919876543210"
      const messageType = msg.type;
      let textBody = '';

      if (messageType === 'text') {
        textBody = (msg.text?.body || '').trim();
      } else if (messageType === 'button') {
        textBody = (msg.button?.text || msg.button?.payload || '').trim();
      } else if (messageType === 'interactive') {
        textBody = (
          msg.interactive?.button_reply?.title ||
          msg.interactive?.button_reply?.id ||
          msg.interactive?.list_reply?.title ||
          ''
        ).trim();
      }

      console.log(`[WhatsApp Webhook] 💬 Message from +${fromNumber}: "${textBody}"`);

      // Extract 6-digit Code using Regex
      const codeMatch = textBody.match(/(?:VERIFY|CODE|OTP|VIBE)?\s*([0-9]{6})/i) || textBody.match(/\b([0-9]{6})\b/);

      if (!codeMatch) {
        console.log(`[WhatsApp Webhook] No 6-digit verification code found in message: "${textBody}"`);
        continue;
      }

      const extractedCode = codeMatch[1];
      const cleanFromPhone = fromNumber.replace(/\D/g, '').slice(-10);

      console.log(`[WhatsApp Webhook] 🔍 Extracted Code: ${extractedCode} | Clean Sender Phone: ${cleanFromPhone}`);

      // Match with active PENDING verification in database
      const verifResult = await db.query(
        `SELECT id, session_id, phone_number, verification_code, purpose, status, expires_at
         FROM whatsapp_verifications
         WHERE verification_code = $1
           AND status = 'PENDING'
           AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC
         LIMIT 1`,
        [extractedCode]
      );

      if (verifResult.rows.length === 0) {
        console.warn(`[WhatsApp Webhook] ⚠️ No active pending verification found for code: ${extractedCode}`);
        continue;
      }

      const verifRecord = verifResult.rows[0];

      // Mark record as VERIFIED
      const updateRes = await db.query(
        `UPDATE whatsapp_verifications
         SET status = 'VERIFIED',
             sender_whatsapp_id = $1,
             verified_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING session_id, phone_number, purpose, status, verified_at`,
        [fromNumber, verifRecord.id]
      );

      const verifiedRecord = updateRes.rows[0];
      console.log(`✅ [WhatsApp Webhook] Session ${verifiedRecord.session_id} successfully marked VERIFIED for phone +91 ${verifiedRecord.phone_number}!`);

      // Real-Time Notification via Socket.IO
      try {
        const io = getIO();
        if (io) {
          const socketPayload = {
            sessionId: verifiedRecord.session_id,
            phone: verifiedRecord.phone_number,
            purpose: verifiedRecord.purpose,
            verified: true,
            status: 'VERIFIED',
            verifiedAt: verifiedRecord.verified_at,
          };

          // Emit to session room, user room, and global event listener
          io.to(`session:${verifiedRecord.session_id}`).emit('whatsapp:verified', socketPayload);
          io.to(`user:${verifiedRecord.phone_number}`).emit('whatsapp:verified', socketPayload);
          io.emit(`whatsapp:verified:${verifiedRecord.session_id}`, socketPayload);
          io.emit('whatsapp:verification_success', socketPayload);

          console.log(`[WhatsApp Webhook] 📡 Real-time Socket event emitted for session ${verifiedRecord.session_id}`);
        }
      } catch (socketErr) {
        console.warn('[WhatsApp Webhook] Socket broadcast warning:', socketErr.message);
      }
    }

    return res.status(200).json({ status: 'EVENT_RECEIVED' });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing webhook event:', error);
    return res.status(200).json({ status: 'ERROR_RECORDED', error: error.message });
  }
});

/**
 * 5. POST /api/auth/whatsapp/verify-code (Manual Fallback Verification)
 * Allows user to manually type the 6-digit code if deep link didn't open
 */
router.post('/verify-code', async (req, res) => {
  try {
    const { sessionId, code, otp } = req.body;
    const cleanCode = String(code || otp || '').trim();

    if (!sessionId || !cleanCode) {
      return res.status(400).json({
        success: false,
        message: 'sessionId and 6-digit verification code are required.',
      });
    }

    const query = `
      SELECT id, session_id, phone_number, verification_code, status, expires_at
      FROM whatsapp_verifications
      WHERE session_id = $1
      LIMIT 1
    `;
    const result = await db.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Verification session not found.' });
    }

    const record = result.rows[0];

    if (new Date() > new Date(record.expires_at)) {
      await db.query(`UPDATE whatsapp_verifications SET status = 'EXPIRED' WHERE id = $1`, [record.id]);
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new link.' });
    }

    if (record.status === 'VERIFIED') {
      return res.json({ success: true, message: 'Already verified!', phone: record.phone_number });
    }

    if (record.verification_code !== cleanCode) {
      return res.status(400).json({ success: false, message: 'Invalid 6-digit verification code.' });
    }

    await db.query(
      `UPDATE whatsapp_verifications 
       SET status = 'VERIFIED', verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [record.id]
    );

    return res.json({
      success: true,
      message: 'Phone number verified successfully via code!',
      phone: record.phone_number,
      sessionId: record.session_id,
    });
  } catch (error) {
    console.error('[WhatsApp Auth] Error in verify-code:', error);
    return res.status(500).json({ success: false, message: 'Verification failed.', error: error.message });
  }
});

module.exports = router;
