import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
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
import { registerUser } from '@/constants/api';

export default function RegisterScreen() {
  const { role } = useLocalSearchParams<{ role: 'rider' | 'driver' | 'guide' }>();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [password, setPassword] = useState('');

  // Role specific fields
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseId, setLicenseId] = useState('');

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    }
  };

  const getTitle = () => {
    if (role === 'rider') return 'Sign Up as Rider';
    if (role === 'driver') return 'Sign Up as Driver';
    if (role === 'guide') return 'Sign Up as Guide';
    return 'Sign Up';
  };

  const handleRegister = async () => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const cleanAltPhone = altPhone.replace(/[^0-9]/g, '');

    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!cleanPhone || cleanPhone.length !== 10) {
      Alert.alert('Invalid Phone', 'Phone number must be exactly 10 digits.');
      return;
    }
    if ((role === 'driver' || role === 'guide') && (!cleanAltPhone || cleanAltPhone.length !== 10)) {
      Alert.alert('Required', 'Alternate phone number is mandatory for Drivers and Guides (10 digits).');
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
      phone: cleanPhone,
      alternate_phone: cleanAltPhone || undefined,
      email: email.trim() || undefined,
      password: password,
      role: mappedRole,
      vehicle_number: role === 'driver' ? vehicleNumber : undefined,
      license_id: role === 'guide' ? licenseId : undefined,
    });


    setLoading(false);

    if (res.success) {
      showToast('Successfully registered');
      setTimeout(() => {
        router.replace('/(auth)/sign-in');
      }, 1500);
    } else {
      Alert.alert('Registration Failed', res.message || 'Something went wrong.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      {toastMessage && (
        <View style={styles.toastBanner}>
          <MaterialIcons name="check-circle" size={24} color="#101014" style={{ marginRight: 8 }} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

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
          maxLength={10}
          placeholderTextColor="#aaa"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))}
        />
        {(role === 'driver' || role === 'guide') && (
          <TextInput
            style={styles.input}
            placeholder="Alternate Phone Number (10 digits) *"
            keyboardType="phone-pad"
            maxLength={10}
            placeholderTextColor="#aaa"
            value={altPhone}
            onChangeText={(t) => setAltPhone(t.replace(/[^0-9]/g, ''))}
          />
        )}
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
  toastBanner: {
    backgroundColor: '#F5C518',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: '#101014',
    fontSize: 16,
    fontWeight: '800',
  },

});