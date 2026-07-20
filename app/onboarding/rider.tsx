import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerUser } from '@/constants/api';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';

// ---- Design tokens --------------------------------------------------------
const colors = {
  ink: '#101014',
  surface: '#1A1A20',
  surfaceAlt: '#212129',
  line: '#2C2C34',
  amber: '#F5C518',
  danger: '#F0555F',
  success: '#10B981',
  textPrimary: '#F5F4F0',
  textMuted: '#8D8D97',
  textFaint: '#5C5C66',
};

export default function RiderRegister() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [errors, setErrors] = useState<{ name?: string; phone?: string; password?: string; api?: string }>({});

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    }
  };

  const handleSubmit = async () => {
    const nextErrors: { name?: string; phone?: string; password?: string } = {};

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (!name.trim()) {
      nextErrors.name = 'Enter your name';
    }

    if (!cleanPhone) {
      nextErrors.phone = 'Enter phone number';
    } else if (cleanPhone.length !== 10) {
      nextErrors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!password) {
      nextErrors.password = 'Enter a password';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);

    try {
      const res = await registerUser({
        name: name.trim(),
        phone: cleanPhone,
        password: password,
        role: 'tourist',
      });

      setLoading(false);

      if (res.success) {
        showToast('Successfully registered', 'success');
        setTimeout(() => {
          router.replace('/(auth)/sign-in');
        }, 1500);
      } else {
        const errorMsg = res.message || 'Registration failed. Please try again.';
        setErrors({ api: errorMsg });
        showToast(errorMsg, 'error');
      }
    } catch (err: any) {
      setLoading(false);
      const errorMsg = err?.message || 'Server error. Please try again.';
      setErrors({ api: errorMsg });
      showToast(errorMsg, 'error');
    }
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      {toastMessage && (
        <View style={[styles.toastBanner, toastType === 'error' ? styles.toastError : styles.toastSuccess]}>
          <Text style={styles.toastBannerText}>{toastMessage}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: scale(24), flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">

        <Text style={styles.eyebrow}>RIDER PROFILE</Text>
        <Text style={styles.title}>Welcome aboard</Text>
        <Text style={styles.subtitle}>Create your profile to start booking rides</Text>

        {/* Route strip — pickup to destination */}
        <View style={styles.routeStrip}>
          <View style={styles.routeCol}>
            <View style={styles.routeDotFilled} />
            <Text style={styles.routeLabel}>Pickup</Text>
          </View>
          <View style={styles.routeDashRow}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={styles.routeDash} />
            ))}
          </View>
          <View style={styles.routeCol}>
            <View style={styles.routePin} />
            <Text style={styles.routeLabel}>Destination</Text>
          </View>
        </View>

        {/* Boarding-pass style card holding the profile fields */}
        <View style={styles.passCard}>
          <View style={styles.passNotchLeft} />
          <View style={styles.passNotchRight} />

          {/* Full Name */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Full name</Text>
            <View style={styles.requiredDot} />
          </View>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="As it appears on your ID"
            placeholderTextColor={colors.textFaint}
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
            }}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <View style={styles.passDivider} />

          {/* Phone Number */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Phone number (10 digits)</Text>
            <View style={styles.requiredDot} />
          </View>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            placeholder="9876543210"
            keyboardType="phone-pad"
            maxLength={10}
            placeholderTextColor={colors.textFaint}
            value={phone}
            onChangeText={(t) => {
              const cleaned = t.replace(/[^0-9]/g, '');
              setPhone(cleaned);
              if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
            }}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <View style={styles.passDivider} />

          {/* Password */}
          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.requiredDot} />
          </View>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Min. 6 characters"
            secureTextEntry
            placeholderTextColor={colors.textFaint}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
            }}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {errors.api && <Text style={[styles.errorText, { marginTop: verticalScale(10), textAlign: 'center' }]}>{errors.api}</Text>}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()} disabled={loading}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.primaryButtonText}>Get started</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.ink },

  toastBanner: {
    position: 'absolute',
    top: verticalScale(40),
    left: scale(20),
    right: scale(20),
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  toastSuccess: {
    backgroundColor: colors.success,
  },
  toastError: {
    backgroundColor: colors.danger,
  },
  toastBannerText: {
    color: '#FFFFFF',
    fontSize: moderateFontScale(14),
    fontWeight: '700',
    textAlign: 'center',
  },

  eyebrow: {
    color: colors.amber,
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: { fontSize: moderateFontScale(28), fontWeight: '800', color: colors.textPrimary, marginTop: verticalScale(6), marginBottom: verticalScale(4) },
  subtitle: { fontSize: moderateFontScale(14), color: colors.textMuted, marginBottom: verticalScale(28) },

  // Pickup → destination route strip
  routeStrip: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(24) },
  routeCol: { alignItems: 'center', width: scale(76) },
  routeDotFilled: {
    width: scale(12), height: scale(12), borderRadius: scale(6),
    backgroundColor: colors.amber,
  },
  routePin: {
    width: scale(12), height: scale(12), borderRadius: scale(6),
    borderWidth: 2, borderColor: colors.amber, backgroundColor: colors.ink,
  },
  routeLabel: { color: colors.textFaint, fontSize: moderateFontScale(10), fontWeight: '600', marginTop: verticalScale(6) },
  routeDashRow: {
    flexDirection: 'row', alignItems: 'center',
    flex: 1, justifyContent: 'space-between', marginHorizontal: scale(2),
  },
  routeDash: { width: scale(5), height: scale(2), borderRadius: scale(1), backgroundColor: colors.line },

  // Boarding-pass card
  passCard: {
    backgroundColor: colors.surface,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: colors.line,
    padding: scale(20),
    marginBottom: verticalScale(24),
  },
  passNotchLeft: {
    position: 'absolute', left: scale(-10), top: '50%', marginTop: scale(-10),
    width: scale(20), height: scale(20), borderRadius: scale(10), backgroundColor: colors.ink,
  },
  passNotchRight: {
    position: 'absolute', right: scale(-10), top: '50%', marginTop: scale(-10),
    width: scale(20), height: scale(20), borderRadius: scale(10), backgroundColor: colors.ink,
  },
  passDivider: {
    borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.line,
    marginVertical: verticalScale(16),
  },

  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(8) },
  label: { fontSize: moderateFontScale(13), fontWeight: '700', color: colors.textPrimary },
  requiredDot: { width: scale(4), height: scale(4), borderRadius: scale(2), backgroundColor: colors.amber, marginLeft: scale(6) },

  input: {
    backgroundColor: colors.surfaceAlt,
    padding: scale(15), borderRadius: scale(10),
    borderWidth: 1, borderColor: colors.line,
    fontSize: moderateFontScale(15), color: colors.textPrimary,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: moderateFontScale(12), marginTop: verticalScale(6) },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: verticalScale(26), gap: scale(12) },
  primaryButton: { flex: 1, backgroundColor: colors.amber, padding: scale(16), borderRadius: scale(12), alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.ink, fontSize: moderateFontScale(15), fontWeight: '800' },
  secondaryButton: {
    flex: 1, backgroundColor: 'transparent', padding: scale(16), borderRadius: scale(12),
    alignItems: 'center', borderWidth: 1.5, borderColor: colors.line,
  },
  secondaryButtonText: { color: colors.textPrimary, fontSize: moderateFontScale(15), fontWeight: '700' },
});