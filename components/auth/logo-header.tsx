import { ThemedText } from '@/components/themed-text';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export function LogoHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.brandBadge}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <ThemedText style={styles.brandName}>Vibzz</ThemedText>
      <ThemedText style={styles.brandTagline}>Make your own vibe with us</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(20),
  },
  brandBadge: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(36),
    // backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    color: '#ffffff',
    fontSize: moderateFontScale(28),
    fontWeight: '900',
    marginTop: verticalScale(10),
    paddingVertical: verticalScale(5),
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  brandTagline: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: moderateFontScale(14),
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
});
