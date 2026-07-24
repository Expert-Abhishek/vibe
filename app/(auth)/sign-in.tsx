import React from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { LogoHeader } from '@/components/auth/logo-header';
import { LoginForm } from '@/components/auth/login-form';
import { SocialLogin } from '@/components/auth/social-login';
import { FooterLink } from '@/components/auth/footer-link';
import { scale, verticalScale } from '@/constants/responsive';
import { loginUserApi } from '@/constants/api';
import { saveUserSession } from '@/constants/authStore';

export default function SignInScreen() {
  const router = useRouter();

  const handleLogin = async (phone: string, pass: string) => {
    console.log('Logging in with:', phone, pass);
    const cleanPhone = phone.trim();

    try {
      const apiRes = await loginUserApi({ identifier: cleanPhone, password: pass });
      if (apiRes.success && apiRes.user) {
        await saveUserSession({
          id: apiRes.user.id,
          name: apiRes.user.name,
          phone: apiRes.user.phone,
          email: apiRes.user.email,
          role: apiRes.user.role,
          status: apiRes.user.status,
          token: apiRes.token,
          profile: apiRes.user.profile,
        });

        // Strict status verification check
        if (apiRes.user.role === 'driver' || apiRes.user.role === 'guide') {
          if (apiRes.user.status !== 'Active') {
            const title = apiRes.user.status === 'Pending KYC' ? 'KYC Pending Verification' : 'Account Restricted';
            const msg = apiRes.message || `Your account is currently ${apiRes.user.status}. Please wait for admin verification.`;
            Alert.alert(title, msg);
            return;
          }
        }

        if (apiRes.user.role === 'driver') {
          router.replace('/driver-dashboard');
          return;
        } else if (apiRes.user.role === 'guide') {
          router.replace('/guide-dashboard');
          return;
        } else {
          router.replace('/(tabs)');
          return;
        }
      } else if (apiRes.message) {
        Alert.alert('Access Restricted', apiRes.message);
        return;
      }
    } catch (e) {
      console.warn('Backend login attempt failed:', e);
    }

    // Fallback role routing if backend is offline
    const lowerPhone = cleanPhone.toLowerCase();
    if (lowerPhone.includes('guide')) {
      router.replace('/guide-dashboard');
    } else if (lowerPhone.includes('driver')) {
      router.replace('/driver-dashboard');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.backgroundGlow} />
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LogoHeader />
          <LoginForm onLogin={handleLogin} />
          <SocialLogin />
          <FooterLink />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06101d',
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#06101d',
  },
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
    flexGrow: 1,
    justifyContent: 'center',
  },
});
