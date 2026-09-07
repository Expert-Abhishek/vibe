import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Animated,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import {
  WhatsAppInitiateResponse,
  checkWhatsAppOtpStatusApi,
  initiateWhatsAppOtpApi,
  verifyWhatsAppManualCodeApi,
} from '@/constants/api';

interface WhatsAppOtpVerificationProps {
  phone: string;
  purpose?: 'registration' | 'password_reset' | 'login' | 'auth';
  onVerified: (data: { sessionId: string; phone: string; code?: string }) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export default function WhatsAppOtpVerification({
  phone,
  purpose = 'auth',
  onVerified,
  onCancel,
  title = 'Verify via WhatsApp',
  subtitle,
}: WhatsAppOtpVerificationProps) {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<WhatsAppInitiateResponse | null>(null);
  const [timer, setTimer] = useState(300); // 5 minutes (300s)
  const [isExpired, setIsExpired] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualVerifying, setManualVerifying] = useState(false);

  // Pulse animation for waiting ring
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVerifiedRef = useRef(false);

  // Start pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // 1. Initiate WhatsApp Reverse OTP Session
  const initiateSession = useCallback(async () => {
    setLoading(true);
    setIsExpired(false);
    setIsVerified(false);
    isVerifiedRef.current = false;
    setTimer(300);

    try {
      const res = await initiateWhatsAppOtpApi(cleanPhone, purpose);
      setLoading(false);

      if (res && res.success && res.sessionId) {
        setSession(res);
        setTimer(res.expiresInSeconds || 300);
      } else {
        Alert.alert('Session Error', res?.message || 'Failed to start WhatsApp verification session.');
      }
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Network Error', e?.message || 'Failed to connect to verification server.');
    }
  }, [cleanPhone, purpose]);

  useEffect(() => {
    initiateSession();
  }, [initiateSession]);

