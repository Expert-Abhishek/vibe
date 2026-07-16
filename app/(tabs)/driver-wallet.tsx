import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface EarningItem {
  id: string;
  trip: string;
  time: string;
  amount: number;
  status: 'Settled' | 'Pending';
}

export default function DriverWalletScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [upiId, setUpiId] = useState('ka03md8240@okaxis');
  const [editingUpi, setEditingUpi] = useState(false);
  const [tempUpi, setTempUpi] = useState('ka03md8240@okaxis');

  const [todayEarnings, setTodayEarnings] = useState(2800);
  const [totalEarnings, setTotalEarnings] = useState(14500);
  
  const [history, setHistory] = useState<EarningItem[]>([
    { id: '1', trip: 'Majestic Metro ➔ Indiranagar 100ft Rd', time: 'Today, 11:00 AM', amount: 340, status: 'Settled' },
    { id: '2', trip: 'Hebbal Flyover ➔ Kempegowda Airport', time: 'Today, 02:15 PM', amount: 850, status: 'Settled' },
    { id: '3', trip: 'Bengaluru Palace ➔ Lalbagh Botanical Gardens', time: 'Yesterday, 04:30 PM', amount: 480, status: 'Settled' },
    { id: '4', trip: 'Electronic City ➔ Koramangala 5th Block', time: 'Yesterday, 09:15 AM', amount: 620, status: 'Settled' },
    { id: '5', trip: 'Whitefield ITPL ➔ Majestic Railway Station', time: '12 July 2026, 06:10 PM', amount: 710, status: 'Settled' },
  ]);

  const [cashingOut, setCashingOut] = useState(false);

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

  const handleUpdateUpi = () => {
    const trimmed = tempUpi.trim();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g. username@bank).');
      return;
    }
    setUpiId(trimmed);
    setEditingUpi(false);
    Alert.alert('UPI Updated', 'Your UPI ID has been updated successfully for receiving payouts.');
  };

  const handleCashout = () => {
    if (todayEarnings <= 0) {
      Alert.alert('No Balance', 'Today\'s earnings have already been cashed out to your bank.');
      return;
    }
    
    Alert.alert(
      'Confirm Cashout',
      `Would you like to instantly transfer ₹${todayEarnings} to your registered UPI account (${upiId})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer Now',
          onPress: () => {
            setCashingOut(true);
            setTimeout(() => {
              setCashingOut(false);
              const transferAmount = todayEarnings;
              setTotalEarnings(prev => prev + transferAmount);
              setTodayEarnings(0);
              Alert.alert(
                'Success!',
                `₹${transferAmount} has been instantly settled to your bank account via UPI.`
              );
            }, 2000);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <MaterialIcons name="directions-car" size={scale(24)} color={colors.amber} style={{ marginRight: scale(8) }} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Driver Wallet</Text>
        </View>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>Manage earnings and instant bank payouts</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Earnings Dashboard Box */}
        <View style={[styles.dashboardCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.earningsGrid}>
            <View style={styles.earningBox}>
              <Text style={[styles.earningLabel, { color: colors.textMuted }]}>TODAY'S EARNINGS</Text>
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
              { backgroundColor: todayEarnings > 0 ? colors.amber : '#2C2C34' }
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
                placeholder="UPI ID (e.g. user@bank)"
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
            All trip earnings are credited to this UPI ID upon tapping "Instant Bank Settlement".
          </Text>
        </View>

        {/* Earning History */}
        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: colors.amber }]}>Trip Earnings History</Text>
          
          {history.map((item) => (
            <View key={item.id} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
              <View style={[styles.itemIconBox, { backgroundColor: 'rgba(245,197,24,0.08)' }]}>
                <MaterialIcons name="local-taxi" size={scale(18)} color={colors.amber} />
              </View>
              <View style={styles.itemMain}>
                <Text style={[styles.itemTripText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.trip}
                </Text>
                <Text style={[styles.itemTimeText, { color: colors.textMuted }]}>
                  {item.time}
                </Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={[styles.itemAmountText, { color: colors.textPrimary }]}>
                  +₹{item.amount}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                  <Text style={[styles.statusText, { color: colors.success }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: verticalScale(100) }} />
      </ScrollView>
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
    marginTop: verticalScale(2),
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
