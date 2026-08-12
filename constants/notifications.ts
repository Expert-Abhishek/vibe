import { Platform } from 'react-native';

/**
 * Activity Notification item structure for in-app drawer & badge rendering
 */
export interface ActivityNotificationItem {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  tripId?: string;
  createdAt: number;
}

// In-memory reactive notification store
class NotificationStore {
  private notifications: ActivityNotificationItem[] = [];
  private listeners: Set<() => void> = new Set();

  getNotifications(): ActivityNotificationItem[] {
    return this.notifications;
  }

  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  addNotification(item: Omit<ActivityNotificationItem, 'id' | 'createdAt'>): void {
    const newItem: ActivityNotificationItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: Date.now(),
    };
    this.notifications = [newItem, ...this.notifications.slice(0, 49)];
    this.notify();
  }

  markAllAsRead(): void {
    this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
    this.notify();
  }

  clearAll(): void {
    this.notifications = [];
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        // ignore listener errors
      }
    });
  }
}

export const notificationStore = new NotificationStore();

/**
 * Safe helper to fetch expo-notifications module in standalone native builds.
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

// Safely configure notification behavior for foreground alerts & sound
try {
  const Notifications = getNotificationsModule();
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (e) {
  // Ignored in Expo Go & Web
}

/**
 * Request Notification Permissions & Register Android Notification Channels
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return true;
    const Notifications = getNotificationsModule();
    if (!Notifications) return false;

    // Set Android Notification Channels with high priority, lights & sound
    if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Vibzz General Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F5C518',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('trips', {
        name: 'Vibzz Trip & Ride Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#F5C518',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
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

/**
 * Get Expo Push Token for Backend registration (ExponentPushToken[...])
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const Notifications = getNotificationsModule();
    if (!Notifications) return null;

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('⚠️ Push notification permission not granted.');
      return null;
    }

    if (typeof Notifications.getExpoPushTokenAsync === 'function') {
      try {
        const Constants = require('expo-constants').default;
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ||
          Constants?.easConfig?.projectId ||
          '2a8823ee-df40-49f4-95b6-452edc6a3025';

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );

        if (tokenData?.data) {
          return String(tokenData.data);
        }
      } catch (err: any) {
        console.warn('getExpoPushTokenAsync with projectId error, trying default:', err?.message);
        try {
          const fallbackTokenData = await Notifications.getExpoPushTokenAsync();
          if (fallbackTokenData?.data) {
            return String(fallbackTokenData.data);
          }
        } catch (fallbackErr) {
          console.warn('Fallback push token fetch failed safely:', fallbackErr);
        }
      }
    }

    return null;
  } catch (e: any) {
    console.warn('Expo Push Token fetch warning:', e?.message || e);
    return null;
  }
}

const recentNotificationsCache = new Map<string, number>();

/**
 * Send local notification with anti-duplicate de-duplication cache
 */
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
      tripId: data?.tripId,
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
            channelId: data?.tripId ? 'trips' : 'default',
          },
          trigger: null,
        });
      }
    }
  } catch (e) {
    console.warn('sendLocalNotification error:', e);
  }
}
