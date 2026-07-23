import { fetchWalletBalanceApi, topupWalletApi, submitWithdrawalApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { openRazorpayPayment } from '@/constants/razorpay';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { toggleAppTheme, useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('Abhishek');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(1500);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);

  const session = getUserSessionSync();
  const userId = session?.id || 'c1';

  React.useEffect(() => {
    async function loadWalletData() {
      const data = await fetchWalletBalanceApi(userId);
      if (data.success) {
        if (data.balance !== undefined) setWalletBalance(data.balance);
        if (data.transactions) setWalletTransactions(data.transactions);
      }
    }
    loadWalletData();
  }, [userId]);

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
      logout: 'ನಿರ್ಗಮಿಸಿ',
    },
  }[appLang];

  const handleUpdateName = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    Alert.alert('Success', 'Profile updated successfully.');
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }
    Alert.alert('Success', 'Password changed successfully.');
    setCurrentPassword('');
    setNewPassword('');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => router.replace('/(auth)/sign-in') },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.amber }]}>
            <Text style={styles.avatarText}>{name ? name[0].toUpperCase() : 'U'}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{name}</Text>
          <Text style={[styles.userRole, { color: colors.textMuted }]}>{trans.profileRole}</Text>
        </View>

        {/* ACCOUNT INFORMATION SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.amber }]}>{trans.accountInfo}</Text>

          <Text style={[styles.label, { color: colors.textPrimary }]}>{trans.fullName}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter full name"
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.amber }]} onPress={handleUpdateName}>
            <Text style={styles.primaryButtonText}>{trans.updateBtn}</Text>
          </TouchableOpacity>
        </View>

        {/* SECURITY / CHANGE PASSWORD SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.amber }]}>{trans.changePass}</Text>

          <Text style={[styles.label, { color: colors.textPrimary }]}>{trans.currentPass}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>{trans.newPass}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.amber }]}
            onPress={handleChangePassword}
          >
            <Text style={[styles.primaryButtonText, { color: colors.amber }]}>{trans.changePassBtn}</Text>
          </TouchableOpacity>
        </View>

        {/* WALLET CARD SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.amber }]}>💳 Vibe Wallet</Text>
          <View style={{ marginBottom: verticalScale(14) }}>
            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Available Balance</Text>
            <Text style={{ color: colors.amber, fontSize: moderateFontScale(26), fontWeight: 'bold' }}>₹{walletBalance}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: scale(10) }}>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1, backgroundColor: colors.amber, marginTop: 0 }]}
              onPress={() => {
                openRazorpayPayment({
                  amount: 500,
                  title: 'Vibe Wallet Recharge (₹500)',
                  customerName: name || 'Abhishek',
                  userId,
                  onSuccess: async (paymentId) => {
                    setWalletBalance(prev => prev + 500);
                    await topupWalletApi({ userId, amount: 500, paymentId, description: 'Vibe Wallet Top-Up via Razorpay' });
                    Alert.alert('🎉 Top-Up Successful!', `₹500 added to your Vibe Wallet via Razorpay.\nTransaction ID: ${paymentId}`);
                  },
                  onCancel: () => {
                    Alert.alert('Cancelled', 'Razorpay payment was cancelled.');
                  },
                  onError: (err: any) => {
                    const msg = typeof err === 'string' ? err : (err?.message || 'Razorpay Gateway error.');
                    Alert.alert('Payment Error', msg);
                  }
                });
              }}
            >
              <Text style={styles.primaryButtonText}>💳 Add Money</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 0, borderWidth: 1, borderColor: colors.line }]}
              onPress={() => setWalletModalVisible(true)}
            >
              <Text style={[styles.primaryButtonText, { color: colors.textPrimary }]}>📜 History</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: 'rgba(255,255,255,0.06)', marginTop: verticalScale(10), borderWidth: 1, borderColor: colors.line }]}
            onPress={() => setWithdrawModalVisible(true)}
          >
            <Text style={[styles.primaryButtonText, { color: colors.textPrimary }]}>💸 Withdraw Funds</Text>
          </TouchableOpacity>
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
              data={walletTransactions}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              ListEmptyComponent={
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: verticalScale(30) }}>
                  No transactions yet
                </Text>
              }
              renderItem={({ item }) => {
                const isIncoming = item.type === 'topup' || item.type === 'refund';
                return (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: colors.line }}>
                    <View style={{ flex: 1, marginRight: scale(10) }}>
                      <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(14) }} numberOfLines={1}>
                        {item.description || (isIncoming ? 'Wallet Top-Up' : 'Debit')}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                      </Text>
                    </View>
                    <Text style={{ color: isIncoming ? '#10B981' : colors.textPrimary, fontSize: moderateFontScale(14), fontWeight: 'bold' }}>
                      {isIncoming ? '+' : '-'}₹{item.amount}
                    </Text>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Withdraw Funds Modal */}
      <Modal visible={withdrawModalVisible} animationType="slide" transparent={true} onRequestClose={() => setWithdrawModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) }}>
              <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(18), fontWeight: 'bold' }}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <MaterialIcons name="close" size={scale(24)} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginBottom: verticalScale(4) }}>Available: ₹{walletBalance}</Text>

            <Text style={[styles.label, { color: colors.textPrimary, marginTop: verticalScale(12) }]}>Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder="Enter amount"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textPrimary, marginTop: verticalScale(12) }]}>UPI ID</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
              value={withdrawUpi}
              onChangeText={setWithdrawUpi}
              placeholder="yourname@upi"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.amber, marginTop: verticalScale(20) }]}
              onPress={async () => {
                const amt = parseFloat(withdrawAmount);
                if (!amt || amt <= 0) {
                  Alert.alert('Error', 'Please enter a valid amount');
                  return;
                }
                if (amt > walletBalance) {
                  Alert.alert('Error', 'Withdrawal amount exceeds wallet balance');
                  return;
                }
                if (!withdrawUpi.trim()) {
                  Alert.alert('Error', 'Please enter your UPI ID');
                  return;
                }
                const res = await submitWithdrawalApi({ userId, userName: name, amount: amt, upiId: withdrawUpi });
                if (res.success) {
                  Alert.alert('Success', res.message || 'Withdrawal request submitted');
                  setWithdrawModalVisible(false);
                  setWithdrawAmount('');
                  setWithdrawUpi('');
                } else {
                  Alert.alert('Error', res.message || 'Withdrawal failed');
                }
              }}
            >
              <Text style={styles.primaryButtonText}>Submit Withdrawal Request</Text>
            </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
  },
  avatarText: {
    fontSize: moderateFontScale(32),
    fontWeight: 'bold',
    color: '#101014',
  },
  userName: {
    fontSize: moderateFontScale(22),
    fontWeight: 'bold',
    marginBottom: verticalScale(4),
  },
  userRole: {
    fontSize: moderateFontScale(14),
  },
  card: {
    padding: scale(16),
    borderRadius: scale(16),
    borderWidth: 1,
    marginBottom: verticalScale(20),
  },
  cardTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: 'bold',
    marginBottom: verticalScale(16),
  },
  label: {
    fontSize: moderateFontScale(13),
    fontWeight: '600',
    marginBottom: verticalScale(6),
  },
  input: {
    height: verticalScale(44),
    borderRadius: scale(10),
    borderWidth: 1,
    paddingHorizontal: scale(12),
    fontSize: moderateFontScale(14),
    marginBottom: verticalScale(14),
  },
  primaryButton: {
    height: verticalScale(44),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(6),
  },
  primaryButtonText: {
    fontSize: moderateFontScale(14),
    fontWeight: 'bold',
    color: '#101014',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(4),
  },
  toggleLabel: {
    fontSize: moderateFontScale(14),
    fontWeight: '600',
  },
  toggleSubLabel: {
    fontSize: moderateFontScale(12),
    marginTop: verticalScale(2),
  },
  divider: {
    height: 1,
    width: '100%',
  },
  logoutBtn: {
    flexDirection: 'row',
    height: verticalScale(48),
    borderRadius: scale(12),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(30),
  },
  logoutText: {
    fontSize: moderateFontScale(15),
    fontWeight: 'bold',
  },
});
