import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme, toggleAppTheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('Abhishek');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1A1A20' : '#FFFFFF',
    surfaceAlt: isDark ? '#212129' : '#EFEFF4',
    line: isDark ? '#2C2C34' : '#E5E5EA',
    textPrimary: isDark ? '#F5F4F0' : '#1C1C1E',
    textMuted: isDark ? '#8D8D97' : '#8E8E93',
    amber: '#F5C518',
    danger: '#F0555F',
  };

  const handleUpdateName = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    Alert.alert('Profile Updated', `Your name has been updated to "${name}".`);
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in both current and new password fields');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    Alert.alert('Success', 'Your password has been changed successfully.');
    setCurrentPassword('');
    setNewPassword('');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out of Vibzz?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => router.replace('/(auth)/sign-in'),
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: verticalScale(110) }]} showsVerticalScrollIndicator={false}>
        
        {/* PROFILE HEADER */}
        <View style={styles.header}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.amber }]}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.profileName, { color: colors.textPrimary }]}>{name}</Text>
          <Text style={[styles.profileRole, { color: colors.textMuted }]}>Vibzz Premium Member</Text>
        </View>

        {/* ACCOUNT INFORMATION SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.amber }]}>Account Information</Text>

          {/* Full Name */}
          <Text style={[styles.label, { color: colors.textPrimary }]}>Full Name</Text>
          <View style={styles.inlineRow}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.line,
                  color: colors.textPrimary,
                  flex: 1,
                  marginRight: scale(10),
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.amber }]} onPress={handleUpdateName}>
              <Text style={styles.smallBtnText}>Update</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          {/* Password Change */}
          <Text style={[styles.cardSubTitle, { color: colors.textPrimary }]}>Change Password</Text>
          
          <Text style={[styles.label, { color: colors.textPrimary }]}>Current Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.label, { color: colors.textPrimary, marginTop: verticalScale(12) }]}>New Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.amber, marginTop: verticalScale(16) }]} onPress={handleChangePassword}>
            <Text style={styles.primaryButtonText}>Change Password</Text>
          </TouchableOpacity>
        </View>

        {/* PREFERENCES SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.amber }]}>Preferences</Text>
          
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Dark Theme</Text>
              <Text style={[styles.toggleSubLabel, { color: colors.textMuted }]}>
                {isDark ? 'Dark mode active' : 'Light mode active'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleAppTheme}
              trackColor={{ false: '#767577', true: colors.amber }}
              thumbColor={isDark ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* SWITCH PORTAL BUTTON */}
        <TouchableOpacity 
          style={[styles.switchPortalBtn, { borderColor: colors.amber, backgroundColor: 'rgba(245,197,24,0.06)', borderWidth: 1.5 }]} 
          onPress={() => router.push('/guide-dashboard')}
        >
          <MaterialIcons name="explore" size={scale(20)} color={colors.amber} style={{ marginRight: scale(8) }} />
          <Text style={[styles.switchPortalText, { color: colors.amber }]}>Switch to Guide Portal</Text>
        </TouchableOpacity>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.danger }]} onPress={handleLogout}>
          <MaterialIcons name="exit-to-app" size={scale(20)} color={colors.danger} style={{ marginRight: scale(8) }} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(20),
  },
  header: {
    alignItems: 'center',
    marginTop: verticalScale(10),
    marginBottom: verticalScale(24),
  },
  avatarCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: '#101014',
    fontSize: moderateFontScale(34),
    fontWeight: '800',
  },
  profileName: {
    fontSize: moderateFontScale(22),
    fontWeight: '800',
    marginTop: verticalScale(12),
  },
  profileRole: {
    fontSize: moderateFontScale(13),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  card: {
    borderRadius: scale(20),
    borderWidth: 1,
    padding: scale(18),
    marginBottom: verticalScale(18),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    marginBottom: verticalScale(14),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardSubTitle: {
    fontSize: moderateFontScale(15),
    fontWeight: '700',
    marginBottom: verticalScale(12),
  },
  label: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    marginBottom: verticalScale(6),
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: scale(10),
    borderWidth: 1,
    fontSize: moderateFontScale(14),
  },
  smallBtn: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(11),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallBtnText: {
    color: '#101014',
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  primaryButton: {
    paddingVertical: verticalScale(12),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#101014',
    fontSize: moderateFontScale(14),
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: verticalScale(16),
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: moderateFontScale(15),
    fontWeight: '700',
  },
  toggleSubLabel: {
    fontSize: moderateFontScale(12),
    marginTop: verticalScale(2),
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    marginTop: verticalScale(8),
    backgroundColor: 'transparent',
  },
  logoutText: {
    fontSize: moderateFontScale(15),
    fontWeight: '700',
  },
  switchPortalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(12),
    paddingVertical: verticalScale(14),
    marginTop: verticalScale(14),
    marginBottom: verticalScale(6),
  },
  switchPortalText: {
    fontSize: moderateFontScale(15),
    fontWeight: '700',
  },
});
