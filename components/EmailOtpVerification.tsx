import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { sendEmailOtpApi, verifyEmailOtpApi } from '@/constants/api';

interface EmailOtpVerificationProps {
  email: string;
  purpose?: 'registration' | 'password_reset' | 'login' | 'auth';
  userName?: string;
  onVerified: (data: { email: string; otp: string }) => void;
  onCancel?: () => void;
  onChangeEmail?: () => void;
  title?: string;
  subtitle?: string;
  autoSendOnMount?: boolean;
}

export default function EmailOtpVerification({
  email,
  purpose = 'registration',
  userName,
  onVerified,
  onCancel,
  onChangeEmail,
  title = 'Verify Your Email',
  subtitle,
  autoSendOnMount = true,
}: EmailOtpVerificationProps) {
  const cleanEmail = (email || '').trim().toLowerCase();

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(300); // 5 mins
  const [resendCooldown, setResendCooldown] = useState(45);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // 1. Send OTP on component mount (if autoSendOnMount is true)
  const handleSendOtp = useCallback(async (isResend = false) => {
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('A valid email address is required.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    if (!isResend) {
      setSuccessMessage(null);
    }

    try {
      console.log(`📧 [EmailOtpVerification] Triggering OTP send for: ${cleanEmail} (${purpose})`);
      const res = await sendEmailOtpApi(cleanEmail, purpose, userName);
      setIsSending(false);

      if (res && res.success) {
        setTimer(res.expiresInSeconds || 300);
        setResendCooldown(45);
        setSuccessMessage(`A 6-digit verification code has been sent to ${cleanEmail}`);
        if (res.otpDebug) {
          setDevOtpHint(res.otpDebug);
        }
      } else {
        setErrorMessage(res?.message || 'Failed to send verification email. Please try again.');
      }
    } catch (e: any) {
      setIsSending(false);
      setErrorMessage(e?.message || 'Network error while sending verification email.');
    }
  }, [cleanEmail, purpose, userName]);

  useEffect(() => {
    if (autoSendOnMount) {
      handleSendOtp();
    } else {
      setSuccessMessage(`A 6-digit verification code has been sent to ${cleanEmail}`);
    }
  }, [autoSendOnMount, cleanEmail, handleSendOtp]);

  // 2. Countdown timers for TTL & resend cooldown
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format seconds as MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 3. Handle 6-Digit input change
  const handleOtpChange = (value: string, index: number) => {
    setErrorMessage(null);

    // Handle paste of complete 6-digit code
    if (value.length > 1) {
      const cleanValue = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = ['', '', '', '', '', ''];
      for (let i = 0; i < cleanValue.length; i++) {
        newOtp[i] = cleanValue[i];
      }
      setOtp(newOtp);

      if (cleanValue.length === 6) {
        inputRefs.current[5]?.blur();
        handleVerifyOtp(cleanValue);
      } else {
        const nextIdx = Math.min(cleanValue.length, 5);
        inputRefs.current[nextIdx]?.focus();
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newOtp.join('');
    if (fullCode.length === 6) {
      handleVerifyOtp(fullCode);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 4. Submit Verification
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const fullCode = (codeToVerify || otp.join('')).trim();
    if (fullCode.length < 6) {
      setErrorMessage('Please enter the full 6-digit code sent to your email.');
      return;
    }

    if (timer <= 0) {
      setErrorMessage('Verification code has expired. Please click "Resend Code" to receive a new one.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await verifyEmailOtpApi(cleanEmail, fullCode, purpose);
      setIsVerifying(false);

      if (res && res.success) {
        onVerified({ email: cleanEmail, otp: fullCode });
      } else {
        setErrorMessage(res?.message || 'Invalid or expired code. Please double-check the 6-digit OTP in your inbox.');
      }
    } catch (e: any) {
      setIsVerifying(false);
      setErrorMessage(e?.message || 'Network error verifying code. Please try again.');
    }
  };

  const maskedEmail = cleanEmail.replace(/(.{2})(.*)(?=@)/, (_gp1, gp2, gp3) => gp2 + '*'.repeat(gp3.length));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.card}>
        {/* Header with Back/Cancel Button */}
        <View style={styles.headerRow}>
          {onCancel ? (
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={scale(22)} color="#F5C518" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: scale(24) }} />
          )}
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: scale(24) }} />
        </View>

        {/* Email Icon & Badge */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="mark-email-read" size={scale(36)} color="#F5C518" />
          </View>
        </View>

        {/* Title & Email Info */}
        <Text style={styles.subText}>
          {subtitle || `Enter the 6-digit code sent to`}
        </Text>
        <Text style={styles.emailHighlight}>{cleanEmail}</Text>

        {onChangeEmail && (
          <TouchableOpacity onPress={onChangeEmail} style={styles.changeEmailBtn}>
            <Feather name="edit-2" size={scale(13)} color="#F5C518" />
            <Text style={styles.changeEmailText}>Change Email Address</Text>
          </TouchableOpacity>
        )}

        {/* Dev OTP Hint */}
        {devOtpHint && (
          <View style={styles.devHintBanner}>
            <Ionicons name="code-slash" size={scale(14)} color="#F5C518" />
            <Text style={styles.devHintText}>Dev Auto-Code: {devOtpHint}</Text>
          </View>
        )}

        {/* OTP 6-Box Inputs */}
        <View style={styles.otpContainer}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={(ref) => {
                inputRefs.current[idx] = ref;
              }}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
                errorMessage ? styles.otpBoxError : null,
              ]}
              value={digit}
              onChangeText={(val) => handleOtpChange(val, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={6}
              selectTextOnFocus
              textAlign="center"
              placeholderTextColor="rgba(255,255,255,0.2)"
            />
          ))}
        </View>

        {/* Error / Success Feedback */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={scale(16)} color="#FF5252" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {successMessage && !errorMessage && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle-outline" size={scale(16)} color="#4CAF50" />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {/* Timer Display */}
        <View style={styles.timerRow}>
          <Feather name="clock" size={scale(14)} color={timer > 0 ? 'rgba(255,255,255,0.6)' : '#FF5252'} />
          <Text style={[styles.timerText, timer === 0 ? styles.timerExpired : null]}>
            {timer > 0 ? `Code expires in ${formatTime(timer)}` : 'Code expired'}
          </Text>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, (isVerifying || otp.join('').length < 6) ? styles.verifyButtonDisabled : null]}
          onPress={() => handleVerifyOtp()}
          disabled={isVerifying || otp.join('').length < 6}
          activeOpacity={0.85}
        >
          {isVerifying ? (
            <ActivityIndicator size="small" color="#101014" />
          ) : (
            <View style={styles.buttonContent}>
              <Text style={styles.verifyButtonText}>Verify & Proceed</Text>
              <MaterialIcons name="arrow-forward" size={scale(18)} color="#101014" />
            </View>
          )}
        </TouchableOpacity>

        {/* Resend Action */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendPrompt}>Didn't receive the email? </Text>
          {resendCooldown > 0 ? (
            <Text style={styles.resendCooldownText}>Resend in {resendCooldown}s</Text>
          ) : (
            <TouchableOpacity
              onPress={() => handleSendOtp(true)}
              disabled={isSending}
              style={styles.resendBtn}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#F5C518" />
              ) : (
                <Text style={styles.resendActiveText}>Resend Code</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Spam folder tip */}
        <Text style={styles.spamTip}>
          Tip: If not in your primary inbox, please check your Spam or Promotions folder.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(10),
  },
  card: {
    backgroundColor: '#16161D',
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.25)',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(24),
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: verticalScale(14),
  },
  cancelBtn: {
    padding: scale(6),
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: moderateFontScale(18),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  iconContainer: {
    marginBottom: verticalScale(14),
  },
  iconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: 'rgba(245, 197, 24, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 197, 24, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: moderateFontScale(14),
    textAlign: 'center',
    lineHeight: moderateFontScale(20),
  },
  emailHighlight: {
    color: '#F5C518',
    fontSize: moderateFontScale(15),
    fontWeight: '700',
    textAlign: 'center',
    marginTop: verticalScale(2),
    marginBottom: verticalScale(8),
  },
  changeEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(10),
    borderRadius: scale(12),
    backgroundColor: 'rgba(245, 197, 24, 0.08)',
    marginBottom: verticalScale(12),
  },
  changeEmailText: {
    color: '#F5C518',
    fontSize: moderateFontScale(12),
    fontWeight: '600',
  },
  devHintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: 'rgba(245, 197, 24, 0.15)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
    marginBottom: verticalScale(12),
  },
  devHintText: {
    color: '#F5C518',
    fontSize: moderateFontScale(12),
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: verticalScale(14),
    gap: scale(8),
  },
  otpBox: {
    flex: 1,
    height: verticalScale(54),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: scale(12),
    color: '#FFFFFF',
    fontSize: moderateFontScale(22),
    fontWeight: '800',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: '#F5C518',
    backgroundColor: 'rgba(245, 197, 24, 0.08)',
  },
  otpBoxError: {
    borderColor: '#FF5252',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    width: '100%',
    marginBottom: verticalScale(10),
  },
  errorText: {
    color: '#FF5252',
    fontSize: moderateFontScale(12),
    flex: 1,
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    width: '100%',
    marginBottom: verticalScale(10),
  },
  successText: {
    color: '#4CAF50',
    fontSize: moderateFontScale(12),
    flex: 1,
    fontWeight: '500',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(16),
  },
  timerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: moderateFontScale(13),
    fontWeight: '500',
  },
  timerExpired: {
    color: '#FF5252',
  },
  verifyButton: {
    backgroundColor: '#F5C518',
    height: verticalScale(50),
    borderRadius: scale(25),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(245, 197, 24, 0.4)',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  verifyButtonText: {
    color: '#101014',
    fontSize: moderateFontScale(15),
    fontWeight: '700',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(18),
  },
  resendPrompt: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: moderateFontScale(13),
  },
  resendCooldownText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: moderateFontScale(13),
    fontWeight: '600',
  },
  resendBtn: {
    paddingVertical: verticalScale(2),
  },
  resendActiveText: {
    color: '#F5C518',
    fontSize: moderateFontScale(13),
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  spamTip: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: moderateFontScale(11),
    textAlign: 'center',
    marginTop: verticalScale(14),
    lineHeight: moderateFontScale(16),
  },
});
