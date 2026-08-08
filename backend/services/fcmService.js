const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

let isFirebaseInitialized = false;

// 1. Initialize Firebase Admin SDK
try {
  let serviceAccount = null;

  // Check if credentials are provided in env var (for cloud Render/Heroku)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.warn('⚠️ Could not parse FIREBASE_SERVICE_ACCOUNT env var JSON:', e.message);
    }
  }

  // Check local file paths
  if (!serviceAccount) {
    const keyPaths = [
      path.join(__dirname, '../firebase-admin-sdk.json'),
      path.join(__dirname, '../../firebase-admin-sdk.json'),
      path.join(process.cwd(), 'firebase-admin-sdk.json'),
      path.join(process.cwd(), 'backend/firebase-admin-sdk.json'),
    ];

    for (const keyPath of keyPaths) {
      if (fs.existsSync(keyPath)) {
        try {
          serviceAccount = require(keyPath);
          console.log(`🔥 Firebase Admin SDK loaded credentials from: ${keyPath}`);
          break;
        } catch (err) {
          console.warn(`⚠️ Error reading ${keyPath}:`, err.message);
        }
      }
    }
  }

  if (serviceAccount && serviceAccount.project_id && serviceAccount.private_key) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    isFirebaseInitialized = true;
    console.log(`✅ [FCM] Firebase Admin SDK successfully initialized for project: ${serviceAccount.project_id}`);
  } else {
    console.warn('⚠️ [FCM] Firebase service account credentials not found. Push notifications will use fallback dispatchers.');
  }
} catch (initErr) {
  console.error('❌ [FCM] Error initializing Firebase Admin SDK:', initErr);
}

/**
 * Send Push Notification via Firebase Cloud Messaging (FCM) & Expo Push Fallback
 * @param {Object} options
 * @param {string} options.token - FCM Token, APNs Token, or Expo Push Token
 * @param {string} options.title - Notification Title
 * @param {string} options.body - Notification Body
 * @param {Object} options.data - Additional metadata
 * @param {string} [options.collapseKey] - De-duplication key to collapse multiple notifications
 * @param {string} [options.channelId] - Android Notification Channel ('default', 'trips', 'payments')
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
  const safeData = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) {
      safeData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
  }

  // 1. If it is an Expo Push Token ('ExponentPushToken[...]'), send via Expo Push API
  if (cleanToken.startsWith('ExponentPushToken') || cleanToken.startsWith('ExpoPushToken')) {
    try {
      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: cleanToken,
          title: title,
          body: body,
          data: safeData,
          sound: 'default',
          priority: 'high',
          channelId: channelId || 'default',
          _displayInForeground: true,
        }),
      });
      const expoData = await expoRes.json();
      console.log('📡 [Expo Push] Sent notification:', title, '->', cleanToken.slice(0, 20) + '...', expoData);
      return { success: true, provider: 'expo', data: expoData };
    } catch (expoErr) {
      console.error('❌ [Expo Push] Failed to send via Expo:', expoErr.message);
    }
  }

  // 2. Send via Firebase Cloud Messaging (FCM v1 API) for standalone Native Android & iOS builds
  if (isFirebaseInitialized) {
    try {
      const message = {
        token: cleanToken,
        notification: {
          title: title,
          body: body,
        },
        data: safeData,
        android: {
          priority: 'high',
          collapseKey: collapseKey || 'vibe_alert',
          notification: {
            title: title,
            body: body,
            sound: 'default',
            channelId: channelId || 'default',
            tag: collapseKey || 'vibe_alert', // Overwrites/updates previous notification of same type
            clickAction: 'OPEN_APP',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-collapse-id': collapseKey || 'vibe_alert', // iOS notification collapse/replace
          },
          payload: {
            aps: {
              alert: {
                title: title,
                body: body,
              },
              sound: 'default',
              badge: 1,
              contentAvailable: true,
              category: 'TRIP_ALERT',
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('🔥 [FCM] Message sent successfully:', response, 'to token:', cleanToken.slice(0, 16) + '...');
      return { success: true, provider: 'fcm', messageId: response };
    } catch (fcmErr) {
      console.error('❌ [FCM] Send error:', fcmErr.code, fcmErr.message);
      // If token is unregistered / expired, remove from database
      if (
        fcmErr.code === 'messaging/registration-token-not-registered' ||
        fcmErr.code === 'messaging/invalid-registration-token'
      ) {
        console.warn(`🧹 [FCM] Cleaning invalid token: ${cleanToken.slice(0, 16)}...`);
        try {
          await db.query('UPDATE users SET push_token = NULL WHERE push_token = $1', [cleanToken]);
        } catch (dbErr) {
          // ignore
        }
      }
      return { success: false, error: fcmErr.message };
    }
  }

  return { success: false, message: 'Firebase not initialized and token is not Expo' };
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
 * Send push notification to all users of a specific role (e.g. 'driver', 'guide', 'tourist')
 */
async function sendPushToRole(role, { title, body, data = {}, collapseKey = 'vibe_alert', channelId = 'default' }) {
  try {
    const query = role === 'all'
      ? `SELECT id, push_token FROM users WHERE push_token IS NOT NULL AND push_token != ''`
      : `SELECT id, push_token FROM users WHERE role = $1 AND push_token IS NOT NULL AND push_token != ''`;
    const params = role === 'all' ? [] : [role];

    const res = await db.query(query, params);
    const promises = res.rows.map((row) =>
      sendPushNotification({
        token: row.push_token,
        title,
        body,
        data: { ...data, targetRole: role, recipientId: row.id },
        collapseKey: `${collapseKey}_${row.id}`,
        channelId,
      })
    );

    await Promise.allSettled(promises);
  } catch (err) {
    console.error(`❌ Error sending push to role ${role}:`, err.message);
  }
}

module.exports = {
  admin,
  isFirebaseInitialized: () => isFirebaseInitialized,
  sendPushNotification,
  sendPushToUser,
  sendPushToRole,
};
