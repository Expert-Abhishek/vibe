import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [timer, setTimer] = useState(57); // Start at 57 seconds like the screenshot
  const inputRef = useRef<TextInput>(null);

  // Countdown timer for resending code
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = () => {
    // Simulated login success - route to main app tabs
    router.replace('/(tabs)');
  };

  const handlePressOtp = () => {
    inputRef.current?.focus();
  };

  const formatTimer = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleResend = () => {
    if (timer === 0) {
      setTimer(59);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={scale(24)} color="#F5C518" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Verify OTP</Text>
          </View>

          {/* MAIN CONTENT */}
          <View style={styles.content}>
            {/* SHIELD ICON BADGE */}
            <View style={styles.shieldWrapper}>
              <View style={styles.shieldOutline}>
                <View style={styles.shieldInner}>
                  <MaterialIcons name="shield" size={scale(34)} color="#F5C518" />
                </View>
              </View>
            </View>

            <Text style={styles.title}>Secure Access</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to{' '}
              <Text style={styles.phoneHighlight}>+1 (555) 000-0000</Text>.
            </Text>

            {/* OTP CODE INPUTS */}
            <Pressable style={styles.otpContainer} onPress={handlePressOtp}>
              {Array.from({ length: 6 }).map((_, idx) => {
                const char = code[idx] || '';
                const isCurrent = idx === code.length;
                const showFocus = focused && isCurrent;

                return (
                  <View
                    key={idx}
                    style={[
                      styles.otpBox,
                      char ? styles.otpBoxFilled : null,
                      showFocus ? styles.otpBoxFocused : null,
                    ]}
                  >
                    <Text style={styles.otpChar}>
                      {char}
                      {showFocus ? '|' : ''}
                    </Text>
                  </View>
                );
              })}
            </Pressable>

            {/* Hidden Input field to drive the OTP values */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              caretHidden
            />
          </View>

          {/* FOOTER ACTIONS */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.verifyButton,
                code.length < 6 ? styles.verifyButtonDisabled : null,
              ]}
              onPress={handleVerify}
              disabled={code.length < 6}
              activeOpacity={0.9}
            >
              <View style={styles.buttonRow}>
                <Text style={styles.verifyButtonText}>Verify & Login</Text>
                <MaterialIcons name="arrow-forward" size={scale(18)} color="#101010" />
              </View>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>{"Didn't receive the code?"}</Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={timer > 0}
                style={styles.resendBtn}
              >
                <Text
                  style={[
                    styles.resendHighlight,
                    timer > 0 ? styles.resendTimerText : null,
                  ]}
                >
                  {timer > 0 ? `Resend Code in ${formatTimer(timer)}` : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101014',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(22),
    justifyContent: 'space-between',
    paddingBottom: verticalScale(20),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(14),
    marginBottom: verticalScale(10),
  },
  backButton: {
    padding: scale(6),
    marginRight: scale(14),
  },
  headerTitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(18),
    fontWeight: '700',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    marginTop: verticalScale(10),
  },
  shieldWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(24),
  },
  shieldOutline: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    borderWidth: 1.5,
    borderColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 197, 24, 0.03)',
    // glow shadow:
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  shieldInner: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: 'rgba(26, 26, 32, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: moderateFontScale(28),
    fontWeight: '800',
    marginBottom: verticalScale(10),
    letterSpacing: 0.2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: moderateFontScale(15),
    lineHeight: moderateFontScale(22),
    textAlign: 'center',
    marginBottom: verticalScale(34),
    paddingHorizontal: scale(20),
  },
  phoneHighlight: {
    color: '#F5C518',
    fontWeight: '700',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: scale(10),
  },
  otpBox: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  otpBoxFocused: {
    borderColor: '#3B82F6', // Blue outline focus border as shown in reference image
    borderWidth: 1.8,
  },
  otpChar: {
    color: '#ffffff',
    fontSize: moderateFontScale(18),
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  footer: {
    marginTop: verticalScale(30),
    gap: verticalScale(18),
    alignItems: 'center',
  },
  verifyButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(26),
    height: verticalScale(52),
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  verifyButtonDisabled: {
    backgroundColor: 'rgba(245, 197, 24, 0.5)',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  verifyButtonText: {
    color: '#101010',
    fontSize: moderateFontScale(16),
    fontWeight: '700',
  },
  resendContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(4),
  },
  resendText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: moderateFontScale(14),
    marginBottom: verticalScale(4),
  },
  resendBtn: {
    paddingVertical: verticalScale(4),
  },
  resendHighlight: {
    color: '#F5C518',
    fontWeight: '700',
    fontSize: moderateFontScale(14),
  },
  resendTimerText: {
    fontWeight: '600',
  },
});
