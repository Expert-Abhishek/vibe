import { Redirect } from 'expo-router';
import { getUserSessionSync } from '@/constants/authStore';

export default function Index() {
  const session = getUserSessionSync();

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
