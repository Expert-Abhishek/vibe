/**
 * Deprecated FCM Service Wrapper.
 * All push dispatches are now handled exclusively by Expo Push API (expoPushService.js).
 */
const expoPushService = require('./expoPushService');

module.exports = {
  sendPushNotification: expoPushService.sendPushNotification,
  sendPushToUser: expoPushService.sendPushToUser,
  sendPushToRole: expoPushService.sendPushToRole,
  sendExpoPushChunk: expoPushService.sendExpoPushChunk,
  checkPushReceipts: expoPushService.checkPushReceipts,
  removeInvalidToken: expoPushService.removeInvalidToken,
  isFirebaseInitialized: () => false,
  admin: null,
};
