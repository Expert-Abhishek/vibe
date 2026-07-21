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
  Modal,
  FlatList,
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
  
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [walletBalance, setWalletBalance] = useState(1500);
  const walletHistory = [
    { id: '1', type: 'incoming', amount: 500, date: '18 July 2026', title: 'Refund' },
    { id: '2', type: 'outgoing', amount: 200, date: '15 July 2026', title: 'Cab Booking' },
  ];
  const [appLang, setAppLang] = useState<'en' | 'kn'>('en');

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

  // Kannada Translations Mapping
  const trans = {
    en: {
      profileRole: 'Vibzz Premium Member',
      accountInfo: 'Account Information',
      fullName: 'Full Name',
      updateBtn: 'Update',
      changePass: 'Change Password',
      currentPass: 'Current Password',
      newPass: 'New Password',
      changePassBtn: 'Change Password',
      pref: 'Preferences',
      darkTheme: 'Dark Theme',
      darkActive: 'Dark mode active',
      darkInactive: 'Light mode active',
      langTitle: 'Kannada Language',
      langActive: 'ಕನ್ನಡ ಸಕ್ರಿಯವಾಗಿದೆ',
      langInactive: 'English is active',
      switchDriver: 'Switch to Driver Portal',
      switchGuide: 'Switch to Guide Portal',
      logout: 'Logout',
    },
    kn: {
      profileRole: 'ವಿಬ್ಜ್ ಪ್ರೀಮಿಯಂ ಸದಸ್ಯರು',
      accountInfo: 'ಖಾತೆಯ ಮಾಹಿತಿ',
      fullName: 'ಪೂರ್ಣ ಹೆಸರು',
      updateBtn: 'ನವೀಕರಿಸಿ',
      changePass: 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ',
      currentPass: 'ಪ್ರಸ್ತುತ ಪಾಸ್‌ವರ್ಡ್',
      newPass: 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್',
      changePassBtn: 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ',
      pref: 'ಆದ್ಯತೆಗಳು',
      darkTheme: 'ಡಾರ್ಕ್ ಥೀಮ್',
      darkActive: 'ಡಾರ್ಕ್ ಮೋಡ್ ಸಕ್ರಿಯವಾಗಿದೆ',
      darkInactive: 'ಲೈಟ್ ಮೋಡ್ ಸಕ್ರಿಯವಾಗಿದೆ',
      langTitle: 'ಕನ್ನಡ ಭಾಷೆ',
      langActive: 'ಕನ್ನಡ ಸಕ್ರಿಯವಾಗಿದೆ',
      langInactive: 'ಇಂಗ್ಲಿಷ್ ಸಕ್ರಿಯವಾಗಿದೆ',
      switchDriver: 'ಡ್ರೈವರ್ ಪೋರ್ಟಲ್‌ಗೆ ಬದಲಾಯಿಸಿ',
      switchGuide: 'ಗೈಡ್ ಪೋರ್ಟಲ್‌ಗೆ ಬದಲಾಯಿಸಿ',
      logout: 'ಲಾಗ್ ಔಟ್',
    }
  }[appLang];

  const handleUpdateName = () => {
    if (!name.trim()) {
      Alert.alert(appLang === 'kn' ? 'ದೋಷ' : 'Error', appLang === 'kn' ? 'ಹೆಸರು ಖಾಲಿ ಇರಬಾರದು' : 'Name cannot be empty');
      return;
    }
    Alert.alert(
      appLang === 'kn' ? 'ಪ್ರೊಫೈಲ್ ನವೀಕರಿಸಲಾಗಿದೆ' : 'Profile Updated', 
      appLang === 'kn' ? `ನಿಮ್ಮ ಹೆಸರನ್ನು "${name}" ಗೆ ನವೀಕರಿಸಲಾಗಿದೆ.` : `Your name has been updated to "${name}".`
    );
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert(
        appLang === 'kn' ? 'ದೋಷ' : 'Error', 
        appLang === 'kn' ? 'ಪ್ರಸ್ತುತ ಮತ್ತು ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಎರಡನ್ನೂ ನಮೂದಿಸಿ' : 'Please fill in both current and new password fields'
      );
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(
        appLang === 'kn' ? 'ದೋಷ' : 'Error', 
        appLang === 'kn' ? 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ಕನಿಷ್ಠ 6 ಅಕ್ಷರಗಳಿರಬೇಕು' : 'New password must be at least 6 characters'
      );
      return;
    }
    Alert.alert(
      appLang === 'kn' ? 'ಯಶಸ್ವಿಯಾಗಿದೆ' : 'Success', 
      appLang === 'kn' ? 'ನಿಮ್ಮ ಪಾಸ್‌ವರ್ಡ್ ಯಶಸ್ವಿಯಾಗಿ ಬದಲಾಗಿದೆ.' : 'Your password has been changed successfully.'
    );
    setCurrentPassword('');
    setNewPassword('');
  };

  const handleLogout = () => {
    Alert.alert(
      appLang === 'kn' ? 'ಲಾಗ್ ಔಟ್' : 'Logout', 
      appLang === 'kn' ? 'ವಿಬ್ಜ್‌ನಿಂದ ಲಾಗ್ ಔಟ್ ಮಾಡಲು ನೀವು ಖಚಿತವಾಗಿ ಬಯಸುವಿರಾ?' : 'Are you sure you want to log out of Vibzz?', 
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: appLang === 'kn' ? 'ಲಾಗ್ ಔಟ್' : 'Logout',
          style: 'destructive',
          onPress: () => router.replace('/(auth)/sign-in'),
        },
      ]
    );
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
          <Text style={[styles.profileRole, { color: colors.textMuted }]}>{trans.profileRole}</Text>
        </View>

        {/* ACCOUNT INFORMATION SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.amber }]}>{trans.accountInfo}</Text>

          {/* Full Name */}
          <Text style={[styles.label, { color: colors.textPrimary }]}>{trans.fullName}</Text>
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
              <Text style={styles.smallBtnText}>{trans.updateBtn}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line }]} />

          {/* Password Change */}
          <Text style={[styles.cardSubTitle, { color: colors.textPrimary }]}>{trans.changePass}</Text>
          
          <Text style={[styles.label, { color: colors.textPrimary }]}>{trans.currentPass}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.label, { color: colors.textPrimary, marginTop: verticalScale(12) }]}>{trans.newPass}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.amber, marginTop: verticalScale(16) }]} onPress={handleChangePassword}>
            <Text style={styles.primaryButtonText}>{trans.changePassBtn}</Text>
          </TouchableOpacity>
        </View>

        {/* WALLET SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.amber }]}>Wallet Balance & Payments</Text>
          <View style={{ marginBottom: verticalScale(16) }}>
            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Available Balance</Text>
            <Text style={{ color: colors.amber, fontSize: moderateFontScale(26), fontWeight: 'bold' }}>₹{walletBalance}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: scale(10) }}>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1, backgroundColor: colors.amber, marginTop: 0 }]}
              onPress={() => {
                Alert.prompt(
                  'Add Money via Razorpay',
                  'Enter amount to add to your Vibe Wallet (₹):',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Pay via Razorpay',
                      onPress: (val) => {
                        const amt = parseFloat(val || '0');
                        if (isNaN(amt) || amt <= 0) {
                          Alert.alert('Invalid Amount', 'Please enter a valid amount.');
                          return;
                        }
                        setWalletBalance(prev => prev + amt);
                        Alert.alert('Razorpay Payment Success!', `₹${amt} successfully added to your Vibe Wallet.`);
                      },
                    },
                  ],
                  'plain-text',
                  '500'
                );
              }}
            >
              <Text style={styles.primaryButtonText}>💳 Add Money (Razorpay)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 0, borderWidth: 1, borderColor: colors.line }]}
              onPress={() => setWalletModalVisible(true)}
            >
              <Text style={[styles.primaryButtonText, { color: colors.textPrimary }]}>📜 Wallet History</Text>
            </TouchableOpacity>
          </View>
        </View>



        {/* PREFERENCES SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.amber }]}>{trans.pref}</Text>
          
          {/* Dark Theme toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{trans.darkTheme}</Text>
              <Text style={[styles.toggleSubLabel, { color: colors.textMuted }]}>
                {isDark ? trans.darkActive : trans.darkInactive}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleAppTheme}
              trackColor={{ false: '#767577', true: colors.amber }}
              thumbColor={isDark ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line, marginVertical: verticalScale(10) }]} />

          {/* Kannada Language toggle switch */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{trans.langTitle}</Text>
              <Text style={[styles.toggleSubLabel, { color: colors.textMuted }]}>
                {appLang === 'kn' ? trans.langActive : trans.langInactive}
              </Text>
            </View>
            <Switch
              value={appLang === 'kn'}
              onValueChange={(val) => {
                setAppLang(val ? 'kn' : 'en');
                Alert.alert(
                  val ? 'ಭಾಷೆ ಬದಲಾಗಿದೆ' : 'Language Changed',
                  val ? 'ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.' : 'Language has been changed to English.'
                );
              }}
              trackColor={{ false: '#767577', true: colors.amber }}
              thumbColor={appLang === 'kn' ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* SWITCH PORTAL BUTTONS */}
        <TouchableOpacity 
          style={[styles.switchPortalBtn, { borderColor: colors.amber, backgroundColor: 'rgba(245,197,24,0.06)', borderWidth: 1.5, marginBottom: verticalScale(8) }]} 
          onPress={() => router.push('/driver-dashboard')}
        >
          <MaterialIcons name="directions-car" size={scale(20)} color={colors.amber} style={{ marginRight: scale(8) }} />
          <Text style={[styles.switchPortalText, { color: colors.amber }]}>{trans.switchDriver}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.switchPortalBtn, { borderColor: colors.amber, backgroundColor: 'rgba(245,197,24,0.06)', borderWidth: 1.5, marginTop: 0 }]} 
          onPress={() => router.push('/guide-dashboard')}
        >
          <MaterialIcons name="explore" size={scale(20)} color={colors.amber} style={{ marginRight: scale(8) }} />
          <Text style={[styles.switchPortalText, { color: colors.amber }]}>{trans.switchGuide}</Text>
        </TouchableOpacity>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.danger }]} onPress={handleLogout}>
          <MaterialIcons name="exit-to-app" size={scale(20)} color={colors.danger} style={{ marginRight: scale(8) }} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>{trans.logout}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Wallet History Bottom Drawer */}
      <Modal visible={walletModalVisible} animationType="slide" transparent={true} onRequestClose={() => setWalletModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, height: '60%', borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(20) }}>
              <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(18), fontWeight: 'bold' }}>Wallet History</Text>
              <TouchableOpacity onPress={() => setWalletModalVisible(false)}>
                <MaterialIcons name="close" size={scale(24)} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={walletHistory}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: colors.line }}>
                  <View>
                    <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(14) }}>{item.title}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>{item.date}</Text>
                  </View>
                  <Text style={{ color: item.type === 'incoming' ? '#10B981' : colors.textPrimary, fontSize: moderateFontScale(14), fontWeight: 'bold' }}>
                    {item.type === 'incoming' ? '+' : '-'}₹{item.amount}
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
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
