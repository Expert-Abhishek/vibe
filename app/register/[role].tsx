import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { registerUser } from '@/constants/api';

export default function RegisterScreen() {
  const { role } = useLocalSearchParams<{ role: 'rider' | 'driver' | 'guide' }>();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Role specific fields
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseId, setLicenseId] = useState('');

  const [loading, setLoading] = useState(false);

  const getTitle = () => {
    if (role === 'rider') return 'Sign Up as Rider';
    if (role === 'driver') return 'Sign Up as Driver';
    if (role === 'guide') return 'Sign Up as Guide';
    return 'Sign Up';
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert('Required', 'Please enter a valid 10-digit phone number.');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Required', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const mappedRole = role === 'rider' ? 'tourist' : role === 'guide' ? 'guide' : 'driver';

    const res = await registerUser({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      password: password,
      role: mappedRole,
      vehicle_number: role === 'driver' ? vehicleNumber : undefined,
      license_id: role === 'guide' ? licenseId : undefined,
    });

    setLoading(false);

    if (res.success) {
      Alert.alert(
        'Registration Successful! 🎉',
        res.message || 'Your account has been created.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/sign-in'),
          },
        ]
      );
    } else {
      Alert.alert('Registration Failed', res.message || 'Something went wrong.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <Text style={styles.title}>{getTitle()}</Text>
        <Text style={styles.subtitle}>Please fill the details to continue</Text>

        {/* Inputs */}
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address (Optional)"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number (10 digits)"
          keyboardType="phone-pad"
          placeholderTextColor="#aaa"
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 chars)"
          secureTextEntry
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
        />

        {/* Conditional Role Inputs */}
        {role === 'driver' && (
          <TextInput
            style={styles.input}
            placeholder="Vehicle Number (e.g. KA-03-MY-7788)"
            placeholderTextColor="#aaa"
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            autoCapitalize="characters"
          />
        )}
        {role === 'guide' && (
          <TextInput
            style={styles.input}
            placeholder="License / Certification ID"
            placeholderTextColor="#aaa"
            value={licenseId}
            onChangeText={setLicenseId}
          />
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={loading}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0d1b3e', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32 },
  input: { backgroundColor: '#f5f5f5', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16, color: '#333' },
  button: { backgroundColor: '#0d1b3e', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 24, alignItems: 'center' },
  backText: { color: '#666', fontSize: 14 },
});