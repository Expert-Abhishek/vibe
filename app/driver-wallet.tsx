import {
  fetchAdminPaymentSettingsApi,
  fetchUserProfileApi,
  fetchWalletBalanceApi,
  submitWalletTopupRequestApi,
  submitWithdrawalApi,
} from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DriverWalletScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('Partner');
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Top-Up state variables
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupStep, setTopupStep] = useState<1 | 2>(1);
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [screenshotBase64, setScreenshotBase64] = useState('');
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);
  const [initiatedAt, setInitiatedAt] = useState<Date | null>(null);

  const [adminUpiId, setAdminUpiId] = useState('vibe.pay@upi');
  const [adminQrCodeUrl, setAdminQrCodeUrl] = useState('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=vibe.pay@upi&pn=Vibe%20Platform');

  // Withdrawal state variables
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // History modal visibility
  const [walletModalVisible, setWalletModalVisible] = useState(false);

  const session = getUserSessionSync();
  const userId = session?.id || 'd1';

  const loadWalletData = async () => {
    setLoading(true);
    if (session?.name) setName(session.name);

    const userRes = await fetchUserProfileApi(userId);
    if (userRes && userRes.success && userRes.user) {
      if (userRes.user.name) setName(userRes.user.name);
      const profile = userRes.user.profile || {};
      const upi = profile.upiId || profile.upi_id || '';
      if (upi) setWithdrawUpi(upi);
    }

    const data = await fetchWalletBalanceApi(userId);
    if (data.success) {
      if (data.balance !== undefined) setWalletBalance(data.balance);
      if (data.transactions) setWalletTransactions(data.transactions);
    }

    const adminRes = await fetchAdminPaymentSettingsApi();
    if (adminRes && adminRes.success && adminRes.data) {
      if (adminRes.data.upi_id || adminRes.data.upiId) setAdminUpiId(adminRes.data.upi_id || adminRes.data.upiId);
      if (adminRes.data.qr_code_url || adminRes.data.qrCodeUrl) setAdminQrCodeUrl(adminRes.data.qr_code_url || adminRes.data.qrCodeUrl);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWalletData();
  }, [userId]);

  // Client-side countdown timer for Top-Up Screenshot uploads
  useEffect(() => {
    let interval: any = null;
    if (topupModalVisible && topupStep === 2 && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval!);
            setTimeout(() => {
              setTopupModalVisible(false);
              setTopupStep(1);
              setScreenshotBase64('');
              Alert.alert('Session Expired', 'The 5-minute window to upload your payment screenshot has expired. Please try again.');
            }, 0);
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [topupModalVisible, topupStep, timerSeconds]);

  const handlePickScreenshot = async () => {
    Alert.alert(
      'Payment Screenshot',
      'Upload proof of payment:',
      [
        {
          text: '📸 Take Photo (Camera)',
          onPress: async () => {
            const { granted } = await ImagePicker.requestCameraPermissionsAsync();
            if (!granted) {
              Alert.alert('Permission Denied', 'Camera access permission is required.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.5,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              const dataUrl = asset.base64 ? (asset.base64.startsWith('data:') ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`) : asset.uri;
              setScreenshotBase64(dataUrl);
            }
          },
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: async () => {
            const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!granted) {
              Alert.alert('Permission Denied', 'Gallery access permission is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.5,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              const dataUrl = asset.base64 ? (asset.base64.startsWith('data:') ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`) : asset.uri;
              setScreenshotBase64(dataUrl);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSubmitTopupProof = async () => {
    if (!screenshotBase64) {
      Alert.alert('Required', 'Please upload a screenshot proof of the payment.');
      return;
    }

    try {
      setIsSubmittingTopup(true);
      const payload = {
        userId,
        userName: name,
        role: 'driver',
        amount: parseFloat(topupAmount),
        screenshotUrl: screenshotBase64,
        initiatedAt: initiatedAt ? initiatedAt.toISOString() : new Date().toISOString(),
      };

      const res = await submitWalletTopupRequestApi(payload);

      if (res && res.success) {
        setTopupModalVisible(false);
        setTopupStep(1);
        setScreenshotBase64('');
        setTopupAmount('');
        Alert.alert('🎉 Submitted!', 'Your top-up request was submitted. Admin will verify and credit your wallet.');
        loadWalletData();
      } else {
        Alert.alert('Submission Failed', res?.message || 'Could not submit your top-up request.');
      }
    } catch (e: any) {
      Alert.alert('Submission Error', e?.message || 'A network error occurred.');
    } finally {
      setIsSubmittingTopup(false);
    }
  };

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity style={{ marginRight: scale(8) }} onPress={() => router.replace('/driver-dashboard' as any)}>
            <MaterialIcons name="arrow-back" size={scale(22)} color={colors.textPrimary} />
          </TouchableOpacity>
          <MaterialIcons name="directions-car" size={scale(24)} color={colors.amber} style={{ marginRight: scale(8) }} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Driver Wallet</Text>
        </View>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>Manage your balance, payouts and deposits</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.amber} />
          <Text style={{ color: colors.textMuted, marginTop: 10 }}>Loading Wallet...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* WALLET CARD SECTION */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), marginBottom: verticalScale(10) }}>
              <MaterialIcons name="account-balance-wallet" size={scale(18)} color={colors.amber} />
              <Text style={[styles.cardTitle, { color: colors.amber }]}>Vibe Wallet</Text>
            </View>
            <View style={{ marginBottom: verticalScale(14) }}>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Available Balance</Text>
              <Text style={{ color: colors.amber, fontSize: moderateFontScale(26), fontWeight: 'bold' }}>₹{walletBalance}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: scale(10) }}>
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, backgroundColor: colors.amber, marginTop: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(4) }]}
                onPress={() => {
                  setTopupAmount('');
                  setTopupStep(1);
                  setScreenshotBase64('');
                  setTimerSeconds(300);
                  setTopupModalVisible(true);
                }}
              >
                <MaterialIcons name="add-circle-outline" size={scale(16)} color="#101014" />
                <Text style={styles.primaryButtonText}>Add Money</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 0, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(4) }]}
                onPress={() => setWalletModalVisible(true)}
              >
                <MaterialIcons name="history" size={scale(16)} color={colors.textPrimary} />
                <Text style={[styles.primaryButtonText, { color: colors.textPrimary }]}>History</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: 'rgba(255,255,255,0.06)', marginTop: verticalScale(10), borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(4) }]}
              onPress={() => setWithdrawModalVisible(true)}
            >
              <MaterialIcons name="payment" size={scale(16)} color={colors.textPrimary} />
              <Text style={[styles.primaryButtonText, { color: colors.textPrimary }]}>Withdraw Funds</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Wallet History Modal */}
      <Modal visible={walletModalVisible} animationType="slide" transparent={true} onRequestClose={() => setWalletModalVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setWalletModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: colors.surface, height: '60%', borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(20) }}
          >
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
                const isIncoming = item.type?.toLowerCase() === 'topup' || item.type?.toLowerCase() === 'refund';
                return (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: colors.line }}>
                    <View style={{ flex: 1, marginRight: scale(10) }}>
                      <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(14) }} numberOfLines={1}>
                        {item.description || (isIncoming ? 'Wallet Deposit' : 'Debit')}
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Wallet Add Money (Top-Up) Modal */}
      <Modal visible={topupModalVisible} animationType="slide" transparent={true} onRequestClose={() => setTopupModalVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setTopupModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(20), maxHeight: '90%' }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) }}>
              <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(18), fontWeight: 'bold' }}>
                {topupStep === 1 ? '💳 Add Money to Wallet' : '📲 Scan QR & Pay'}
              </Text>
              <TouchableOpacity onPress={() => setTopupModalVisible(false)}>
                <MaterialIcons name="close" size={scale(24)} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {topupStep === 1 ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginBottom: verticalScale(14) }}>
                  Enter the amount you wish to add. Minimim amount is ₹500.
                </Text>

                <Text style={[styles.label, { color: colors.textPrimary }]}>Amount (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
                  keyboardType="numeric"
                  value={topupAmount}
                  onChangeText={setTopupAmount}
                  placeholder="Minimum ₹500"
                  placeholderTextColor={colors.textMuted}
                />

                <View style={{ flexDirection: 'row', gap: scale(8), marginVertical: verticalScale(12) }}>
                  {[500, 1000, 2000, 5000].map(amt => (
                    <TouchableOpacity
                      key={amt}
                      style={{ flex: 1, paddingVertical: verticalScale(8), borderRadius: scale(8), backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line, alignItems: 'center' }}
                      onPress={() => setTopupAmount(amt.toString())}
                    >
                      <Text style={{ color: colors.amber, fontWeight: 'bold', fontSize: moderateFontScale(13) }}>₹{amt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.amber, marginTop: verticalScale(10) }]}
                  onPress={() => {
                    const amt = parseFloat(topupAmount);
                    if (!amt || amt < 500) {
                      Alert.alert('Minimum Amount Required', 'The minimum top-up amount is ₹500.');
                      return;
                    }
                    setInitiatedAt(new Date());
                    setTimerSeconds(300);
                    setTopupStep(2);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Proceed to Pay</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* 5-minute countdown timer header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: verticalScale(8), borderRadius: scale(8), marginBottom: verticalScale(16) }}>
                  <MaterialIcons name="alarm" size={scale(18)} color={colors.danger} style={{ marginRight: scale(6) }} />
                  <Text style={{ color: colors.danger, fontWeight: 'bold', fontSize: moderateFontScale(14) }}>
                    Upload screenshot in: {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                  </Text>
                </View>

                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), textAlign: 'center', marginBottom: verticalScale(12) }}>
                  Scan the QR code below using any UPI App (Google Pay, PhonePe, Paytm) to transfer ₹{topupAmount}.
                </Text>

                {/* Admin static payment QR Code */}
                <View style={{ alignSelf: 'center', padding: scale(10), backgroundColor: '#FFFFFF', borderRadius: scale(12), marginBottom: verticalScale(12) }}>
                  <Image source={{ uri: adminQrCodeUrl }} style={{ width: scale(180), height: scale(180) }} resizeMode="contain" />
                </View>

                {/* Admin static UPI ID details */}
                <View style={{ backgroundColor: colors.surfaceAlt, padding: scale(12), borderRadius: scale(10), borderWidth: 1, borderColor: colors.line, marginBottom: verticalScale(16), alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>UPI ID for Manual Transfer</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(14), fontWeight: 'bold', marginTop: verticalScale(4) }}>{adminUpiId}</Text>
                </View>

                {/* Screenshot uploader */}
                <Text style={[styles.label, { color: colors.textPrimary, textAlign: 'center', marginBottom: verticalScale(8) }]}>
                  Step 2: Upload Payment Screenshot Proof
                </Text>

                <TouchableOpacity
                  style={{ height: verticalScale(100), borderStyle: 'dashed', borderWidth: 2, borderColor: screenshotBase64 ? colors.amber : colors.textMuted, borderRadius: scale(12), alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(16), overflow: 'hidden' }}
                  onPress={handlePickScreenshot}
                >
                  {screenshotBase64 ? (
                    <Image source={{ uri: screenshotBase64 }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View style={{ alignItems: 'center' }}>
                      <MaterialIcons name="cloud-upload" size={scale(32)} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginTop: verticalScale(4) }}>Tap to upload proof screenshot</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: scale(10) }}>
                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.line, marginTop: 0 }]}
                    onPress={() => {
                      setTopupStep(1);
                      setScreenshotBase64('');
                    }}
                  >
                    <Text style={[styles.primaryButtonText, { color: colors.textPrimary }]}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, { flex: 2, backgroundColor: colors.amber, marginTop: 0 }]}
                    onPress={handleSubmitTopupProof}
                    disabled={isSubmittingTopup}
                  >
                    {isSubmittingTopup ? (
                      <ActivityIndicator size="small" color="#101014" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Submit Top-Up Proof</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Withdraw Funds Modal */}
      <Modal visible={withdrawModalVisible} animationType="slide" transparent={true} onRequestClose={() => setWithdrawModalVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setWithdrawModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={{ backgroundColor: colors.surface, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(20) }}
            >
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
                  setIsSubmittingWithdraw(true);
                  const res = await submitWithdrawalApi({ userId, userName: name, role: 'driver', amount: amt, upiId: withdrawUpi });
                  setIsSubmittingWithdraw(false);
                  if (res.success) {
                    Alert.alert('Success', res.message || 'Withdrawal request submitted');
                    setWithdrawModalVisible(false);
                    setWithdrawAmount('');
                    setWithdrawUpi('');
                    loadWalletData();
                  } else {
                    Alert.alert('Error', res.message || 'Withdrawal failed');
                  }
                }}
                disabled={isSubmittingWithdraw}
              >
                {isSubmittingWithdraw ? (
                  <ActivityIndicator size="small" color="#101014" />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit Withdrawal Request</Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(12),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateFontScale(22),
    fontWeight: '800',
  },
  headerSub: {
    fontSize: moderateFontScale(13),
    marginTop: verticalScale(2),
  },
  scrollContent: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(8),
  },
  card: {
    borderRadius: scale(24),
    borderWidth: 1.2,
    padding: scale(20),
    marginBottom: verticalScale(18),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  cardTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: moderateFontScale(12),
    fontWeight: 'bold',
    marginBottom: verticalScale(6),
  },
  input: {
    height: verticalScale(44),
    borderWidth: 1.2,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    fontSize: moderateFontScale(14),
    fontWeight: '600',
    marginBottom: verticalScale(12),
  },
  primaryButton: {
    borderRadius: scale(14),
    height: verticalScale(46),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: moderateFontScale(14),
    fontWeight: '900',
    color: '#101014',
  },
});
