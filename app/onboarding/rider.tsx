import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

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
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>

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

        <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>Get started</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.ink },

  eyebrow: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginTop: 6, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 28 },

  // Pickup → destination route strip
  routeStrip: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  routeCol: { alignItems: 'center', width: 76 },
  routeDotFilled: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.amber,
  },
  routePin: {
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: colors.amber, backgroundColor: colors.ink,
  },
  routeLabel: { color: colors.textFaint, fontSize: 10, fontWeight: '600', marginTop: 6 },
  routeDashRow: {
    flexDirection: 'row', alignItems: 'center',
    flex: 1, justifyContent: 'space-between', marginHorizontal: 2,
  },
  routeDash: { width: 5, height: 2, borderRadius: 1, backgroundColor: colors.line },

  // Boarding-pass card
  passCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    marginBottom: 24,
  },
  passNotchLeft: {
    position: 'absolute', left: -10, top: '50%', marginTop: -10,
    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink,
  },
  passNotchRight: {
    position: 'absolute', right: -10, top: '50%', marginTop: -10,
    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink,
  },
  passDivider: {
    borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.line,
    marginVertical: 16,
  },

  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  requiredDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.amber, marginLeft: 6 },

  input: {
    backgroundColor: colors.surfaceAlt,
    padding: 15, borderRadius: 10,
    borderWidth: 1, borderColor: colors.line,
    fontSize: 15, color: colors.textPrimary,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 6 },

  primaryButton: { backgroundColor: colors.amber, padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: colors.ink, fontSize: 15, fontWeight: '800' },
});