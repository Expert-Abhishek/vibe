import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BookingType } from '../../services/fareCalculator';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';

interface CashCollectionModalProps {
  visible: boolean;
  bookingType?: BookingType;
  totalFare?: number;
  advanceDepositPaid?: number;
  remainingCashBalance?: number;
  onConfirmCollection?: () => void | Promise<void>;
  onClose?: () => void;
}

export default function CashCollectionModal({
  visible,
  bookingType = 'PRE_BOOKED',
  totalFare = 1000,
  advanceDepositPaid = 200,
  remainingCashBalance = 800,
  onConfirmCollection,
  onClose,
}: CashCollectionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!visible) return null;

  const isPreBooked = bookingType === 'PRE_BOOKED';
  const collectionAmount = isPreBooked ? remainingCashBalance : totalFare;

  const handleConfirm = async () => {
    if (isSubmitting) return; // Prevent duplicate clicks
    setIsSubmitting(true);
    try {
      if (onConfirmCollection) {
        await onConfirmCollection();
      }
    } catch (e) {
      console.warn('CashCollectionModal error:', e);
    } finally {
      setIsSubmitting(false);
      if (onClose) onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="payments" size={scale(32)} color="#10B981" />
          </View>

          <Text style={styles.title}>CASH SETTLEMENT</Text>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>
              {isPreBooked
                ? 'Collect Remaining Cash Balance:'
                : 'Collect Full Cash Amount:'}
            </Text>
            <Text style={styles.amountValue}>₹{collectionAmount}</Text>
          </View>

          {isPreBooked && (
            <View style={styles.depositNotice}>
              <MaterialIcons name="check-circle" size={scale(16)} color="#10B981" />
              <Text style={styles.depositText}>
                20% Deposit (₹{advanceDepositPaid}) was paid online by customer.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.confirmBtn, { opacity: isSubmitting ? 0.7 : 1.0 }]}
            onPress={handleConfirm}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmBtnText}>CONFIRM CASH RECEIVED</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  card: {
    backgroundColor: '#1C1C24',
    borderRadius: scale(20),
    padding: scale(24),
    width: '100%',
    maxWidth: scale(360),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconCircle: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  title: {
    color: '#FFFFFF',
    fontSize: moderateFontScale(17),
    fontWeight: '900',
    marginBottom: verticalScale(16),
  },
  amountBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: scale(14),
    padding: scale(16),
    width: '100%',
    alignItems: 'center',
    marginBottom: verticalScale(14),
  },
  amountLabel: {
    color: '#9CA3AF',
    fontSize: moderateFontScale(11),
    fontWeight: '600',
    marginBottom: verticalScale(6),
  },
  amountValue: {
    color: '#10B981',
    fontSize: moderateFontScale(32),
    fontWeight: '900',
  },
  depositNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(20),
    paddingHorizontal: scale(8),
  },
  depositText: {
    color: '#9CA3AF',
    fontSize: moderateFontScale(11),
    flex: 1,
  },
  confirmBtn: {
    backgroundColor: '#10B981',
    height: scale(48),
    borderRadius: scale(14),
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: moderateFontScale(13),
    letterSpacing: 0.5,
  },
});
