import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { adminState } from '@/constants/admin-state';

export * from '@/constants/admin-state';
export { adminState };

/**
 * Expo Router Route Screen Component for /admin-state
 */
export default function AdminStateScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin-dashboard' as any);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#101014', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#F5C518" />
      <Text style={{ color: '#FFFFFF', marginTop: 12, fontWeight: '700' }}>Redirecting to Admin Dashboard...</Text>
    </View>
  );
}
