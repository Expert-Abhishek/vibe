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

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  title: string;
  date: string;
  amount: number;
}

export default function WalletScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [balance, setBalance] = useState<number>(1250);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 'tx1', type: 'credit', title: 'Wallet Auto Refill', date: 'Today, 11:20 AM', amount: 500 },
    { id: 'tx2', type: 'debit', title: 'Paid Suresh Kumar (Cab)', date: 'Today, 03:30 PM', amount: 340 },
    { id: 'tx3', type: 'debit', title: 'Paid Raju Auto (Cab)', date: '08 July 2026', amount: 90 },
    { id: 'tx4', type: 'credit', title: 'Promo Cashback Refund', date: '06 July 2026', amount: 50 },
    { id: 'tx5', type: 'debit', title: 'Paid Krishna Murthy (Guide)', date: '04 July 2026', amount: 2500 },
  ]);

  // Modal control states
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmountText, setAddAmountText] = useState('');
  const [refillLoading, setRefillLoading] = useState(false);

  const [showSendMoney, setShowSendMoney] = useState(false);
  const [sendMobileText, setSendMobileText] = useState('');
  const [sendAmountText, setSendAmountText] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  const handleAddMoney = () => {
    const amt = parseFloat(addAmountText);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than zero.');
      return;
    }
    setRefillLoading(true);
    setTimeout(() => {
      setRefillLoading(false);
      setShowAddMoney(false);
      setAddAmountText('');
      setBalance(balance + amt);
      setTransactions([
        {
          id: `tx_refill_${Date.now()}`,
          type: 'credit',
          title: 'Wallet Loaded (UPI)',
          date: 'Just Now',
          amount: amt,
        },
        ...transactions,
      ]);
      Alert.alert('Refill Success!', `₹${amt} has been loaded into your Vibe Wallet.`);
    }, 1800);
  };

  const handleSendMoney = () => {
    const amt = parseFloat(sendAmountText);
    const mobile = sendMobileText.trim();
    if (!mobile || mobile.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (amt > balance) {
      Alert.alert('Insufficient Balance', 'Your wallet balance is lower than the amount entered.');
      return;
    }
    setSendLoading(true);
    setTimeout(() => {
      setSendLoading(false);
      setShowSendMoney(false);
      setSendAmountText('');
      setSendMobileText('');
      setBalance(balance - amt);
      setTransactions([
        {
          id: `tx_send_${Date.now()}`,
          type: 'debit',
          title: `Sent to +91 ${mobile}`,
          date: 'Just Now',
          amount: amt,
        },
        ...transactions,
      ]);
      Alert.alert('Transfer Success!', `₹${amt} sent successfully to +91 ${mobile}.`);
    }, 1800);
  };

  const handleCopyVoucher = (code: string) => {
    Alert.alert('Promo Copied!', `Voucher code "${code}" copied to clipboard! Use it during booking to get a discount.`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Vibe Wallet</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>Refill, pay, and redeem coupons</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Credit Card display box */}
        <View style={styles.cardBox}>
          {/* Card background styling */}
          <View style={styles.cardGridLines} />
          <View style={styles.cardChipBadge}>
            <MaterialIcons name="nfc" size={scale(18)} color="rgba(255,255,255,0.4)" />
          </View>

          <View style={styles.cardHeader}>
            <Text style={styles.cardLogo}>VIBZZ PAY</Text>
            <Text style={styles.cardType}>Prepaid Wallet</Text>
          </View>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>₹{balance.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.cardNumber}>**** **** **** 8240</Text>
            <Text style={styles.cardHolder}>VALUED TRAVELER</Text>
          </View>
        </View>

        {/* Quick Actions grid */}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.surface }]}
            onPress={() => setShowAddMoney(true)}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(245,197,24,0.1)' }]}>
              <MaterialIcons name="account-balance-wallet" size={scale(20)} color={colors.amber} />
            </View>
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Add Money</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.surface }]}
            onPress={() => setShowSendMoney(true)}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <MaterialIcons name="send" size={scale(18)} color="#10B981" />
            </View>
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Send Money</Text>
          </TouchableOpacity>
        </View>

        {/* Active Promos and Vouchers */}
        <View style={styles.promoSection}>
          <Text style={[styles.sectionTitle, { color: colors.amber }]}>Available Promotion Vouchers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vouchersScroll}>
            <View style={[styles.voucherCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.voucherTop}>
                <FontAwesome5 name="percent" size={scale(14)} color={colors.amber} />
                <Text style={[styles.voucherCodeText, { color: colors.textPrimary }]}>VIBE15</Text>
              </View>
              <Text style={[styles.voucherDesc, { color: colors.textMuted }]}>15% Off all cabs bookings</Text>
              <TouchableOpacity style={styles.voucherCopyBtn} onPress={() => handleCopyVoucher('VIBE15')}>
                <Text style={styles.copyBtnText}>Copy Code</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.voucherCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.voucherTop}>
                <FontAwesome5 name="gift" size={scale(14)} color={colors.amber} />
                <Text style={[styles.voucherCodeText, { color: colors.textPrimary }]}>SAVE100</Text>
              </View>
              <Text style={[styles.voucherDesc, { color: colors.textMuted }]}>Flat ₹100 Off long tours</Text>
              <TouchableOpacity style={styles.voucherCopyBtn} onPress={() => handleCopyVoucher('SAVE100')}>
                <Text style={styles.copyBtnText}>Copy Code</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.voucherCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.voucherTop}>
                <FontAwesome5 name="compass" size={scale(14)} color={colors.amber} />
                <Text style={[styles.voucherCodeText, { color: colors.textPrimary }]}>TOUR50</Text>
              </View>
              <Text style={[styles.voucherDesc, { color: colors.textMuted }]}>50% Off first guide hire</Text>
              <TouchableOpacity style={styles.voucherCopyBtn} onPress={() => handleCopyVoucher('TOUR50')}>
                <Text style={styles.copyBtnText}>Copy Code</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Transaction History list */}
        <View style={styles.transactionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.amber }]}>Wallet Transactions</Text>
          {transactions.map((tx) => {
            const isCredit = tx.type === 'credit';
            return (
              <View key={tx.id} style={[styles.txItem, { borderBottomColor: colors.border }]}>
                <View style={[styles.txIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                  <MaterialIcons 
                    name={isCredit ? 'trending-up' : 'trending-down'} 
                    size={scale(18)} 
                    color={isCredit ? '#10B981' : '#ef4444'} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txTitle, { color: colors.textPrimary }]}>{tx.title}</Text>
                  <Text style={[styles.txDate, { color: colors.textMuted }]}>{tx.date}</Text>
                </View>
                <Text style={[styles.txAmountText, { color: isCredit ? '#10B981' : '#ef4444' }]}>
                  {isCredit ? '+' : '-'}₹{tx.amount}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Spacing */}
        <View style={{ height: verticalScale(30) }} />
      </ScrollView>

      {/* Add Money Modal Simulator */}
      <Modal
        visible={showAddMoney}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMoney(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Load Wallet Balance</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>Enter amount to add via UPI / Card</Text>

            <View style={[styles.amountInputBlock, { borderColor: colors.amber }]}>
              <Text style={[styles.rupeeSign, { color: colors.textPrimary }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.textPrimary }]}
                placeholder="500"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                value={addAmountText}
                onChangeText={setAddAmountText}
                autoFocus
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#2C2C34' }]} 
                onPress={() => setShowAddMoney(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.amber }]} 
                onPress={handleAddMoney}
                disabled={refillLoading}
              >
                {refillLoading ? (
                  <ActivityIndicator color="#101010" size="small" />
                ) : (
                  <Text style={styles.modalBtnTextConfirm}>Add Funds</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Send Money Modal Simulator */}
      <Modal
        visible={showSendMoney}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSendMoney(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Transfer Wallet Balance</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>Send balance directly to another traveler</Text>

            {/* Input mobile */}
            <TextInput
              style={[styles.modalInputText, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Recipient 10-digit mobile number"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="phone-pad"
              value={sendMobileText}
              onChangeText={setSendMobileText}
            />

            {/* Input amount */}
            <TextInput
              style={[styles.modalInputText, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Amount to Send (₹)"
              placeholderTextColor="rgba(255,255,255,0.2)"
              keyboardType="numeric"
              value={sendAmountText}
              onChangeText={setSendAmountText}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#2C2C34' }]} 
                onPress={() => setShowSendMoney(false)}
              >
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.amber }]} 
                onPress={handleSendMoney}
                disabled={sendLoading}
              >
                {sendLoading ? (
                  <ActivityIndicator color="#101010" size="small" />
                ) : (
                  <Text style={styles.modalBtnTextConfirm}>Send Pay</Text>
                )}
              </TouchableOpacity>
            </View>
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
  header: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(12),
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
  cardBox: {
    width: '100%',
    height: verticalScale(170),
    borderRadius: scale(24),
    backgroundColor: '#1E1E24',
    padding: scale(20),
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.08)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cardGridLines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: scale(24),
  },
  cardChipBadge: {
    position: 'absolute',
    top: scale(20),
    right: scale(20),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLogo: {
    color: '#F5C518',
    fontSize: moderateFontScale(14),
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  cardType: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: moderateFontScale(10),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  balanceSection: {
    marginVertical: verticalScale(10),
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: moderateFontScale(11),
    fontWeight: '600',
  },
  balanceValue: {
    color: '#ffffff',
    fontSize: moderateFontScale(28),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardNumber: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardHolder: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: moderateFontScale(10),
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(20),
    gap: scale(10),
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(16),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  actionText: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
  promoSection: {
    marginBottom: verticalScale(22),
  },
  sectionTitle: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(12),
  },
  vouchersScroll: {
    gap: scale(12),
    paddingVertical: verticalScale(2),
  },
  voucherCard: {
    width: scale(160),
    borderRadius: scale(16),
    borderWidth: 1.2,
    padding: scale(14),
  },
  voucherTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  voucherCodeText: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
  voucherDesc: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginVertical: verticalScale(6),
  },
  voucherCopyBtn: {
    backgroundColor: '#2C2C34',
    borderRadius: scale(8),
    paddingVertical: verticalScale(5),
    alignItems: 'center',
  },
  copyBtnText: {
    color: '#ffffff',
    fontSize: moderateFontScale(10),
    fontWeight: '700',
  },
  transactionsSection: {
    marginTop: scale(2),
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1.2,
  },
  txIconBox: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  txTitle: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  txDate: {
    fontSize: moderateFontScale(10),
    marginTop: verticalScale(2),
  },
  txAmountText: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    width: '100%',
    borderRadius: scale(24),
    padding: scale(22),
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: moderateFontScale(17),
    fontWeight: '800',
  },
  modalSub: {
    fontSize: moderateFontScale(12),
    marginTop: verticalScale(4),
    marginBottom: verticalScale(16),
  },
  amountInputBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    height: verticalScale(50),
    width: '80%',
    marginBottom: verticalScale(20),
  },
  rupeeSign: {
    fontSize: moderateFontScale(22),
    fontWeight: '800',
    marginRight: scale(6),
  },
  amountInput: {
    flex: 1,
    fontSize: moderateFontScale(22),
    fontWeight: '800',
    padding: 0,
    height: '100%',
  },
  modalInputText: {
    width: '100%',
    borderWidth: 1.2,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    height: verticalScale(42),
    marginBottom: verticalScale(14),
    fontSize: moderateFontScale(13),
  },
  modalActions: {
    flexDirection: 'row',
    gap: scale(10),
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTextCancel: {
    color: '#ffffff',
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  modalBtnTextConfirm: {
    color: '#101010',
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
});