  // 2. Countdown Timer
  useEffect(() => {
    if (timer <= 0) {
      setIsExpired(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  // 3. Real-Time Status Check (Polling Fallback every 2 seconds)
  const checkStatus = useCallback(async () => {
    if (!session?.sessionId || isVerifiedRef.current || isExpired) return;

    try {
      const statusRes = await checkWhatsAppOtpStatusApi(session.sessionId);
      if (statusRes && statusRes.verified && !isVerifiedRef.current) {
        isVerifiedRef.current = true;
        setIsVerified(true);
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

        setTimeout(() => {
          onVerified({
            sessionId: session.sessionId!,
            phone: cleanPhone,
            code: session.verificationCode,
          });
        }, 800);
      } else if (statusRes && statusRes.status === 'EXPIRED') {
        setIsExpired(true);
      }
    } catch (err) {
      // Silent catch for background polling
    }
  }, [session, isExpired, cleanPhone, onVerified]);

  useEffect(() => {
    if (!session?.sessionId || isVerified || isExpired) return;

    pollingIntervalRef.current = setInterval(() => {
      checkStatus();
    }, 2000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [session, isVerified, isExpired, checkStatus]);

  // 4. Open WhatsApp Deep Link
  const handleOpenWhatsApp = async () => {
    if (!session?.deepLink) return;

    setIsVerifying(true);
    try {
      const supported = await Linking.canOpenURL(session.deepLink);
      if (supported) {
        await Linking.openURL(session.deepLink);
      } else {
        // Fallback to web link
        await Linking.openURL(`https://api.whatsapp.com/send?phone=${session.businessPhone}&text=${encodeURIComponent(`VERIFY ${session.verificationCode}`)}`);
      }
    } catch (e: any) {
      Alert.alert('WhatsApp Error', 'Could not launch WhatsApp. You can enter the code manually.');
      setShowManualInput(true);
    }
  };

  // 5. Manual Fallback Verification
  const handleManualVerify = async () => {
    if (!session?.sessionId || manualCode.trim().length !== 6) {
      Alert.alert('Required', 'Please enter the exact 6-digit verification code.');
      return;
    }

    setManualVerifying(true);
    try {
      const res = await verifyWhatsAppManualCodeApi(session.sessionId, manualCode.trim());
      setManualVerifying(false);

      if (res && res.success) {
        isVerifiedRef.current = true;
        setIsVerified(true);
        setTimeout(() => {
          onVerified({
            sessionId: session.sessionId!,
            phone: cleanPhone,
            code: manualCode.trim(),
          });
        }, 600);
      } else {
        Alert.alert('Verification Failed', res?.message || 'Invalid verification code.');
      }
    } catch (e: any) {
      setManualVerifying(false);
      Alert.alert('Error', e?.message || 'Verification connection failed.');
    }
  };

  const formatTimer = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Generating WhatsApp verification link...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.header}>
        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <MaterialIcons name="close" size={scale(22)} color="rgba(255, 255, 255, 0.6)" />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleRow}>
          <FontAwesome name="whatsapp" size={scale(24)} color="#25D366" style={{ marginRight: scale(8) }} />
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
      </View>

      {/* ICON BADGE WITH PULSE */}
      <View style={styles.iconContainer}>
        <Animated.View
          style={[
            styles.pulseRing,
            isVerified ? { borderColor: '#25D366', backgroundColor: 'rgba(37, 211, 102, 0.15)' } : null,
            { transform: [{ scale: isVerified ? 1 : pulseAnim }] },
          ]}
        >
          <View style={[styles.iconInner, isVerified ? { backgroundColor: '#25D366' } : null]}>
            {isVerified ? (
              <MaterialIcons name="check" size={scale(36)} color="#101014" />
            ) : (
              <FontAwesome name="whatsapp" size={scale(36)} color="#25D366" />
            )}
          </View>
        </Animated.View>
      </View>

      {/* STATUS & INSTRUCTIONS */}
      <Text style={styles.titleText}>
        {isVerified
          ? 'Verification Complete! 🎉'
          : isExpired
          ? 'Verification Link Expired'
          : 'Instant Inbound Verification'}
      </Text>

      <Text style={styles.subtitleText}>
        {isVerified
          ? `Your mobile number +91 ${cleanPhone} has been verified.`
          : isExpired
          ? 'The 5-minute security window has expired. Please generate a fresh link.'
          : subtitle ||
            `Tap the button below to open WhatsApp with your pre-filled code, then press Send.`}
      </Text>

      {/* CODE DISPLAY CARD */}
      {!isExpired && !isVerified && session?.verificationCode && (
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Pre-filled Verification Message:</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codePrefix}>VERIFY </Text>
            <Text style={styles.codeHighlight}>{session.verificationCode}</Text>
          </View>
          <Text style={styles.codeSub}>to +{session.businessPhone || '918088626099'}</Text>
        </View>
      )}

      {/* PRIMARY ACTION BUTTON */}
      {!isVerified && !isExpired && (
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={handleOpenWhatsApp}
          activeOpacity={0.88}
        >
          <FontAwesome name="whatsapp" size={scale(22)} color="#ffffff" style={{ marginRight: scale(10) }} />
          <Text style={styles.whatsappButtonText}>Open WhatsApp to Verify</Text>
          <MaterialIcons name="arrow-forward" size={scale(18)} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* EXPIRED RE-GENERATE BUTTON */}
      {isExpired && (
        <TouchableOpacity style={styles.retryButton} onPress={initiateSession} activeOpacity={0.88}>
          <MaterialIcons name="refresh" size={scale(20)} color="#101014" style={{ marginRight: scale(8) }} />
          <Text style={styles.retryButtonText}>Generate New Verification Link</Text>
        </TouchableOpacity>
      )}

      {/* VERIFYING SPINNER & TIMER */}
      {!isVerified && !isExpired && (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color="#25D366" style={{ marginRight: scale(8) }} />
          <Text style={styles.statusText}>
            Waiting for WhatsApp message... <Text style={styles.timerText}>({formatTimer(timer)})</Text>
          </Text>
        </View>
      )}

      {/* MANUAL CODE ENTRY TOGGLE */}
      {!isVerified && !isExpired && (
        <View style={styles.manualSection}>
          <TouchableOpacity
            onPress={() => setShowManualInput(!showManualInput)}
            style={styles.manualToggle}
          >
            <Text style={styles.manualToggleText}>
              {showManualInput ? '▲ Hide manual code entry' : '▼ Or enter 6-digit code manually'}
            </Text>
          </TouchableOpacity>

          {showManualInput && (
            <View style={styles.manualInputContainer}>
              <TextInput
                style={styles.manualInput}
                placeholder="6-digit code"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                keyboardType="number-pad"
                maxLength={6}
                value={manualCode}
                onChangeText={setManualCode}
              />
              <TouchableOpacity
                style={[
                  styles.manualVerifyBtn,
                  manualCode.length !== 6 || manualVerifying ? styles.manualVerifyBtnDisabled : null,
                ]}
                onPress={handleManualVerify}
                disabled={manualCode.length !== 6 || manualVerifying}
              >
                {manualVerifying ? (
                  <ActivityIndicator color="#101014" size="small" />
                ) : (
                  <Text style={styles.manualVerifyBtnText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* MANUAL REFRESH BUTTON */}
      {!isVerified && !isExpired && (
        <TouchableOpacity onPress={checkStatus} style={styles.refreshBtn} activeOpacity={0.7}>
          <MaterialIcons name="sync" size={scale(16)} color="rgba(255, 255, 255, 0.5)" style={{ marginRight: scale(4) }} />
          <Text style={styles.refreshBtnText}>Already sent? Tap to check status</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16181f',
    borderRadius: scale(20),
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: moderateFontScale(14),
    marginTop: verticalScale(14),
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#15171e',
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.25)',
    padding: scale(22),
    alignItems: 'center',
    width: '100%',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
    position: 'relative',
  },
  cancelBtn: {
    position: 'absolute',
    left: 0,
    padding: scale(6),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#25D366',
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  iconContainer: {
    marginVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
    borderWidth: 1.5,
    borderColor: 'rgba(37, 211, 102, 0.4)',
    backgroundColor: 'rgba(37, 211, 102, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: 'rgba(26, 30, 40, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    color: '#ffffff',
    fontSize: moderateFontScale(20),
    fontWeight: '800',
    marginTop: verticalScale(8),
    marginBottom: verticalScale(6),
    textAlign: 'center',
  },
  subtitleText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: moderateFontScale(13),
    lineHeight: moderateFontScale(19),
    textAlign: 'center',
    paddingHorizontal: scale(10),
    marginBottom: verticalScale(18),
  },
  codeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: scale(16),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(18),
    alignItems: 'center',
    width: '100%',
    marginBottom: verticalScale(18),
  },
  codeLabel: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: moderateFontScale(11),
    fontWeight: '600',
    marginBottom: verticalScale(4),
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codePrefix: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: moderateFontScale(17),
    fontWeight: '700',
  },
  codeHighlight: {
    color: '#25D366',
    fontSize: moderateFontScale(20),
    fontWeight: '900',
    letterSpacing: 2,
  },
  codeSub: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(2),
  },
  whatsappButton: {
    backgroundColor: '#25D366',
    borderRadius: scale(24),
    height: verticalScale(50),
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  whatsappButtonText: {
    color: '#ffffff',
    fontSize: moderateFontScale(15),
    fontWeight: '800',
  },
  retryButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(24),
    height: verticalScale(50),
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#101014',
    fontSize: moderateFontScale(15),
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(16),
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: moderateFontScale(12),
    fontWeight: '600',
  },
  timerText: {
    color: '#25D366',
    fontWeight: '700',
  },
  manualSection: {
    width: '100%',
    marginTop: verticalScale(14),
    alignItems: 'center',
  },
  manualToggle: {
    paddingVertical: verticalScale(6),
  },
  manualToggleText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: moderateFontScale(12),
    fontWeight: '600',
  },
  manualInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: verticalScale(8),
    gap: scale(8),
  },
  manualInput: {
    flex: 1,
    height: verticalScale(44),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: scale(14),
    paddingHorizontal: scale(14),
    color: '#ffffff',
    fontSize: moderateFontScale(16),
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  manualVerifyBtn: {
    backgroundColor: '#25D366',
    borderRadius: scale(14),
    height: verticalScale(44),
    paddingHorizontal: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualVerifyBtnDisabled: {
    backgroundColor: 'rgba(37, 211, 102, 0.4)',
  },
  manualVerifyBtnText: {
    color: '#ffffff',
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(14),
    paddingVertical: verticalScale(4),
  },
  refreshBtnText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: moderateFontScale(11),
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
