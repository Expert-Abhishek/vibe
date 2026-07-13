import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';

export function FooterLink() {
  return (
    <View style={styles.footerTextRow}>
      <ThemedText style={styles.footerText}>New to Vibzz?</ThemedText>
      <Link href="/onboarding" style={styles.signUpLink}>
        <ThemedText type="link" style={styles.linkText}>Sign Up</ThemedText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  footerTextRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(6),
    marginTop: verticalScale(14),
    marginBottom: verticalScale(16),
  },
  footerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: moderateFontScale(14),
  },
  signUpLink: {
    paddingVertical: scale(2),
  },
  linkText: {
    color: '#F5C518',
    fontSize: moderateFontScale(14),
    fontWeight: '700',
  },
});
