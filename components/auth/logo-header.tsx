import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';

export function LogoHeader() {
  return (
    <View style={styles.container}>
      <View style={styles.brandBadge}>
        <IconSymbol name="car.fill" size={scale(32)} color="#101010" />
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
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  brandName: {
    color: '#ffffff',
    fontSize: moderateFontScale(28),
    fontWeight: '900',
    marginTop: verticalScale(12),
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
