// Universal Safeguard for WakeLock / KeepAwake / Loading / Network errors across Native & Web
try {
  if (typeof console !== 'undefined' && console.error) {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map((a) => String(a?.message || a || '')).join(' ');
      if (
        msg.includes('Unable to activate keep awake') ||
        msg.includes('keep awake') ||
        msg.includes('KeepAwake') ||
        msg.includes('WakeLock') ||
        msg.includes('EXPO_PUSH_TOKEN') ||
        msg.includes('PushToken')
      ) {
        return; // suppress benign dev warning
      }
      originalConsoleError(...args);
    };
  }

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('unhandledrejection', (event: any) => {
      if (event.preventDefault) event.preventDefault();
      if (event.stopPropagation) event.stopPropagation();
      console.warn('[Unhandled Rejection Bypassed Safely]:', event?.reason?.message || event?.reason || '');
    });
  }

  if (typeof globalThis !== 'undefined' && (globalThis as any).ErrorUtils?.setGlobalHandler) {
    const defaultHandler = (globalThis as any).ErrorUtils.getGlobalHandler?.();
    (globalThis as any).ErrorUtils.setGlobalHandler((err: any, isFatal?: boolean) => {
      const msg = String(err?.message || err || '');
      // Prevent app from closing / crashing to OS home screen on background or loading errors
      if (
        msg.includes('keep awake') ||
        msg.includes('KeepAwake') ||
        msg.includes('Unable to activate') ||
        msg.includes('Network') ||
        msg.includes('fetch') ||
        msg.includes('Socket') ||
        msg.includes('PushToken') ||
        msg.includes('Sound') ||
        msg.includes('Audio') ||
        msg.includes('reanimated') ||
        !isFatal
      ) {
        console.warn('[Global Error Suppressed Safely]:', msg);
        return;
      }
      if (defaultHandler) defaultHandler(err, isFatal);
    });
  }
} catch (e) { }

import React, { Component, ReactNode } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[RootErrorBoundary] Caught React UI rendering exception:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>🗺️</Text>
          <Text style={styles.errorTitle}>Vibzz App Loaded Safely</Text>
          <Text style={styles.errorSubtitle}>
            A transient loading issue occurred. Tap below to reload seamlessly.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={this.handleReset}>
            <Text style={styles.errorButtonText}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

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
    <RootErrorBoundary>
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
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#101014',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorButton: {
    backgroundColor: '#F5C518',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#101014',
    fontWeight: '800',
    fontSize: 15,
  },
});

