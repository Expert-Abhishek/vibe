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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { sendResetOtpApi, verifyResetOtpApi } from '@/constants/api';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const initialPhone = ((params.phone as string) || '').replace(/\D/g, '').slice(-10);

  const [userPhone, setUserPhone] = useState(initialPhone);
  const [isEditingPhone, setIsEditingPhone] = useState(!initialPhone);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const [timer, setTimer] = useState(59);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Countdown timer for resending code
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      Alert.alert('Phone Number Required', 'Please enter your registered 10-digit mobile number.');
      return;
    }

    if (code.length < 4) {
      Alert.alert('Incomplete OTP', 'Please enter all 4 digits of the OTP code received via SMS.');
      return;
    }

    if (!newPassword || newPassword.trim().length < 4) {
      Alert.alert('New Password Required', 'Please enter a new password (min 4 characters).');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyResetOtpApi({
        phone: cleanPhone,
        otp: code.trim(),
        newPassword: newPassword.trim(),
      });
      setLoading(false);

      if (res && res.success) {
        Alert.alert(
          '🎉 Password Reset Success!',
          res.message || 'Your password has been reset successfully! You can now log in with your new password.',
          [
            {
              text: 'Go to Sign In',
              onPress: () => router.replace('/(auth)/sign-in'),
            },
          ]
        );
      } else {
        Alert.alert('Verification Failed', res?.message || 'Invalid or expired 4-digit OTP code.');
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Error', err?.message || 'Server connection error. Please try again.');
    }
  };

  const handlePressOtp = () => {
    inputRef.current?.focus();
  };

  const formatTimer = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleResend = async () => {
    if (timer > 0) return;
    const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      Alert.alert('Phone Required', 'Please enter a valid 10-digit registered phone number.');
      return;
    }

    try {
      const res = await sendResetOtpApi(cleanPhone);
      if (res && res.success) {
        Alert.alert('OTP Resent 🚀', res.message || `A new 4-digit OTP code has been sent to +91 ${cleanPhone}.`);
        setTimer(59);
        setCode('');
      } else {
        Alert.alert('Resend Failed', res?.message || 'Failed to resend OTP.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Server connection error.');
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
            <Text style={styles.headerTitle}>Verify OTP & Reset Password</Text>
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
            
            {isEditingPhone ? (
              <View style={{ width: '100%', marginBottom: verticalScale(20), paddingHorizontal: scale(10) }}>
                <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: moderateFontScale(12), fontWeight: '600', marginBottom: verticalScale(6) }}>
                  Registered Mobile Number
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: '#F5C518',
                  borderRadius: scale(14),
                  paddingHorizontal: scale(14),
                  height: verticalScale(48),
                }}>
                  <Text style={{ color: '#F5C518', fontWeight: '700', fontSize: moderateFontScale(14), marginRight: scale(8) }}>+91</Text>
                  <TextInput
                    style={{ flex: 1, color: '#ffffff', fontSize: moderateFontScale(15), fontWeight: '600' }}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={userPhone}
                    onChangeText={(t) => setUserPhone(t.replace(/\D/g, ''))}
                  />
                  {userPhone.length === 10 && (
                    <TouchableOpacity onPress={() => setIsEditingPhone(false)} style={{ padding: scale(4) }}>
                      <MaterialIcons name="check" size={scale(20)} color="#F5C518" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(24) }}>
                <Text style={styles.subtitle}>
                  Enter the 4-digit code sent to{' '}
                  <Text style={styles.phoneHighlight}>+91 {userPhone}</Text>
                </Text>
                <TouchableOpacity onPress={() => setIsEditingPhone(true)} style={{ marginLeft: scale(6) }}>
                  <MaterialIcons name="edit" size={scale(16)} color="#F5C518" />
                </TouchableOpacity>
              </View>
            )}

            {/* 4-DIGIT OTP CODE INPUTS */}
            <Pressable style={styles.otpContainer} onPress={handlePressOtp}>
              {Array.from({ length: 4 }).map((_, idx) => {
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

            {/* Hidden Input field to drive the 4-digit OTP values */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={4}
              value={code}
              onChangeText={setCode}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              caretHidden
            />

            {/* NEW PASSWORD INPUT FIELD */}
            <View style={{ width: '100%', marginTop: verticalScale(24) }}>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: moderateFontScale(13), fontWeight: '600', marginBottom: verticalScale(8) }}>
                Enter New Password
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.12)',
                borderRadius: scale(20),
                paddingHorizontal: scale(16),
                height: verticalScale(50),
              }}>
                <MaterialIcons name="lock-outline" size={scale(20)} color="rgba(255, 255, 255, 0.7)" style={{ marginRight: scale(10) }} />
                <TextInput
                  style={{ flex: 1, color: '#ffffff', fontSize: moderateFontScale(15), height: '100%', fontWeight: '500' }}
                  placeholder="New Password (min 4 characters)"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: scale(4) }}>
                  <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={scale(20)} color="rgba(255, 255, 255, 0.6)" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* FOOTER ACTIONS */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.verifyButton,
                code.length < 4 || !newPassword || loading ? styles.verifyButtonDisabled : null,
              ]}
              onPress={handleVerify}
              disabled={code.length < 4 || !newPassword || loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#101010" size="small" />
              ) : (
                <View style={styles.buttonRow}>
                  <Text style={styles.verifyButtonText}>Verify & Reset Password</Text>
                  <MaterialIcons name="arrow-forward" size={scale(18)} color="#101010" />
                </View>
              )}
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
    justifyContent: 'center',
    gap: scale(14),
    width: '100%',
    paddingHorizontal: scale(10),
  },
  otpBox: {
    width: scale(62),
    height: scale(62),
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: '#F5C518',
    backgroundColor: 'rgba(245, 197, 24, 0.08)',
  },
  otpBoxFocused: {
    borderColor: '#F5C518',
    borderWidth: 2,
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  otpChar: {
    color: '#F5C518',
    fontSize: moderateFontScale(24),
    fontWeight: '800',
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
