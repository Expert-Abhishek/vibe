import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { verifyResetOtpApi } from '@/constants/api';
import WhatsAppOtpVerification from '@/components/WhatsAppOtpVerification';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string; sessionId?: string; code?: string }>();
  const initialPhone = ((params.phone as string) || '').replace(/\D/g, '').slice(-10);

  const [userPhone, setUserPhone] = useState(initialPhone);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifiedSession, setVerifiedSession] = useState<{ sessionId: string; code?: string } | null>(null);

  // When WhatsApp verification completes
  const handleWhatsAppVerified = (data: { sessionId: string; phone: string; code?: string }) => {
    setVerifiedSession({ sessionId: data.sessionId, code: data.code });
    setUserPhone(data.phone || userPhone);
  };

  // Submit Password Reset once verified
  const handleResetPassword = async () => {
    const cleanPhone = userPhone.replace(/\D/g, '').slice(-10);

    if (!cleanPhone || cleanPhone.length !== 10) {
      Alert.alert('Phone Number Required', 'Please enter your registered 10-digit mobile number.');
      return;
    }

    if (!newPassword || newPassword.trim().length < 4) {
      Alert.alert('New Password Required', 'Please enter a new password (min 4 characters).');
      return;
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The passwords you entered do not match.');
      return;
    }

    if (!verifiedSession) {
      Alert.alert('Verification Required', 'Please complete the WhatsApp verification first.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyResetOtpApi({
        phone: cleanPhone,
        otp: verifiedSession.code || '',
        sessionId: verifiedSession.sessionId,
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
        Alert.alert('Reset Failed', res?.message || 'Failed to update password. Please try again.');
      }
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Error', err?.message || 'Server connection error. Please try again.');
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
            <Text style={styles.headerTitle}>Reset Password</Text>
          </View>

          {/* MAIN CONTENT */}
          <View style={styles.content}>
            {!verifiedSession ? (
              // Step 1: WhatsApp Inbound Verification
              <WhatsAppOtpVerification
                phone={userPhone}
                purpose="password_reset"
                title="WhatsApp Inbound Verification"
                subtitle={`Tap below to send the verification code from WhatsApp on +91 ${userPhone}. It will verify instantly.`}
                onVerified={handleWhatsAppVerified}
              />
            ) : (
              // Step 2: Enter New Password
              <View style={styles.passwordSection}>
                <View style={styles.successBadge}>
                  <MaterialIcons name="check-circle" size={scale(48)} color="#25D366" />
                  <Text style={styles.successTitle}>WhatsApp Verified! ✅</Text>
                  <Text style={styles.successSub}>
                    Verified number: <Text style={{ color: '#F5C518', fontWeight: '700' }}>+91 {userPhone}</Text>
                  </Text>
                </View>

                {/* NEW PASSWORD INPUT FIELD */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Enter New Password</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons
                      name="lock-outline"
                      size={scale(20)}
                      color="rgba(255, 255, 255, 0.7)"
                      style={{ marginRight: scale(10) }}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="New Password (min 4 chars)"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      secureTextEntry={!showPassword}
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: scale(4) }}>
                      <MaterialIcons
                        name={showPassword ? 'visibility' : 'visibility-off'}
                        size={scale(20)}
                        color="rgba(255, 255, 255, 0.6)"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* CONFIRM PASSWORD INPUT FIELD */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons
                      name="lock-outline"
                      size={scale(20)}
                      color="rgba(255, 255, 255, 0.7)"
                      style={{ marginRight: scale(10) }}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Re-enter New Password"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      secureTextEntry={!showPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>
                </View>

                {/* SUBMIT BUTTON */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !newPassword || newPassword.length < 4 || loading ? styles.submitButtonDisabled : null,
                  ]}
                  onPress={handleResetPassword}
                  disabled={!newPassword || newPassword.length < 4 || loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color="#101010" size="small" />
                  ) : (
                    <View style={styles.buttonRow}>
                      <Text style={styles.submitButtonText}>Update Password & Sign In</Text>
                      <MaterialIcons name="arrow-forward" size={scale(18)} color="#101010" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
  passwordSection: {
    width: '100%',
    backgroundColor: '#15171e',
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.25)',
    padding: scale(22),
    alignItems: 'center',
  },
  successBadge: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  successTitle: {
    color: '#ffffff',
    fontSize: moderateFontScale(20),
    fontWeight: '800',
    marginTop: verticalScale(8),
  },
  successSub: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: moderateFontScale(13),
    marginTop: verticalScale(4),
  },
  inputContainer: {
    width: '100%',
    marginBottom: verticalScale(16),
  },
  inputLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: moderateFontScale(13),
    fontWeight: '600',
    marginBottom: verticalScale(8),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    height: verticalScale(50),
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: moderateFontScale(15),
    height: '100%',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(26),
    height: verticalScale(52),
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(10),
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(245, 197, 24, 0.5)',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  submitButtonText: {
    color: '#101010',
    fontSize: moderateFontScale(16),
    fontWeight: '700',
  },
});
