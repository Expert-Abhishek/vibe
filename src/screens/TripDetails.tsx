import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import {
  BookingType,
  VehicleType,
  calculateTripFare,
  validatePreBookedDispatch,
  formatScheduledDateTime,
} from '../services/fareCalculator';
import { useAppModal } from '../context/ModalContext';

interface TripDetailsProps {
  tripId?: string;
  bookingType?: BookingType;
  scheduledTime?: string | Date;
  pickupAddress?: string;
  dropAddress?: string;
  distanceKm?: number;
  durationMins?: number;
  vehicleType?: VehicleType;
  surgeMultiplier?: number;
  passengerName?: string;
  passengerPhone?: string;
  onStartTrip?: () => void;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function TripDetails({
  tripId = 'TRIP_8892',
  bookingType = 'PRE_BOOKED',
  scheduledTime = new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 mins in future
  pickupAddress = 'Indiranagar 100ft Road, Bangalore',
  dropAddress = 'KIAL Airport Terminal 2',
  distanceKm = 38.5,
  durationMins = 52,
  vehicleType = 'sedan',
  surgeMultiplier = 1.2,
  passengerName = 'Ananya Sen',
  passengerPhone = '+91 98765 43210',
  onStartTrip,
  onBack,
  style,
}: TripDetailsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { showModal } = useAppModal();

  // Compute Fare Breakdown
  const fareBreakdown = calculateTripFare({
    bookingType,
    distanceKm,
    durationMins,
    vehicleType,
    surgeMultiplier,
    scheduledTime,
  });

  // Evaluate Time-Gate Dispatch Guard
  const dispatchGuard = validatePreBookedDispatch(scheduledTime);
  const { canStart, unlockBadgeText } = dispatchGuard;

  const colors = {
    background: isDark ? '#0D0D12' : '#F4F5F8',
    cardBg: isDark ? '#1C1C24' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    amber: '#F5C518',
    emerald: '#10B981',
    disabled: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    disabledText: isDark ? '#6B7280' : '#9CA3AF',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  };

  const handleStartTripPress = () => {
    // Time-gate safety guard
    if (!canStart) {
      showModal({
        title: 'Dispatch Locked',
        description: `Pre-booked trip cannot be started yet. ${unlockBadgeText}`,
        variant: 'warning',
        primaryButtonText: 'Understood',
        onPrimaryAction: () => {},
      });
      return;
    }

    if (onStartTrip) {
      onStartTrip();
    } else {
      showModal({
        title: 'Ride Started',
        description: `Trip ${tripId} has been successfully activated.`,
        variant: 'success',
        primaryButtonText: 'Great!',
        onPrimaryAction: () => {},
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, style]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={scale(22)} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : null}
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Trip Details & Schedule</Text>
        
        {/* Booking Type Badge */}
        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor:
                bookingType === 'PRE_BOOKED'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(245, 197, 24, 0.15)',
            },
          ]}
        >
          <Text
            style={[
              styles.typeBadgeText,
              { color: bookingType === 'PRE_BOOKED' ? colors.emerald : colors.amber },
            ]}
          >
            {bookingType === 'PRE_BOOKED' ? '📅 PRE-BOOKED' : '⚡ INSTANT'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Schedule & Time Banner */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <MaterialIcons name="event" size={scale(20)} color={colors.amber} />
            <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary }]}>
              {bookingType === 'PRE_BOOKED' ? 'SCHEDULED PICKUP TIME' : 'DISPATCH TIME'}
            </Text>
          </View>
          <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>
            {fareBreakdown.scheduledTimeFormatted}
          </Text>

          {/* Time-Gate Activation Badge */}
          {bookingType === 'PRE_BOOKED' && (
            <View
              style={[
                styles.guardStatusBanner,
                {
                  backgroundColor: canStart ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  borderColor: canStart ? colors.emerald : '#EF4444',
                },
              ]}
            >
              <MaterialIcons
                name={canStart ? 'lock-open' : 'lock'}
                size={scale(18)}
                color={canStart ? colors.emerald : '#EF4444'}
              />
              <Text
                style={[
                  styles.guardStatusText,
                  { color: canStart ? colors.emerald : '#EF4444' },
                ]}
              >
                {unlockBadgeText}
              </Text>
            </View>
          )}
        </View>

        {/* Passenger & Vehicle Info */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.passengerRow}>
            <View style={styles.avatar}>
              <FontAwesome5 name="user-alt" size={scale(16)} color={colors.amber} />
            </View>
            <View style={{ flex: 1, marginLeft: scale(12) }}>
              <Text style={[styles.passengerName, { color: colors.textPrimary }]}>{passengerName}</Text>
              <Text style={[styles.passengerSub, { color: colors.textSecondary }]}>{passengerPhone}</Text>
            </View>
            <View style={styles.vehicleChip}>
              <Text style={styles.vehicleChipText}>{vehicleType.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Route & Distance Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.routeHeader}>
            <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary }]}>ROUTE PLAN</Text>
            <Text style={[styles.distanceBadge, { color: colors.amber }]}>
              {distanceKm} km ({durationMins} mins)
            </Text>
          </View>

          <View style={styles.locationBlock}>
            <MaterialIcons name="my-location" size={scale(18)} color={colors.emerald} />
            <View style={styles.locationTextWrap}>
              <Text style={[styles.locLabel, { color: colors.textSecondary }]}>PICKUP</Text>
              <Text style={[styles.locVal, { color: colors.textPrimary }]}>{pickupAddress}</Text>
            </View>
          </View>

          <View style={styles.locationBlock}>
            <MaterialIcons name="place" size={scale(18)} color="#EF4444" />
            <View style={styles.locationTextWrap}>
              <Text style={[styles.locLabel, { color: colors.textSecondary }]}>DROPOFF</Text>
              <Text style={[styles.locVal, { color: colors.textPrimary }]}>{dropAddress}</Text>
            </View>
          </View>
        </View>

        {/* Fare Breakdown Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary, marginBottom: verticalScale(12) }]}>
            ITEMIZED FARE BREAKDOWN
          </Text>

          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Base Fare</Text>
            <Text style={[styles.fareVal, { color: colors.textPrimary }]}>₹{fareBreakdown.baseFare}</Text>
          </View>

          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Distance Charge ({distanceKm} km)</Text>
            <Text style={[styles.fareVal, { color: colors.textPrimary }]}>₹{fareBreakdown.distanceFare}</Text>
          </View>

          <View style={styles.fareRow}>
            <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Time Charge ({durationMins} mins)</Text>
            <Text style={[styles.fareVal, { color: colors.textPrimary }]}>₹{fareBreakdown.durationFare}</Text>
          </View>

          {fareBreakdown.surgeAmount > 0 && (
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: colors.amber }]}>
                Surge Fee ({fareBreakdown.surgeMultiplier}x)
              </Text>
              <Text style={[styles.fareVal, { color: colors.amber }]}>+₹{fareBreakdown.surgeAmount}</Text>
            </View>
          )}

          {fareBreakdown.preBookingFee > 0 && (
            <View style={styles.fareRow}>
              <Text style={[styles.fareLabel, { color: colors.emerald }]}>Pre-Booking Reservation Fee</Text>
              <Text style={[styles.fareVal, { color: colors.emerald }]}>+₹{fareBreakdown.preBookingFee}</Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.fareRow}>
            <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Total Fare Estimate</Text>
            <Text style={[styles.totalVal, { color: colors.emerald }]}>₹{fareBreakdown.totalFare}</Text>
          </View>
          {fareBreakdown.minimumFareLocked && (
            <Text style={[styles.lockedSub, { color: colors.textSecondary }]}>
              🔒 Minimum fare estimate locked for pre-booking
            </Text>
          )}
        </View>

        {/* Start Trip Action Button */}
        <TouchableOpacity
          style={[
            styles.startBtn,
            {
              backgroundColor: canStart ? colors.emerald : colors.disabled,
              opacity: canStart ? 1.0 : 0.5,
            },
          ]}
          disabled={!canStart}
          onPress={handleStartTripPress}
          activeOpacity={canStart ? 0.8 : 1.0}
        >
          <MaterialIcons
            name={canStart ? 'play-arrow' : 'lock'}
            size={scale(22)}
            color={canStart ? '#FFFFFF' : colors.disabledText}
          />
          <Text
            style={[
              styles.startBtnText,
              { color: canStart ? '#FFFFFF' : colors.disabledText },
            ]}
          >
            {canStart ? 'START TRIP' : 'DISPATCH LOCKED'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: scale(4),
    marginRight: scale(8),
  },
  headerTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(12),
  },
  typeBadgeText: {
    fontSize: moderateFontScale(10),
    fontWeight: '900',
  },
  content: {
    padding: scale(16),
    gap: verticalScale(14),
  },
  card: {
    borderRadius: scale(16),
    borderWidth: 1,
    padding: scale(16),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(6),
  },
  cardHeaderTitle: {
    fontSize: moderateFontScale(11),
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  dateTimeText: {
    fontSize: moderateFontScale(18),
    fontWeight: '900',
    marginVertical: verticalScale(4),
  },
  guardStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    borderWidth: 1,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    marginTop: verticalScale(10),
  },
  guardStatusText: {
    fontSize: moderateFontScale(12),
    fontWeight: '800',
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: 'rgba(245, 197, 24, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passengerName: {
    fontSize: moderateFontScale(15),
    fontWeight: '800',
  },
  passengerSub: {
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(2),
  },
  vehicleChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(8),
  },
  vehicleChipText: {
    fontSize: moderateFontScale(10),
    fontWeight: '800',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  distanceBadge: {
    fontSize: moderateFontScale(12),
    fontWeight: '800',
  },
  locationBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: verticalScale(10),
  },
  locationTextWrap: {
    marginLeft: scale(10),
    flex: 1,
  },
  locLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  locVal: {
    fontSize: moderateFontScale(13),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  fareLabel: {
    fontSize: moderateFontScale(12),
    fontWeight: '500',
  },
  fareVal: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: verticalScale(10),
  },
  totalLabel: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  totalVal: {
    fontSize: moderateFontScale(18),
    fontWeight: '900',
  },
  lockedSub: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginTop: verticalScale(4),
  },
  startBtn: {
    height: scale(48),
    borderRadius: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    marginTop: verticalScale(6),
  },
  startBtnText: {
    fontSize: moderateFontScale(14),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
