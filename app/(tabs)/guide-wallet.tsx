import { fetchWalletBalanceApi, submitWithdrawalApi, updateUserProfileApi } from '@/constants/api';
import { getUserSessionSync, saveUserSession } from '@/constants/authStore';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface EarningItem {
  id: string;
  tour: string;
  time: string;
  amount: number;
  rating: number;
  status: 'Settled' | 'Pending';
}

export default function GuideWalletScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [upiId, setUpiId] = useState('ramesh.guide@okaxis');
  const [editingUpi, setEditingUpi] = useState(false);
  const [tempUpi, setTempUpi] = useState('ramesh.guide@okaxis');

  const [todayEarnings, setTodayEarnings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [history, setHistory] = useState<EarningItem[]>([]);
  const [cashingOut, setCashingOut] = useState(false);

  useEffect(() => {
    async function loadWalletData() {
      const session = getUserSessionSync();
      const userId = session?.id || 'g1';

      const sessionUpi = session?.profile?.upiId || session?.profile?.upi_id || 'ramesh.guide@okaxis';
      setUpiId(sessionUpi);
      setTempUpi(sessionUpi);

      setLoading(true);
      const res = await fetchWalletBalanceApi(userId);
      setLoading(false);

      if (res && res.success) {
        setTodayEarnings(res.balance || 0);

        const mappedHistory: EarningItem[] = (res.transactions || []).map((t: any) => {
          return {
            id: t.id,
            tour: t.description || 'Tour Guide Earning',
            time: t.created_at ? new Date(t.created_at).toLocaleString() : 'Recent',
            amount: parseFloat(t.amount || 0),
            rating: 5,
            status: t.type === 'withdrawal' ? 'Pending' : 'Settled',
          };
        });

        setHistory(mappedHistory);

        // Sum approved/completed withdrawals
        const settledWithdrawals = (res.withdrawals || [])
          .filter((w: any) => w.status === 'Approved' || w.status === 'Completed')
          .reduce((sum: number, w: any) => sum + parseFloat(w.amount || 0), 0);
        setTotalEarnings(settledWithdrawals);
      }
    }
    loadWalletData();
  }, [refreshTrigger]);

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
    success: '#10B981',
  };

  const handleUpdateUpi = async () => {
    const trimmed = tempUpi.trim();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g. username@bank).');
      return;
    }

    const session = getUserSessionSync();
    if (session?.id) {
      setLoading(true);
      await updateUserProfileApi(session.id, {
        ...(session.profile || {}),
        upiId: trimmed,
      });
      setLoading(false);

      const updatedSession = {
        ...session,
        profile: {
          ...(session.profile || {}),
          upiId: trimmed,
        },
      };
      await saveUserSession(updatedSession);
    }

    setUpiId(trimmed);
    setEditingUpi(false);
    Alert.alert('UPI Updated', 'Your UPI ID has been updated successfully for receiving payouts.');
  };

  const handleCashout = () => {
    if (todayEarnings <= 0) {
      Alert.alert('No Balance', "Today's tour earnings have already been settled to your bank.");
      return;
    }

    Alert.alert(
      'Confirm Cashout',
      `Would you like to instantly transfer ₹${todayEarnings} to your registered UPI account (${upiId})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer Now',
          onPress: async () => {
            setCashingOut(true);
            const session = getUserSessionSync();
            const res = await submitWithdrawalApi({
              userId: session?.id || 'g1',
              userName: session?.name || 'Partner',
              role: 'guide',
              amount: todayEarnings,
              upiId: upiId || 'guide@okaxis',
            });
            setCashingOut(false);

            if (res && res.success) {
              const transferAmount = todayEarnings;
              setTodayEarnings(0);
              Alert.alert(
                'Success!',
                `₹${transferAmount} withdrawal request submitted successfully! Admin will approve and settle it shortly.`,
                [{ text: 'OK', onPress: () => setRefreshTrigger(prev => prev + 1) }]
              );
            } else {
              Alert.alert('Error', res?.message || 'Failed to submit withdrawal request.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity style={{ marginRight: scale(8) }} onPress={() => router.replace('/guide-dashboard' as any)}>
            <MaterialIcons name="arrow-back" size={scale(22)} color={colors.textPrimary} />
          </TouchableOpacity>
          <MaterialIcons name="explore" size={scale(24)} color={colors.amber} style={{ marginRight: scale(8) }} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Guide Wallet</Text>
        </View>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>Manage tour guide earnings and bank cashouts</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.amber} />
          <Text style={{ color: colors.textMuted, marginTop: 10 }}>Loading Wallet...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Earnings Dashboard Box */}
          <View style={[styles.dashboardCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.earningsGrid}>
              <View style={styles.earningBox}>
                <Text style={[styles.earningLabel, { color: colors.textMuted }]}>TODAY'S TOUR REVENUE</Text>
                <Text style={[styles.earningValue, { color: colors.amber }]}>₹{todayEarnings.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
              <View style={styles.earningBox}>
                <Text style={[styles.earningLabel, { color: colors.textMuted }]}>TOTAL PAID OUT</Text>
                <Text style={[styles.earningValue, { color: colors.success }]}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.cashoutBtn,
                { backgroundColor: todayEarnings > 0 ? colors.amber : '#2C2C34' },
              ]}
              onPress={handleCashout}
              disabled={todayEarnings === 0 || cashingOut}
            >
              {cashingOut ? (
                <ActivityIndicator color="#101010" size="small" />
              ) : (
                <>
                  <MaterialIcons name="account-balance" size={scale(18)} color={todayEarnings > 0 ? '#101010' : '#8D8D97'} style={{ marginRight: scale(6) }} />
                  <Text style={[styles.cashoutBtnText, { color: todayEarnings > 0 ? '#101010' : '#8D8D97' }]}>
                    {todayEarnings > 0 ? 'Instant Bank Settlement' : 'Nothing to Settle'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* UPI Configuration Panel */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.amber }]}>Settlement Account (UPI)</Text>

            {editingUpi ? (
              <View style={styles.upiInputRow}>
                <TextInput
                  style={[styles.upiInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
                  value={tempUpi}
                  onChangeText={setTempUpi}
                  placeholder="UPI ID (e.g. guide@bank)"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.upiActionButtons}>
                  <TouchableOpacity
                    style={[styles.upiSubBtn, { backgroundColor: colors.success }]}
                    onPress={handleUpdateUpi}
                  >
                    <MaterialIcons name="check" size={scale(18)} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.upiSubBtn, { backgroundColor: '#ef4444' }]}
                    onPress={() => {
                      setTempUpi(upiId);
                      setEditingUpi(false);
                    }}
                  >
                    <MaterialIcons name="close" size={scale(18)} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.upiDisplayRow}>
                <View style={styles.upiDisplayLeft}>
                  <FontAwesome5 name="wallet" size={scale(16)} color={colors.textMuted} style={{ marginRight: scale(10) }} />
                  <Text style={[styles.upiText, { color: colors.textPrimary }]}>{upiId}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.editBtn, { borderColor: colors.amber }]}
                  onPress={() => {
                    setTempUpi(upiId);
                    setEditingUpi(true);
                  }}
                >
                  <Text style={[styles.editBtnText, { color: colors.amber }]}>Change UPI</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={[styles.upiNote, { color: colors.textMuted }]}>
              All guide booking earnings are credited to this UPI ID upon tapping "Instant Bank Settlement".
            </Text>
          </View>

          {/* Earning History */}
          <View style={styles.historySection}>
            <Text style={[styles.sectionTitle, { color: colors.amber }]}>Tour Guide Earnings History</Text>

            {history.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), textAlign: 'center', marginVertical: scale(20) }}>
                No transaction logs recorded yet.
              </Text>
            ) : (
              history.map((item) => (
                <View key={item.id} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                  <View style={[styles.itemIconBox, { backgroundColor: 'rgba(245,197,24,0.08)' }]}>
                    <MaterialIcons name="hiking" size={scale(18)} color={colors.amber} />
                  </View>
                  <View style={styles.itemMain}>
                    <Text style={[styles.itemTripText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.tour}
                    </Text>
                    <View style={styles.ratingRow}>
                      <Text style={[styles.itemTimeText, { color: colors.textMuted, marginRight: scale(8) }]}>
                        {item.time}
                      </Text>
                      <View style={styles.starBadge}>
                        <MaterialIcons name="star" size={scale(10)} color={colors.amber} style={{ marginRight: scale(2) }} />
                        <Text style={styles.starText}>{item.rating}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={[styles.itemAmountText, { color: colors.textPrimary }]}>
                      +₹{item.amount}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'Pending' ? 'rgba(245,197,24,0.1)' : 'rgba(16,185,129,0.1)' }]}>
                      <Text style={[styles.statusText, { color: item.status === 'Pending' ? colors.amber : colors.success }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: verticalScale(100) }} />
        </ScrollView>
      )}
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
  dashboardCard: {
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
  earningsGrid: {
    flexDirection: 'row',
    marginBottom: verticalScale(18),
  },
  earningBox: {
    flex: 1,
    alignItems: 'center',
  },
  earningLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  earningValue: {
    fontSize: moderateFontScale(24),
    fontWeight: '800',
    marginTop: verticalScale(4),
  },
  verticalDivider: {
    width: 1.2,
    height: '80%',
    alignSelf: 'center',
  },
  cashoutBtn: {
    borderRadius: scale(14),
    height: verticalScale(44),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cashoutBtnText: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
  card: {
    borderRadius: scale(20),
    borderWidth: 1.2,
    padding: scale(18),
    marginBottom: verticalScale(18),
  },
  sectionTitle: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(12),
  },
  upiDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: verticalScale(4),
  },
  upiDisplayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: scale(10),
  },
  upiText: {
    fontSize: moderateFontScale(14),
    fontWeight: '700',
  },
  editBtn: {
    borderWidth: 1.2,
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
  },
  editBtnText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
  upiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  upiInput: {
    flex: 1,
    height: verticalScale(38),
    borderWidth: 1.2,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  upiActionButtons: {
    flexDirection: 'row',
    gap: scale(6),
  },
  upiSubBtn: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiNote: {
    fontSize: moderateFontScale(10),
    marginTop: verticalScale(10),
    lineHeight: verticalScale(14),
  },
  historySection: {
    marginTop: scale(2),
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1.2,
  },
  itemIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  itemMain: {
    flex: 1,
    marginRight: scale(10),
  },
  itemTripText: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  itemTimeText: {
    fontSize: moderateFontScale(10),
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(2),
  },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,197,24,0.08)',
    borderRadius: scale(4),
    paddingHorizontal: scale(4),
    paddingVertical: verticalScale(1),
  },
  starText: {
    fontSize: moderateFontScale(9),
    fontWeight: '800',
    color: '#F5C518',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: scale(4),
  },
  itemAmountText: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  statusBadge: {
    borderRadius: scale(6),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
  },
  statusText: {
    fontSize: moderateFontScale(9),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
