import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemedText } from '@/components/themed-text';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';

interface SocialLoginProps {
  onGoogleLogin: () => void;
}

export function SocialLogin({ onGoogleLogin }: SocialLoginProps) {
  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <ThemedText style={styles.dividerText}>OR CONTINUE WITH</ThemedText>
        <View style={styles.line} />
      </View>

      <TouchableOpacity style={styles.googleButton} onPress={onGoogleLogin} activeOpacity={0.85}>
        <View style={styles.circle}>
          <FontAwesome name="google" size={scale(22)} color="#ffffff" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(14),
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    marginBottom: verticalScale(16),
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    marginHorizontal: scale(14),
    letterSpacing: 1.1,
  },
  googleButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
