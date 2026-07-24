import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return true;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('Failed to request notification permission:', e);
    return false;
  }
}

export async function sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
  try {
    // Show visual Banner Alert fallback for instant UI response
    Alert.alert(`🔔 ${title}`, body);

    if (Platform.OS !== 'web') {
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
  } catch (e) {
    console.warn('sendLocalNotification error:', e);
  }
}
