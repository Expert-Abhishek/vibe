const db = require('../config/db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const MAX_BATCH_SIZE = 100; // Expo API limit is 100 messages per request

/**
 * Remove invalid / unregistered push token from PostgreSQL database
 */
async function removeInvalidToken(token) {
  if (!token) return;
  try {
    console.warn(`🧹 [Expo Push] Removing unregistered token from database: ${String(token).slice(0, 25)}...`);
    await db.query('UPDATE users SET push_token = NULL WHERE push_token = $1', [token]);
  } catch (err) {
    console.error('❌ Error clearing invalid push token:', err.message);
  }
}

/**
 * Format string payload properties to prevent JSON serialization issues
 */
function sanitizeDataPayload(data = {}) {
  const safeData = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) {
      safeData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
  }
  return safeData;
}

/**
 * Send a single or array of push messages via Expo Push API with automatic batching
 * @param {Array<Object>|Object} messages - Message object(s) containing token/to, title, body, data, collapseKey, channelId
 */
async function sendExpoPushChunk(messages) {
  const msgArray = Array.isArray(messages) ? messages : [messages];
  if (msgArray.length === 0) return { success: true, count: 0 };

  // Prepare standard Expo push payloads
  const formattedPayloads = msgArray.map((msg) => {
    const targetToken = (msg.to || msg.token || '').trim();
    return {
      to: targetToken,
      title: msg.title,
      body: msg.body,
      data: sanitizeDataPayload(msg.data || {}),
      sound: msg.sound || (msg.channelId === 'trips_v2' ? 'trip_alert.mp3' : 'default'),
      priority: msg.priority || 'high',
      channelId: msg.channelId || 'default',
      collapseId: msg.collapseId || msg.collapseKey || 'vibe_alert',
      _displayInForeground: true,
    };
  }).filter(p => p.to.startsWith('ExponentPushToken') || p.to.startsWith('ExpoPushToken'));

  if (formattedPayloads.length === 0) {
    return { success: false, message: 'No valid Expo Push Tokens provided' };
  }

  // Chunk messages into batches of max 100
  const chunks = [];
  for (let i = 0; i < formattedPayloads.length; i += MAX_BATCH_SIZE) {
    chunks.push(formattedPayloads.slice(i, i + MAX_BATCH_SIZE));
  }

  const results = [];

  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const resData = await response.json();
      const tickets = resData.data || [];

      // Check push tickets for errors or DeviceNotRegistered status
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const sentToken = chunk[i]?.to;

        if (ticket.status === 'error') {
          console.error(`❌ [Expo Push Ticket Error] Token: ${sentToken?.slice(0, 20)}... Message: ${ticket.message} (${ticket.details?.error})`);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            await removeInvalidToken(sentToken);
          }
        } else if (ticket.status === 'ok') {
          console.log(`📡 [Expo Push Delivered] Ticket ID: ${ticket.id} -> ${sentToken?.slice(0, 20)}...`);
        }
      }

      results.push({ success: true, count: chunk.length, tickets });
    } catch (chunkErr) {
      console.error('❌ [Expo Push API HTTP Error]:', chunkErr.message);
      results.push({ success: false, error: chunkErr.message });
    }
  }

  return { success: true, batches: results.length, total: formattedPayloads.length };
}

/**
 * Send Push Notification to a single token via Expo Push API
 */
async function sendPushNotification({
  token,
  title,
  body,
  data = {},
  collapseKey = 'vibe_alert',
  channelId = 'default',
}) {
  if (!token || typeof token !== 'string') {
    return { success: false, message: 'Invalid or missing push token' };
  }

  const cleanToken = token.trim();
  if (!cleanToken.startsWith('ExponentPushToken') && !cleanToken.startsWith('ExpoPushToken')) {
    console.warn(`⚠️ [Expo Push] Non-Expo token encountered (${cleanToken.slice(0, 16)}...). Cleaning...`);
    await removeInvalidToken(cleanToken);
    return { success: false, message: 'Token is not a valid ExponentPushToken' };
  }

  return await sendExpoPushChunk({
    to: cleanToken,
    title,
    body,
    data,
    collapseKey,
    channelId,
  });
}

/**
 * Send push notification to a specific user by userId
 */
async function sendPushToUser(userId, { title, body, data = {}, collapseKey = 'vibe_alert', channelId = 'default' }) {
  if (!userId) return;
  try {
    const userRes = await db.query(
      'SELECT push_token, role FROM users WHERE id::text = $1::text OR phone = $1::text',
      [String(userId)]
    );

    if (userRes.rows.length > 0 && userRes.rows[0].push_token) {
      const token = userRes.rows[0].push_token;
      return await sendPushNotification({
        token,
        title,
        body,
        data: { ...data, userId: String(userId), role: userRes.rows[0].role },
        collapseKey,
        channelId,
      });
    }
  } catch (err) {
    console.error('❌ Error sending push to user:', userId, err.message);
  }
}

/**
 * Send push notification to all users of a specific role (e.g. 'driver', 'guide', 'tourist', 'all')
 */
async function sendPushToRole(role, { title, body, data = {}, collapseKey = 'vibe_alert', channelId = 'default' }) {
  try {
    let query = `SELECT id, push_token FROM users WHERE push_token IS NOT NULL AND push_token != ''`;
    const params = [];

    if (role !== 'all') {
      if (role === 'driver') {
        query += ` AND (LOWER(role::text) = 'driver' OR LOWER(role::text) = 'captain')`;
      } else {
        query += ` AND LOWER(role::text) = LOWER($1)`;
        params.push(role);
      }
    }

    const res = await db.query(query, params);
    if (res.rows.length === 0) {
      console.log(`ℹ️ [Expo Push] No registered ${role} tokens found.`);
      return;
    }

    const messages = res.rows.map((row) => ({
      to: row.push_token,
      title,
      body,
      data: { ...data, targetRole: role, recipientId: row.id },
      collapseKey: `${collapseKey}_${row.id}`,
      channelId,
    }));

    console.log(`📡 [Expo Push] Dispatching batch push to ${messages.length} ${role} recipients...`);
    return await sendExpoPushChunk(messages);
  } catch (err) {
    console.error(`❌ Error sending push to role ${role}:`, err.message);
  }
}

/**
 * Verify delivery receipts for Expo Push tickets
 * @param {Array<string>} receiptIds - Array of Expo Push Ticket IDs
 */
async function checkPushReceipts(receiptIds) {
  if (!receiptIds || receiptIds.length === 0) return;

  try {
    const response = await fetch(EXPO_RECEIPTS_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: receiptIds }),
    });

    const receiptData = await response.json();
    const receipts = receiptData.data || {};

    for (const [receiptId, receipt] of Object.entries(receipts)) {
      if (receipt.status === 'error') {
        console.error(`❌ [Expo Receipt Error] ID: ${receiptId} Error: ${receipt.message} (${receipt.details?.error})`);
      }
    }
    return receipts;
  } catch (err) {
    console.error('❌ Error checking push receipts:', err.message);
  }
}

module.exports = {
  sendPushNotification,
  sendPushToUser,
  sendPushToRole,
  sendExpoPushChunk,
  checkPushReceipts,
  removeInvalidToken,
};
