import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RegisterScreen() {
  // Yeh URL se 'rider', 'driver' ya 'guide' utha lega
  const { role } = useLocalSearchParams<{ role: 'rider' | 'driver' | 'guide' }>();
  const router = useRouter();

  // Role ke hisaab se Heading set karne ke liye
  const getTitle = () => {
    if (role === 'rider') return 'Sign Up as Rider';
    if (role === 'driver') return 'Sign Up as Driver';
    if (role === 'guide') return 'Sign Up as Guide';
    return 'Sign Up';
  };

  const handleRegister = () => {
    // Yahan aapka registration logic aayega (API call)
    console.log(`Registering as ${role}`);
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.subtitle}>Please fill the details to continue</Text>

      {/* Inputs */}
      <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#aaa" />
      <TextInput style={styles.input} placeholder="Email Address" keyboardType="email-address" placeholderTextColor="#aaa" />
      <TextInput style={styles.input} placeholder="Phone Number" keyboardType="phone-pad" placeholderTextColor="#aaa" />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry placeholderTextColor="#aaa" />

      {/* Agar Driver ya Guide hai toh unke liye extra inputs yahan conditional laga sakte hain */}
      {role === 'driver' && (
        <TextInput style={styles.input} placeholder="Vehicle Number (DL XX XX XXXX)" placeholderTextColor="#aaa" />
      )}
      {role === 'guide' && (
        <TextInput style={styles.input} placeholder="License / Certification ID" placeholderTextColor="#aaa" />
      )}

      {/* Submit Button */}
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      {/* Back Button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0d1b3e', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32 },
  input: { backgroundColor: '#f5f5f5', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16, color: '#333' },
  button: { backgroundColor: '#0d1b3e', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 24, alignItems: 'center' },
  backText: { color: '#666', fontSize: 14 }
});