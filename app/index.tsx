import React, { useEffect, useState } from 'react';
import { getUserSessionSync, loadUserSessionAsync, UserSession } from '@/constants/authStore';
import { Redirect } from 'expo-router';
import SplashScreen from '@/components/SplashScreen';
import * as ExpoSplashScreen from 'expo-splash-screen';

try {
  ExpoSplashScreen.preventAutoHideAsync().catch(() => {});
} catch (e) {}

export default function Index() {
  const [isSplashActive, setIsSplashActive] = useState(true);
  const [session, setSession] = useState<UserSession | null>(getUserSessionSync());
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const stored = await loadUserSessionAsync();
        if (mounted) setSession(stored);
      } catch (e) {
        console.warn('Session init error:', e);
      } finally {
        if (mounted) setLoadingSession(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSplashActive && !loadingSession) {
      try {
        ExpoSplashScreen.hideAsync().catch(() => {});
      } catch (e) {}
    }
  }, [isSplashActive, loadingSession]);

  if (isSplashActive || loadingSession) {
    return <SplashScreen onFinish={() => setIsSplashActive(false)} />;
  }

  if (session?.id) {
    if (session.role === 'driver') {
      return <Redirect href="/driver-dashboard" />;
    } else if (session.role === 'guide') {
      return <Redirect href="/guide-dashboard" />;
    } else {
      return <Redirect href="/(tabs)" />;
    }
  }

  return <Redirect href="/(auth)/sign-in" />;
}

