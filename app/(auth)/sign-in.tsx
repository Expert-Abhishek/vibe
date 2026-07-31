import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { LogoHeader } from '@/components/auth/logo-header';
import { LoginForm } from '@/components/auth/login-form';
import { SocialLogin } from '@/components/auth/social-login';
import { FooterLink } from '@/components/auth/footer-link';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { loginUserApi } from '@/constants/api';
import { saveUserSession } from '@/constants/authStore';

import { setAppTheme } from '@/hooks/use-color-scheme';

export default function SignInScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (phone: string, pass: string) => {
    if (loading) return;
    setLoading(true);
    const cleanPhone = phone.trim();

    try {
      const apiRes = await loginUserApi({ identifier: cleanPhone, password: pass });
      if (apiRes.success && apiRes.user) {
        if (apiRes.user.theme === 'light' || apiRes.user.theme === 'dark') {
          setAppTheme(apiRes.user.theme);
        }

        await saveUserSession({
          id: apiRes.user.id,
          name: apiRes.user.name,
          phone: apiRes.user.phone,
          email: apiRes.user.email,
          role: apiRes.user.role,
          status: apiRes.user.status,
          theme: apiRes.user.theme || 'dark',
          language: apiRes.user.language || 'en',
          token: apiRes.token,
          profile: apiRes.user.profile,
        });

        // Strict status verification check
        if (apiRes.user.role === 'driver' || apiRes.user.role === 'guide') {
          if (apiRes.user.status !== 'Active') {
            setLoading(false);
            const title = apiRes.user.status === 'Pending KYC' ? 'KYC Pending Verification' : 'Account Restricted';
            const msg = apiRes.message || `Your account is currently ${apiRes.user.status}. Please wait for admin verification.`;
            Alert.alert(title, msg);
            return;
          }
        }

        setLoading(false);
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
        setLoading(false);
        Alert.alert('Login Failed', apiRes.message);
        return;
      }
    } catch (e: any) {
      console.warn('Backend login attempt failed:', e);
      setLoading(false);
      Alert.alert('Login Error', e?.message || 'Failed to authenticate. Please check network connectivity.');
      return;
    }

    // Fallback role routing if backend is offline
    setLoading(false);
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
          >
            <LogoHeader />
            <LoginForm onLogin={handleLogin} isLoading={loading} />
            <SocialLogin />
            <FooterLink />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Clean Fullscreen Loader Overlay */}
      {loading && (
        <View style={styles.overlayContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#F5C518" />
            <Text style={styles.loaderText}>Authenticating credentials...</Text>
          </View>
        </View>
      )}
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
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loaderCard: {
    backgroundColor: '#1A1A20',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(20),
    borderRadius: scale(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  loaderText: {
    color: '#ffffff',
    marginTop: verticalScale(12),
    fontSize: moderateFontScale(14),
    fontWeight: '600',
  },
});
