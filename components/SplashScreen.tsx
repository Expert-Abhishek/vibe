import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Image, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';

interface SplashScreenProps {
  onFinish?: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-15);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    let mounted = true;
    try {
      // 1. Logo scale, fade in & rotate
      logoOpacity.value = withTiming(1, { duration: 600 });
      logoScale.value = withSpring(1, { damping: 10, stiffness: 100 });
      logoRotate.value = withSpring(0, { damping: 12, stiffness: 90 });

      // 2. Text fade & slide up
      textOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
      textTranslateY.value = withSpring(0, { damping: 12, stiffness: 90 });
    } catch (e) {}

    // 3. Continuous soft pulse
    const pulseInterval = setInterval(() => {
      if (!mounted) return;
      try {
        pulseScale.value = withSequence(
          withTiming(1.06, { duration: 400 }),
          withTiming(1, { duration: 400 })
        );
      } catch (e) {}
    }, 900);

    const timer = setTimeout(() => {
      clearInterval(pulseInterval);
      if (mounted && onFinish) {
        try {
          onFinish();
        } catch (e) {}
      }
    }, 2200);

    return () => {
      mounted = false;
      clearInterval(pulseInterval);
      clearTimeout(timer);
    };
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value * pulseScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#101014" />
      
      {/* Background ambient glow circles */}
      <View style={styles.glowCircleLarge} />
      <View style={styles.glowCircleSmall} />

      <View style={styles.content}>
        {/* Animated App Logo Icon */}
        <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🗺️</Text>
          </View>
        </Animated.View>

        {/* Animated App Branding Title */}
        <Animated.View style={[styles.textWrapper, textAnimatedStyle]}>
          <Text style={styles.brandTitle}>VIBE</Text>
          <Text style={styles.brandSubtitle}>EXPLORE · RIDE · GUIDE</Text>
        </Animated.View>
      </View>

      {/* Footer Tagline */}
      <Animated.View style={[styles.footer, textAnimatedStyle]}>
        <Text style={styles.footerText}>Powered by Vibe Tour & Cab Management</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101014',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircleLarge: {
    position: 'absolute',
    width: scale(320),
    height: scale(320),
    borderRadius: scale(160),
    backgroundColor: 'rgba(245, 197, 24, 0.06)',
  },
  glowCircleSmall: {
    position: 'absolute',
    width: scale(180),
    height: scale(180),
    borderRadius: scale(90),
    backgroundColor: 'rgba(245, 197, 24, 0.12)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    marginBottom: verticalScale(20),
  },
  logoCircle: {
    width: scale(110),
    height: scale(110),
    borderRadius: scale(30),
    backgroundColor: '#1E1E24',
    borderWidth: 2,
    borderColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: moderateFontScale(52),
  },
  textWrapper: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: moderateFontScale(42),
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
  },
  brandSubtitle: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    color: '#F5C518',
    letterSpacing: 3,
    marginTop: verticalScale(6),
  },
  footer: {
    position: 'absolute',
    bottom: verticalScale(34),
  },
  footerText: {
    fontSize: moderateFontScale(11),
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500',
  },
});
