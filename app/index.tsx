import React, { useState } from 'react';
import { getUserSessionSync } from '@/constants/authStore';
import { Redirect } from 'expo-router';
import SplashScreen from '@/components/SplashScreen';

export default function Index() {
  const [isSplashActive, setIsSplashActive] = useState(true);
  const session = getUserSessionSync();

  if (isSplashActive) {
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
