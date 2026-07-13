import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { LogoHeader } from '@/components/auth/logo-header';
import { LoginForm } from '@/components/auth/login-form';
import { SocialLogin } from '@/components/auth/social-login';
import { FooterLink } from '@/components/auth/footer-link';
import { scale, verticalScale } from '@/constants/responsive';

export default function SignInScreen() {
  const router = useRouter();

  const player = useVideoPlayer(require('../../assets/screen.mp4'), (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
    playerInstance.play();
  });

  const handleLogin = (phone: string, pass: string) => {
    console.log('Logging in with:', phone, pass);
    // Simulated successful login - navigate to main tabs
    router.replace('/(tabs)');
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
