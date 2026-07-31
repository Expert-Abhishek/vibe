// Optional dev logging config
if (__DEV__) {
  try {
    // require('../ReactotronConfig');
  } catch (e) {}
}

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { savePushTokenApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { getExpoPushToken } from '@/constants/notifications';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ModalProvider } from '@src/context/ModalContext';
import { initSocketService } from '@src/services/socketService';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const session = getUserSessionSync();
    if (session?.id) {
      initSocketService(session.id, session.role || 'tourist');
    }

    async function configurePushNotifications() {
      try {
        const token = await getExpoPushToken();
        if (token) {
          console.log('🎉 Expo Push Token:', token);
          if (session?.id) {
            await savePushTokenApi(session.id, token);
            console.log('✅ Push Token registered to backend DB.');
          }
        }
      } catch (err) {
        console.warn('configurePushNotifications error:', err);
      }
    }
    configurePushNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <ModalProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="sign-in" />
            <Stack.Screen name="(auth)/sign-in" />
            <Stack.Screen name="forgot-password" />
            <Stack.Screen name="(auth)/forgot-password" />
            <Stack.Screen name="(auth)/verify-otp" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="guides" />
            <Stack.Screen name="jungle-safari" />
            <Stack.Screen name="make-trip" />
            <Stack.Screen name="plan-route" />
            <Stack.Screen name="book-cab" />
            <Stack.Screen name="cars" />
            <Stack.Screen name="search-location" />
            <Stack.Screen name="guide-dashboard" />
            <Stack.Screen name="driver-dashboard" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ModalProvider>
    </SafeAreaProvider>
  );
}
