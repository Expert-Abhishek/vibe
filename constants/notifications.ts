import { Alert, Platform } from 'react-native';

// Safe dynamic helper to get expo-notifications module without crashing on unsupported environments
function getNotificationsModule() {
  try {
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
}

// Safely configure notification behavior if module exists
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
  // Ignored on environments without native push support
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
    console.warn('Failed to request notification permission:', e);
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

export async function sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
  try {
    // Show visual Banner Alert fallback for instant UI response
    Alert.alert(`🔔 ${title}`, body);

    if (Platform.OS !== 'web') {
      const Notifications = getNotificationsModule();
      if (Notifications && typeof Notifications.scheduleNotificationAsync === 'function') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 ${title}`,
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
