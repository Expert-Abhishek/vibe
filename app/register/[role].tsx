import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
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
  const scrollViewRef = useRef<ScrollView>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Role specific fields
  const [vehicleType, setVehicleType] = useState('5seater');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseId, setLicenseId] = useState('');

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const scrollToInput = (yOffset: number) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 100);
  };

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
      vehicle_type: role === 'driver' ? vehicleType : undefined,
      vehicle_model: role === 'driver' ? (vehicleModel.trim() || 'Standard Cab') : undefined,
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#ffffff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        showsVerticalScrollIndicator={false}
      >
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
            onFocus={() => scrollToInput(50)}
          />
          <TextInput
            style={styles.input}
            placeholder="Email Address (Optional)"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            onFocus={() => scrollToInput(110)}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number (10 digits)"
            keyboardType="phone-pad"
            maxLength={10}
            placeholderTextColor="#aaa"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))}
            onFocus={() => scrollToInput(170)}
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
              onFocus={() => scrollToInput(230)}
            />
          )}

          {/* Password Input with Eye Icon */}
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password (min 6 chars)"
              secureTextEntry={!showPassword}
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              onFocus={() => scrollToInput(290)}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={22}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Conditional Role Inputs */}

          {role === 'driver' && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0d1b3e', marginBottom: 8 }}>
                Vehicle Category / Type *
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {[
                  { id: '5seater', label: '5 Seater' },
                  { id: '7seater', label: '7 Seater' },
                  { id: '4x4jeep', label: '4x4 Jeep' },
                  { id: 'auto', label: 'Auto' },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: vehicleType === cat.id ? '#0d1b3e' : '#e0e0e0',
                      backgroundColor: vehicleType === cat.id ? '#0d1b3e' : '#f5f5f5',
                    }}
                    onPress={() => setVehicleType(cat.id)}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: vehicleType === cat.id ? '#ffffff' : '#444444',
                      }}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Vehicle Model (e.g. Swift Dzire, Innova, Thar)"
                placeholderTextColor="#aaa"
                value={vehicleModel}
                onChangeText={setVehicleModel}
                onFocus={() => scrollToInput(360)}
              />

              <TextInput
                style={styles.input}
                placeholder="Vehicle Number (e.g. KA-03-MY-7788)"
                placeholderTextColor="#aaa"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
                autoCapitalize="characters"
                onFocus={() => scrollToInput(420)}
              />
            </View>
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
    </KeyboardAvoidingView>
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
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeBtn: {
    padding: 8,
  },
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