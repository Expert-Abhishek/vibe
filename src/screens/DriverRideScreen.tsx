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
  RideStatus,
  rideStateService,
  useRideState,
} from '../services/rideStateService';
import { useAppModal } from '@src/context/ModalContext';
import { BookingType, validatePreBookedDispatch } from '../services/fareCalculator';
import CashCollectionModal from '../components/modals/CashCollectionModal';

interface DriverRideScreenProps {
  tripId?: string;
  driverName?: string;
  passengerName?: string;
  pickupAddress?: string;
  dropAddress?: string;
  fareAmount?: number;
  bookingType?: BookingType;
  scheduledTime?: string | Date;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function DriverRideScreen({
  tripId = 'trip_demo_101',
  driverName = 'Captain Alex',
  passengerName = 'Rahul Sharma',
  pickupAddress = 'MG Road, Bangalore',
  dropAddress = 'Kempegowda Int. Airport, Terminal 1',
  fareAmount = 850,
  bookingType = 'PRE_BOOKED',
  scheduledTime,
  onBack,
  style,
}: DriverRideScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { showModal } = useAppModal();
  const [cashModalVisible, setCashModalVisible] = useState(false);

  const currentRideStatus = useRideState(tripId);

  // Button Guard Constraint safety check logic
  const canArrive =
    currentRideStatus === 'STARTED' || currentRideStatus === 'TRIP_STARTED';

  const canStartRide = currentRideStatus === 'EN_ROUTE_TO_PICKUP';
  const canHeadToPickup = currentRideStatus === 'ACCEPTED';
  const canCompleteTrip = currentRideStatus === 'ARRIVED';

  // 1. Transition to EN_ROUTE_TO_PICKUP
  const handleHeadToPickup = async () => {
    if (!rideStateService.canTransition(currentRideStatus, 'EN_ROUTE_TO_PICKUP')) {
      showModal({
        title: 'Invalid Transition',
        description: 'Cannot transition to En Route from current state.',
        variant: 'warning',
        primaryButtonText: 'Understood',
        onPrimaryAction: () => {},
      });
      return;
    }
    await rideStateService.transitionRideState(tripId, 'EN_ROUTE_TO_PICKUP', driverName);
  };

  // 2. Transition to STARTED
  const handleStartRide = async () => {
    if (!rideStateService.canTransition(currentRideStatus, 'STARTED')) {
      showModal({
        title: 'Invalid Transition',
        description: 'Cannot start trip before heading to pickup.',
        variant: 'warning',
        primaryButtonText: 'Understood',
        onPrimaryAction: () => {},
      });
      return;
    }
    await rideStateService.transitionRideState(tripId, 'STARTED', driverName);
  };

  // 3. Transition to ARRIVED with strict Safety Check Guard
  const handleArrivedAtLocation = async () => {
    // Safety check constraint: If trip state is NOT STARTED, do NOT execute API or state updates
    if (!canArrive) {
      console.warn('Attempted click on disabled "Arrived at Location" button suppressed.');
      return;
    }

    await rideStateService.transitionRideState(tripId, 'ARRIVED', driverName);
    showModal({
      title: '📍 Arrived at Location',
      description: 'Passenger has been notified of your arrival.',
      variant: 'info',
      primaryButtonText: 'OK',
      onPrimaryAction: () => {},
    });
  };

  // Calculate cash settlement amounts
  const isPreBooked = bookingType === 'PRE_BOOKED';
  const advanceDepositPaid = isPreBooked ? Math.round(fareAmount * 0.20) : 0;
  const remainingCashBalance = isPreBooked ? fareAmount - advanceDepositPaid : fareAmount;

  // 4. Transition to COMPLETED with Cash Settlement Modal
  const handleCompleteTrip = async () => {
    if (!rideStateService.canTransition(currentRideStatus, 'COMPLETED')) {
      showModal({
        title: 'Invalid Transition',
        description: 'Cannot complete trip before marking arrival.',
        variant: 'warning',
        primaryButtonText: 'Understood',
        onPrimaryAction: () => {},
      });
      return;
    }

    setCashModalVisible(true);
  };

  const handleConfirmCashCollection = async () => {
    setCashModalVisible(false);
    const result = await rideStateService.transitionRideState(tripId, 'COMPLETED', driverName);
    if (result.success) {
      showModal({
        title: '🎉 Trip Completed',
        description: isPreBooked
          ? `Collected ₹${remainingCashBalance} cash. (₹${advanceDepositPaid} 20% deposit online).`
          : `Collected full cash ₹${fareAmount}.`,
        variant: 'success',
        primaryButtonText: 'Done',
        onPrimaryAction: () => {},
      });
    }
  };

  const colors = {
    background: isDark ? '#0D0D12' : '#F4F5F8',
    cardBg: isDark ? '#1A1A22' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textSecondary: isDark ? '#9CA3AF' : '#6B7280',
    amber: '#F5C518',
    emerald: '#10B981',
    disabled: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
    disabledText: isDark ? '#6B7280' : '#9CA3AF',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  };

  const steps: { label: string; key: RideStatus }[] = [
    { label: 'Accepted', key: 'ACCEPTED' },
    { label: 'En Route', key: 'EN_ROUTE_TO_PICKUP' },
    { label: 'Started', key: 'STARTED' },
    { label: 'Arrived', key: 'ARRIVED' },
    { label: 'Completed', key: 'COMPLETED' },
  ];

  const getStepIndex = (status: RideStatus) => {
    switch (status) {
      case 'ACCEPTED': return 0;
      case 'EN_ROUTE_TO_PICKUP': return 1;
      case 'STARTED':
      case 'TRIP_STARTED': return 2;
      case 'ARRIVED': return 3;
      case 'COMPLETED': return 4;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(currentRideStatus);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, style]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={scale(22)} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Active Driver Ride</Text>
        <View style={styles.badgeState}>
          <Text style={styles.badgeStateText}>{currentRideStatus}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sequence Progress Bar */}
        <View style={[styles.progressCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.progressTitle, { color: colors.textSecondary }]}>RIDE STEP SEQUENCE</Text>
          <View style={styles.stepContainer}>
            {steps.map((step, idx) => {
              const isActive = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <View key={step.key} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: isCurrent ? colors.amber : isActive ? colors.emerald : colors.disabled,
                        borderColor: isCurrent ? colors.amber : 'transparent',
                      },
                    ]}
                  >
                    {isActive ? (
                      <MaterialIcons name="check" size={scale(10)} color="#000" />
                    ) : (
                      <Text style={styles.stepNum}>{idx + 1}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: isCurrent ? colors.amber : isActive ? colors.textPrimary : colors.disabledText,
                        fontWeight: isCurrent ? '800' : '500',
                      },
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Passenger & Ride Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={styles.passengerRow}>
            <View style={styles.avatarCircle}>
              <FontAwesome5 name="user-alt" size={scale(18)} color="#F5C518" />
            </View>
            <View style={{ flex: 1, marginLeft: scale(12) }}>
              <Text style={[styles.passengerName, { color: colors.textPrimary }]}>{passengerName}</Text>
              <Text style={[styles.passengerSub, { color: colors.textSecondary }]}>Est. Fare: ₹{fareAmount}</Text>
            </View>
            <View style={styles.fareTag}>
              <Text style={styles.fareTagText}>₹{fareAmount}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Pickup & Dropoff Addresses */}
          <View style={styles.locationRow}>
            <MaterialIcons name="my-location" size={scale(18)} color="#10B981" />
            <View style={styles.locationTextWrap}>
              <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>PICKUP</Text>
              <Text style={[styles.locationVal, { color: colors.textPrimary }]}>{pickupAddress}</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <MaterialIcons name="place" size={scale(18)} color="#EF4444" />
            <View style={styles.locationTextWrap}>
              <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>DROPOFF</Text>
              <Text style={[styles.locationVal, { color: colors.textPrimary }]}>{dropAddress}</Text>
            </View>
          </View>
        </View>

        {/* Primary Action Buttons Container */}
        <View style={styles.actionsContainer}>
          {/* Step 1 Action: Head to Pickup */}
          {currentRideStatus === 'ACCEPTED' && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.amber }]}
              onPress={handleHeadToPickup}
              activeOpacity={0.8}
            >
              <MaterialIcons name="navigation" size={scale(20)} color="#000000" />
              <Text style={styles.primaryBtnText}>HEAD TO PICKUP LOCATION</Text>
            </TouchableOpacity>
          )}

          {/* Step 2 Action: Start Ride */}
          {currentRideStatus === 'EN_ROUTE_TO_PICKUP' && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.emerald }]}
              onPress={handleStartRide}
              activeOpacity={0.8}
            >
              <MaterialIcons name="play-arrow" size={scale(22)} color="#FFFFFF" />
              <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>START RIDE</Text>
            </TouchableOpacity>
          )}

          {/* Step 3 Action: Arrived at Location (with Strict Button Guard) */}
          <View style={styles.guardedButtonWrapper}>
            <Text style={[styles.guardLabel, { color: colors.textSecondary }]}>
              {canArrive
                ? '✅ Trip active: You can now mark arrival'
                : '🔒 Disabled until trip transitions to STARTED state'}
            </Text>

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: canArrive ? '#3B82F6' : colors.disabled,
                  opacity: canArrive ? 1.0 : 0.45,
                },
              ]}
              disabled={!canArrive}
              onPress={handleArrivedAtLocation}
              activeOpacity={canArrive ? 0.7 : 1.0}
              accessibilityState={{ disabled: !canArrive }}
            >
              <MaterialIcons
                name="location-on"
                size={scale(20)}
                color={canArrive ? '#FFFFFF' : colors.disabledText}
              />
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: canArrive ? '#FFFFFF' : colors.disabledText },
                ]}
              >
                ARRIVED AT LOCATION
              </Text>
            </TouchableOpacity>
          </View>

          {/* Step 4 Action: Complete Trip */}
          {currentRideStatus === 'ARRIVED' && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.emerald }]}
              onPress={handleCompleteTrip}
              activeOpacity={0.8}
            >
              <MaterialIcons name="check-circle" size={scale(20)} color="#FFFFFF" />
              <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>COMPLETE TRIP</Text>
            </TouchableOpacity>
          )}

          {/* Step 5 Banner: Completed */}
          {currentRideStatus === 'COMPLETED' && (
            <View style={[styles.completedBanner, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <MaterialIcons name="stars" size={scale(28)} color={colors.emerald} />
              <Text style={[styles.completedTitle, { color: colors.emerald }]}>TRIP COMPLETED</Text>
              <Text style={[styles.completedSub, { color: colors.textSecondary }]}>
                Great job! Trip fare of ₹{fareAmount} has been credited.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <CashCollectionModal
        visible={cashModalVisible}
        bookingType={bookingType}
        totalFare={fareAmount}
        advanceDepositPaid={advanceDepositPaid}
        remainingCashBalance={remainingCashBalance}
        onConfirmCollection={handleConfirmCashCollection}
        onClose={() => setCashModalVisible(false)}
      />
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
  backButton: {
    padding: scale(6),
    marginRight: scale(8),
  },
  headerTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    flex: 1,
  },
  badgeState: {
    backgroundColor: 'rgba(245, 197, 24, 0.18)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  badgeStateText: {
    color: '#F5C518',
    fontSize: moderateFontScale(10),
    fontWeight: '900',
  },
  scrollContent: {
    padding: scale(16),
  },
  progressCard: {
    borderRadius: scale(16),
    borderWidth: 1,
    padding: scale(14),
    marginBottom: verticalScale(14),
  },
  progressTitle: {
    fontSize: moderateFontScale(10),
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: verticalScale(12),
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(4),
  },
  stepNum: {
    fontSize: moderateFontScale(9),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: moderateFontScale(9),
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: scale(16),
    borderWidth: 1,
    padding: scale(16),
    marginBottom: verticalScale(16),
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
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
  fareTag: {
    backgroundColor: '#10B981',
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
  },
  fareTagText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: moderateFontScale(12),
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: verticalScale(14),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
  },
  locationTextWrap: {
    marginLeft: scale(10),
    flex: 1,
  },
  locationLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  locationVal: {
    fontSize: moderateFontScale(13),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  actionsContainer: {
    gap: verticalScale(12),
  },
  guardedButtonWrapper: {
    marginVertical: verticalScale(6),
  },
  guardLabel: {
    fontSize: moderateFontScale(10),
    fontWeight: '700',
    marginBottom: verticalScale(6),
  },
  primaryBtn: {
    height: scale(48),
    borderRadius: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingHorizontal: scale(16),
  },
  primaryBtnText: {
    fontSize: moderateFontScale(13),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  completedBanner: {
    borderRadius: scale(16),
    padding: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '900',
    marginTop: verticalScale(8),
  },
  completedSub: {
    fontSize: moderateFontScale(12),
    textAlign: 'center',
    marginTop: verticalScale(4),
  },
});
