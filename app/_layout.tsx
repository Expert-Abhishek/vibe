// Universal Safeguard for WakeLock / KeepAwake permission errors across Native & Web
try {
  if (typeof console !== 'undefined' && console.error) {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map((a) => String(a?.message || a || '')).join(' ');
      if (
        msg.includes('Unable to activate keep awake') ||
        msg.includes('keep awake') ||
        msg.includes('KeepAwake') ||
        msg.includes('WakeLock')
      ) {
        return; // suppress benign keep-awake dev warning
      }
      originalConsoleError(...args);
    };
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('unhandledrejection', (event: any) => {
      const reasonStr = String(event?.reason?.message || event?.reason || '');
      if (
        reasonStr.includes('keep awake') ||
        reasonStr.includes('KeepAwake') ||
        reasonStr.includes('WakeLock') ||
        reasonStr.includes('Unable to activate')
      ) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
      }
    });
  }

  if (typeof globalThis !== 'undefined' && (globalThis as any).ErrorUtils?.setGlobalHandler) {
    const defaultHandler = (globalThis as any).ErrorUtils.getGlobalHandler?.();
    (globalThis as any).ErrorUtils.setGlobalHandler((err: any, isFatal?: boolean) => {
      const msg = String(err?.message || err || '');
      if (msg.includes('keep awake') || msg.includes('KeepAwake') || msg.includes('Unable to activate')) {
        return;
      }
      if (defaultHandler) defaultHandler(err, isFatal);
    });
  }
} catch (e) { }

import { Platform } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { savePushTokenApi } from '@/constants/api';
import { getUserSessionSync, loadUserSessionAsync } from '@/constants/authStore';
import { getExpoPushToken } from '@/constants/notifications';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ModalProvider } from '@src/context/ModalContext';
import '@src/i18n';
import { initSocketService } from '@src/services/socketService';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    (async () => {
      try {
        const session = await loadUserSessionAsync();
        if (session?.id) {
          initSocketService(session.id, session.role || 'tourist');
          if (Platform.OS !== 'web') {
            const token = await getExpoPushToken();
            if (token) {
              await savePushTokenApi(session.id, token);
            }
          }
        }
      } catch (err) {
        // silent in dev
      }
    })();
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
            <Stack.Screen name="driver-history" options={{ animation: 'none' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ModalProvider>
    </SafeAreaProvider>
  );
}
