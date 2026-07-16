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

export default function SignInScreen() {
  const router = useRouter();

  const player = useVideoPlayer(require('../../assets/screen.mp4'), (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
    playerInstance.play();
  });

  const handleLogin = (phone: string, pass: string) => {
    console.log('Logging in with:', phone, pass);
    const lowerPhone = phone.toLowerCase();
    const lowerPass = pass.toLowerCase();

    // Check registered driver list
    const driver = adminState.drivers.find(d => d.username === lowerPhone || d.phone === phone);
    if (driver) {
      if (driver.status === 'Pending KYC') {
        Alert.alert('KYC Pending', 'Your driver registration is currently pending admin KYC approval. Please wait for admin verification.');
        return;
      }
      if (driver.status === 'Inactive') {
        Alert.alert('Account Deactivated', 'Your driver account has been deactivated by the admin.');
        return;
      }
      if (driver.status === 'KYC Declined') {
        Alert.alert('KYC Declined', 'Your driver registration KYC was declined by the admin.');
        return;
      }
      router.replace('/driver-dashboard');
      return;
    }

    // Check registered guide list
    const guide = adminState.guides.find(g => g.username === lowerPhone || g.phone === phone);
    if (guide) {
      if (guide.status === 'Pending KYC') {
        Alert.alert('KYC Pending', 'Your guide registration is currently pending admin KYC approval. Please wait for admin verification.');
        return;
      }
      if (guide.status === 'Inactive') {
        Alert.alert('Account Deactivated', 'Your guide account has been deactivated by the admin.');
        return;
      }
      if (guide.status === 'KYC Declined') {
        Alert.alert('KYC Declined', 'Your guide registration KYC was declined by the admin.');
        return;
      }
      router.replace('/guide-dashboard');
      return;
    }

    // Fallback dynamic login
    if (lowerPhone.includes('guide') || lowerPass.includes('guide') || pass === '8240') {
      router.replace('/guide-dashboard');
    } else if (lowerPhone.includes('driver') || lowerPass.includes('driver')) {
      router.replace('/driver-dashboard');
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleGoogleLogin = () => {
    console.log('Google login requested');
    router.replace('/(tabs)');
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
