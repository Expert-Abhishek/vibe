import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';

// ---- Design tokens --------------------------------------------------------
// Shared with the driver screen: dark instrument-panel surfaces, signal-amber
// accent. Here the signature motif is a "boarding pass" — a rider is booking
// a trip, not filing a permit, so the card reads like a ticket, not a form.
const colors = {
  ink: '#101014',
  surface: '#1A1A20',
  surfaceAlt: '#212129',
  line: '#2C2C34',
  amber: '#F5C518',
  danger: '#F0555F',
  textPrimary: '#F5F4F0',
  textMuted: '#8D8D97',
  textFaint: '#5C5C66',
};

export default function RiderRegister() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const handleSubmit = () => {
    const nextErrors: { name?: string; phone?: string } = {};
    if (!name) nextErrors.name = 'Enter your name';
    if (!phone || phone.length < 10) nextErrors.phone = 'Enter a valid 10-digit number';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      console.log('Rider account created');
      router.replace('/(auth)/sign-in');
    }
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView contentContainerStyle={{ padding: scale(24), flexGrow: 1, justifyContent: 'center' }}>

        <Text style={styles.eyebrow}>RIDER PROFILE</Text>
        <Text style={styles.title}>Welcome aboard</Text>
        <Text style={styles.subtitle}>Create your profile to start booking rides</Text>

        {/* Route strip — pickup to destination, sets the "booking a ride" tone */}
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

          <View style={styles.labelRow}>
            <Text style={styles.label}>Full name</Text>
            <View style={styles.requiredDot} />
          </View>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="As it appears on your ID"
            placeholderTextColor={colors.textFaint}
            value={name}
            onChangeText={setName}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <View style={styles.passDivider} />

          <View style={styles.labelRow}>
            <Text style={styles.label}>Phone number</Text>
            <View style={styles.requiredDot} />
          </View>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            placeholder="9876543210"
            keyboardType="phone-pad"
            placeholderTextColor={colors.textFaint}
            value={phone}
            onChangeText={setPhone}
          />
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
            <Text style={styles.primaryButtonText}>Get started</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.ink },

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
  primaryButtonText: { color: colors.ink, fontSize: moderateFontScale(15), fontWeight: '800' },
  secondaryButton: {
    flex: 1, backgroundColor: 'transparent', padding: scale(16), borderRadius: scale(12),
    alignItems: 'center', borderWidth: 1.5, borderColor: colors.line,
  },
  secondaryButtonText: { color: colors.textPrimary, fontSize: moderateFontScale(15), fontWeight: '700' },
});