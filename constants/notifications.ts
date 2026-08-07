import { Alert, Platform } from 'react-native';

/**
 * Safe helper to fetch expo-notifications module ONLY in standalone native builds.
 * Bypasses in Expo Go & Web to prevent 'Cannot find native module ExpoPushTokenManager'.
 */
function getNotificationsModule(): any {
  if (Platform.OS === 'web') return null;
  try {
    const Constants = require('expo-constants').default;
    // Expo Go app environment check
    if (Constants?.appOwnership === 'expo' || Constants?.executionEnvironment === 'storeClient') {
      return null;
    }

    // Verify native ExpoPushTokenManager module exists before requiring expo-notifications
    const { NativeModulesProxy, requireNativeModule } = require('expo-modules-core');
    let hasNativeModule = !!NativeModulesProxy?.ExpoPushTokenManager;
    if (!hasNativeModule && typeof requireNativeModule === 'function') {
      try {
        hasNativeModule = !!requireNativeModule('ExpoPushTokenManager');
      } catch (err) {
        hasNativeModule = false;
      }
    }

    if (!hasNativeModule) {
      return null;
    }
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
}

// Safely configure notification behavior if standalone native module exists
try {
  const Notifications = getNotificationsModule();
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      } as any),
    });
  }
} catch (e) {
  // Ignored in Expo Go & Web
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return true;
    const Notifications = getNotificationsModule();
    if (!Notifications) return false;

    // Set Android Notification Channel for push alerts & sound
    if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Vibe App Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F5C518',
        sound: 'default',
      });
    }

    if (typeof Notifications.getPermissionsAsync === 'function') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted' && typeof Notifications.requestPermissionsAsync === 'function') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    }
    return false;
  } catch (e) {
    console.warn('Notification permission check bypassed safely:', e);
    return false;
  }
}

export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications || typeof Notifications.getExpoPushTokenAsync !== 'function') return null;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const projectId = '2a8823ee-df40-49f4-95b6-452edc6a3025';

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData?.data || null;
  } catch (e: any) {
    console.warn('getExpoPushToken suppressed error:', e?.message || e);
    return null;
  }
}

const recentNotificationsCache = new Map<string, number>();

export async function sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
  const cleanTitle = title.replace(/^🔔\s*/, '').trim();
  const dedupKey = `${cleanTitle}:${body.trim()}`;
  const now = Date.now();
  const lastTime = recentNotificationsCache.get(dedupKey) || 0;

  // Filter out duplicate notifications arriving within 3.5 seconds
  if (now - lastTime < 3500) {
    return;
  }
  recentNotificationsCache.set(dedupKey, now);

  if (recentNotificationsCache.size > 50) {
    for (const [key, time] of recentNotificationsCache.entries()) {
      if (now - time > 10000) recentNotificationsCache.delete(key);
    }
  }

  try {
    // Add to notificationStore for clean UI badge rendering & drawer storage
    notificationStore.addNotification({
      title: `🔔 ${cleanTitle}`,
      body,
      isRead: false,
    });

    if (Platform.OS !== 'web') {
      const Notifications = getNotificationsModule();
      if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 ${cleanTitle}`,
            body,
            data: data || {},
            sound: 'default',
          },
          trigger: null,
        });
      }
    }
  } catch (e) {
    console.warn('sendLocalNotification error:', e);
  }
}
