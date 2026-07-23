import React from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { LogoHeader } from '@/components/auth/logo-header';
import { LoginForm } from '@/components/auth/login-form';
import { SocialLogin } from '@/components/auth/social-login';
import { FooterLink } from '@/components/auth/footer-link';
import { scale, verticalScale } from '@/constants/responsive';
import { adminState } from '../admin-state';
import { loginUserApi, googleAuthApi } from '@/constants/api';
import { saveUserSession } from '@/constants/authStore';

export default function SignInScreen() {
  const router = useRouter();

  const player = useVideoPlayer(require('../../assets/screen.mp4'), (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
    playerInstance.play();
  });

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

  const handleGoogleLogin = async () => {
    try {
      const googleUser = {
        googleId: `g_${Date.now()}`,
        email: `user_${Date.now().toString().slice(-4)}@gmail.com`,
        name: 'Google User',
        role: 'tourist',
      };
      const apiRes = await googleAuthApi(googleUser);
      if (apiRes.success && apiRes.user) {
        await saveUserSession({
          id: apiRes.user.id,
          name: apiRes.user.name,
          phone: apiRes.user.phone,
          email: apiRes.user.email,
          role: apiRes.user.role,
          status: apiRes.user.status,
          token: apiRes.token,
        });
        Alert.alert('🎉 Google Sign-In', `Welcome ${apiRes.user.name}!`);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Google Sign-In Failed', apiRes.message || 'Error signing in with Google.');
      }
    } catch (err) {
      Alert.alert('Google Sign-In Error', 'Unable to complete Google authentication.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        contentFit="cover"
        nativeControls={false}
        surfaceType="textureView"
      />
      <View style={styles.overlay} />
      
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <LogoHeader />
          <LoginForm onLogin={handleLogin} />
          <SocialLogin onGoogleLogin={handleGoogleLogin} />
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
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 16, 29, 0.65)',
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
