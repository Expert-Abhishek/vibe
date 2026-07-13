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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('202-555-0123');

  const handleSendOtp = () => {
    // Navigate to Verify OTP screen
    router.push('/(auth)/verify-otp');
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
            <Text style={styles.headerTitle}>Forgot Password</Text>
          </View>

          {/* MAIN CONTENT */}
          <View style={styles.content}>
            <Text style={styles.title}>Reset your access</Text>
            <Text style={styles.subtitle}>
              {"Enter your registered phone number to receive a verification code. We'll help you get back on the road in no time."}
            </Text>

            {/* INPUT FIELD */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="smartphone"
                  size={scale(20)}
                  color="rgba(255, 255, 255, 0.7)"
                  style={styles.inputIcon}
                />
                <Text style={styles.prefix}>+1</Text>
                <View style={styles.separator} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
            </View>
          </View>

          {/* FOOTER ACTIONS */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendOtp}
              activeOpacity={0.9}
            >
              <View style={styles.buttonRow}>
                <Text style={styles.sendButtonText}>Send OTP</Text>
                <MaterialIcons name="send" size={scale(18)} color="#101010" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportButton} activeOpacity={0.7}>
              <Text style={styles.supportText}>
                Still having trouble? <Text style={styles.supportHighlight}>Contact Support</Text>
              </Text>
            </TouchableOpacity>
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
    marginBottom: verticalScale(20),
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
    marginTop: verticalScale(10),
  },
  title: {
    color: '#F5C518',
    fontSize: moderateFontScale(28),
    fontWeight: '800',
    marginBottom: verticalScale(14),
    letterSpacing: 0.2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: moderateFontScale(15),
    lineHeight: moderateFontScale(22),
    marginBottom: verticalScale(30),
  },
  fieldContainer: {
    marginBottom: verticalScale(20),
  },
  label: {
    color: 'rgba(255, 255, 255, 0.5)',
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
    borderRadius: scale(24),
    paddingHorizontal: scale(18),
    height: verticalScale(54),
  },
  inputIcon: {
    marginRight: scale(12),
  },
  prefix: {
    color: '#ffffff',
    fontSize: moderateFontScale(16),
    fontWeight: '600',
    marginRight: scale(12),
  },
  separator: {
    width: 1,
    height: verticalScale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: scale(16),
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: moderateFontScale(16),
    height: '100%',
    fontWeight: '500',
  },
  footer: {
    marginTop: verticalScale(30),
    gap: verticalScale(16),
    alignItems: 'center',
  },
  sendButton: {
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
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  sendButtonText: {
    color: '#101010',
    fontSize: moderateFontScale(16),
    fontWeight: '700',
  },
  supportButton: {
    paddingVertical: verticalScale(8),
  },
  supportText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: moderateFontScale(14),
  },
  supportHighlight: {
    color: '#F5C518',
    fontWeight: '700',
  },
});
