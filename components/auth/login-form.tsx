import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Text } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';

interface LoginFormProps {
  onLogin: (phone: string, pass: string) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});

  const handleLoginSubmit = () => {
    const nextErrors: { phone?: string; password?: string } = {};
    if (!phone) {
      nextErrors.phone = 'Phone number is required';
    } else if (phone.length < 10) {
      nextErrors.phone = 'Enter a valid phone number';
    }
    if (!password) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onLogin(phone, password);
    }
  };

  return (
    <View style={styles.card}>
      <ThemedText style={styles.cardTitle}>Welcome Back</ThemedText>

      {/* Phone Field */}
      <View style={styles.fieldContainer}>
        <ThemedText style={styles.label}>Phone Number</ThemedText>
        <View style={[styles.inputWrapper, errors.phone && styles.inputWrapperError]}>
          <IconSymbol name="phone.fill" size={scale(18)} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="+1 (555) 000-0000"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(t) => {
              setPhone(t);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
          />
        </View>
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      </View>

      {/* Password Field */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <ThemedText style={styles.label}>Password</ThemedText>
          <TouchableOpacity onPress={() => console.log('Forgot Password pressed')}>
            <ThemedText style={styles.forgotText}>Forgot Password?</ThemedText>
          </TouchableOpacity>
        </View>
        <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
          <IconSymbol name="lock.fill" size={scale(18)} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="rgba(255,255,255,0.3)"
            secureTextEntry={secureText}
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
          />
          <TouchableOpacity onPress={() => setSecureText((prev) => !prev)} style={styles.eyeIconWrapper}>
            <IconSymbol
              name={secureText ? 'eye.slash.fill' : 'eye.fill'}
              size={scale(18)}
              color="rgba(255,255,255,0.6)"
            />
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>

      {/* Login Button */}
      <TouchableOpacity style={styles.loginButton} onPress={handleLoginSubmit} activeOpacity={0.9}>
        <View style={styles.buttonRow}>
          <Text style={styles.loginButtonText}>Login</Text>
          <IconSymbol name="chevron.right" size={scale(18)} color="#101010" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(26, 26, 32, 0.85)',
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: scale(22),
    width: '92%',
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: moderateFontScale(18),
    fontWeight: '700',
    marginBottom: verticalScale(16),
  },
  fieldContainer: {
    marginBottom: verticalScale(16),
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: moderateFontScale(13),
    fontWeight: '500',
    marginBottom: verticalScale(6),
  },
  forgotText: {
    color: '#F5C518',
    fontSize: moderateFontScale(13),
    fontWeight: '600',
    marginBottom: verticalScale(6),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    height: verticalScale(48),
  },
  inputWrapperError: {
    borderColor: '#F0555F',
  },
  inputIcon: {
    marginRight: scale(10),
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: moderateFontScale(15),
    height: '100%',
    padding: 0,
  },
  eyeIconWrapper: {
    padding: scale(6),
    marginLeft: scale(8),
  },
  errorText: {
    color: '#F0555F',
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(4),
  },
  loginButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(12),
    height: verticalScale(48),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  loginButtonText: {
    color: '#101010',
    fontSize: moderateFontScale(16),
    fontWeight: '700',
  },
});
