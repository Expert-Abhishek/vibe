import NotificationModal from '@/components/NotificationModal';
import { adminState } from '@/constants/admin-state';
import { cancelTripApi, deductWalletApi, fetchCustomerTripsApi, submitWalletDeductionRequestApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TripsHistoryScreen() {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeFilter, setActiveFilter] = useState<'all' | 'cab' | 'guide'>('all');
  const [cancelTrigger, setCancelTrigger] = useState(0);
  const [backendTrips, setBackendTrips] = useState<any[]>([]);

  const session = getUserSessionSync();
  const userId = session?.id;
  const cancelledTripIdsRef = React.useRef<Set<string>>(new Set());
  const [cancelledIds, setCancelledIds] = useState<string[]>([]);

  React.useEffect(() => {
    async function loadBackendTrips() {
      try {
        if (!userId) {
          setBackendTrips([]);
          return;
        }
        const data = await fetchCustomerTripsApi(userId);
        if (Array.isArray(data) && data.length > 0) {
          const filtered = data.filter((bt: any) => bt && (!bt.customerId || String(bt.customerId) === String(userId)));
          setBackendTrips(filtered);
        } else {
          setBackendTrips([]);
        }
      } catch (e) {
        console.warn('loadBackendTrips error:', e);
        setBackendTrips([]);
      }
    }
    loadBackendTrips();
  }, [cancelTrigger, userId]);

  const colors = {
    background: isDark ? '#101014' : '#FAF8F5',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1E293B',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : '#64748B',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E8E3DA',
    amber: isDark ? '#F5C518' : '#D97706',
    success: '#10B981',
    danger: '#EF4444',
  };

  const safeBackendTrips = Array.isArray(backendTrips) ? backendTrips : [];
  const safeAdvanceBookings = Array.isArray(adminState.advanceBookings) ? adminState.advanceBookings : [];
  const safeUserTrips = Array.isArray(adminState.userTrips) ? adminState.userTrips : [];

  // Convert backend database trips
  const mappedDbTrips = safeBackendTrips
    .filter(Boolean)
    .map((bt: any, idx: number) => ({
      id: String(bt.id || `db_trip_${idx}`),
      type: (bt.tripType || bt.trip_type || 'cab') as any,
      vehicleType: 'Verified Cab Partner',
      title: String(bt.title || 'Tour Booking'),
      route: Array.isArray(bt.destinationIds) ? bt.destinationIds : [],
      driverOrGuideName: String(bt.driverOrGuideName || bt.driver_or_guide_name || 'Assigned Partner'),
      date: bt.createdAt ? new Date(bt.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Today',
      time: bt.createdAt ? new Date(bt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
      price: Number(bt.amount) || 0,
      paymentMode: String(bt.paymentMode || bt.payment_mode || 'Cash'),
      status: cancelledTripIdsRef.current.has(String(bt.id)) ? 'Cancelled by Tourist' : String(bt.status === 'Confirmed' ? 'Upcoming' : (bt.status || 'Upcoming')),
      passengerCount: 1,
      otp: bt.otp || '8240',
      endOtp: bt.end_otp || bt.endOtp || '4321',
      pickup: bt.pickup_name || bt.pickupName || bt.title || 'Pickup Spot',
    }));

  // Convert advanceBookings to list items
  const mappedAdvance = safeAdvanceBookings
    .filter(b => b && (userId ? (String(b.assignedToId) === String(userId) || (b.touristName && String(b.touristName).includes(session?.name || ''))) : false))
    .map((b: any) => ({
      id: String(b.id),
      type: b.type === 'guide' ? ('guide' as const) : ('cab' as const),
      vehicleType: undefined as string | undefined,
      title: String(b.title || 'Advance Booking'),
      route: Array.isArray(b.route) ? b.route : [],
      driverOrGuideName: String(b.driverOrGuideName || 'Captain'),
      date: `Upcoming - ${b.date || ''}`,
      time: String(b.time || ''),
      price: Number(b.price) || 0,
      paymentMode: String(b.paymentMode || 'Cash'),
      status: cancelledTripIdsRef.current.has(String(b.id)) ? 'Cancelled by Tourist' : String(b.status || 'Upcoming') as any,
      rawBooking: b,
      passengerCount: undefined as number | undefined,
      otp: b.otp || b.rawBooking?.otp || '8240',
      endOtp: b.endOtp || b.rawBooking?.endOtp || '4321',
      pickup: b.pickup || b.title || 'Pickup Spot',
    }));

  const filteredUserTrips = safeUserTrips
    .filter(t => t && (!userId || !t.customerId || String(t.customerId) === String(userId)))
    .map((t: any) => ({
      id: String(t.id),
      type: String(t.type || 'guide'),
      vehicleType: t.vehicleType,
      title: String(t.title || 'Tour Request'),
      route: Array.isArray(t.route) ? t.route : [],
      driverOrGuideName: String(t.driverOrGuideName || 'Local Guide'),
      date: String(t.date || 'Today'),
      time: String(t.time || 'Immediate'),
      price: Number(t.price) || 0,
      paymentMode: String(t.paymentMode || 'Wallet'),
      status: cancelledTripIdsRef.current.has(String(t.id)) ? 'Cancelled by Tourist' : String(t.status || 'Pending Guide Confirmation'),
      passengerCount: t.passengerCount,
      advanceDepositPaid: t.advanceDepositPaid,
      remainingCashBalance: t.remainingCashBalance,
      otp: t.otp || '8240',
      endOtp: t.endOtp || '4321',
      pickup: t.pickupName || t.pickup || t.title || 'Pickup Spot',
    }));

  const rawAllTrips = [...mappedDbTrips, ...mappedAdvance, ...filteredUserTrips].filter(Boolean);
  const allTrips = rawAllTrips.filter(
    (item, index, self) => item && item.id && index === self.findIndex(t => t && String(t.id) === String(item.id))
  );

  const filteredTrips = allTrips.filter((trip) => {
    if (!trip) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'cab') return trip.type === 'cab' || trip.type === 'custom_trip' || trip.type === 'plan';
    if (activeFilter === 'guide') return trip.type === 'guide';
    return true;
  });

  const activeTrips = allTrips.filter(t => {
    if (!t) return false;
    const tid = String(t.id);
    if (cancelledTripIdsRef.current.has(tid) || cancelledIds.includes(tid)) return false;
    const st = String(t.status || '').toLowerCase();
    return !st.includes('cancel') && !st.includes('decline') && !st.includes('complete') && !st.includes('finish');
  });
  const primaryActiveTrip = activeTrips.length > 0 ? activeTrips[0] : null;

  const totalSpend = allTrips.reduce((sum, item) => sum + (Number(item?.price) || 0), 0);
  const cabCount = allTrips.filter((t) => t && (t.type === 'cab' || t.type === 'custom_trip' || t.type === 'plan')).length;
  const guideCount = allTrips.filter((t) => t && t.type === 'guide').length;

  const getStatusBadgeColors = (statusStr?: string) => {
    const st = String(statusStr || '').toLowerCase();
    if (st.includes('accepted')) {
      return { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981' };
    }
    if (st.includes('declined') || st.includes('cancelled')) {
      return { bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444' };
    }
    if (st.includes('pending')) {
      return { bg: 'rgba(245, 197, 24, 0.12)', text: '#F5C518' };
    }
    return { bg: 'rgba(59, 130, 246, 0.12)', text: '#3B82F6' };
  };

  const calculateCancellationFine = (trip: any): { feeAmount: number; feePercent: number; reasonText: string } => {
    if (!trip) return { feeAmount: 0, feePercent: 0, reasonText: 'No cancellation fee' };

    const isGuide = trip.type === 'guide' || String(trip.title || '').toLowerCase().includes('guide');
    const price = Number(trip.price || trip.amount || 0);

    if (isGuide) {
      return { feeAmount: 100, feePercent: 0, reasonText: 'Flat ₹100 Guide Booking Cancellation Fine' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const bookingDateStr = trip.bookingDate || (trip.createdAt ? new Date(trip.createdAt).toISOString().split('T')[0] : todayStr);
    let tripDateStr = todayStr;
    if (trip.date) {
      const rawDate = String(trip.date).replace('Upcoming - ', '').trim();
      if (rawDate.includes('-')) {
        tripDateStr = rawDate;
      }
    }

    // 1. Same-day booking cancellation: ₹0 fine
    if (todayStr === bookingDateStr) {
      return {
        feeAmount: 0,
        feePercent: 0,
        reasonText: 'Same-Day Booking Cancellation (₹0 Fine / 0% Deduction)',
      };
    }

    // 2. Compare cancellation date vs trip start date
    const cancellationDate = new Date(todayStr);
    const tripStartDate = new Date(tripDateStr);
    const diffMs = tripStartDate.getTime() - cancellationDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Cancelled on trip start day
    if (diffDays <= 0) {
      const fee = Math.round(price * 0.20);
      return {
        feeAmount: fee,
        feePercent: 20,
        reasonText: `Trip Start Day Cancellation (20% Fee = ₹${fee})`,
      };
    }

    // Cancelled 1 day before trip start date
    if (diffDays === 1) {
      const fee = Math.round(price * 0.10);
      return {
        feeAmount: fee,
        feePercent: 10,
        reasonText: `1 Day Prior Cancellation (10% Fee = ₹${fee})`,
      };
    }

    // Cancelled 2+ days before trip start date: ₹0 fine
    return {
      feeAmount: 0,
      feePercent: 0,
      reasonText: 'Advance Cancellation (₹0 Fine / 0% Deduction)',
    };
  };

  const handleCancelPress = (trip: any) => {
    if (!trip) return;
    cancelledTripIdsRef.current.add(String(trip.id));

    const policy = calculateCancellationFine(trip);
    const alertTitle = 'Confirm Trip Cancellation';
    const alertMsg = `Trip: ${trip.title}\n\nCancellation Policy: ${policy.reasonText}\nFee Amount: ₹${policy.feeAmount}\n\n${policy.feeAmount > 0 ? `Note: ₹${policy.feeAmount} fee will be deducted from your wallet and logged in Admin Panel.` : 'No cancellation fee applied.'}`;

    Alert.alert(
      alertTitle,
      alertMsg,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Confirm Cancel',
          style: 'destructive',
          onPress: async () => {
            cancelledTripIdsRef.current.add(String(trip.id));
            setCancelledIds(prev => [...prev, String(trip.id)]);

            if (policy.feeAmount > 0) {
              try {
                // 1. Deduct calculated fine from Tourist Wallet
                const deductRes = await deductWalletApi({
                  userId: userId || 't1',
                  amount: policy.feeAmount,
                  description: `Cancellation Fee: ${policy.reasonText} for Booking #${trip.id}`,
                });

                // 2. Submit Wallet Deduction Request for Admin Panel ONLY if deduction succeeded
                if (deductRes && deductRes.success) {
                  await submitWalletDeductionRequestApi({
                    userId: userId || 't1',
                    userName: session?.name || 'Tourist Client',
                    role: 'tourist',
                    amount: policy.feeAmount,
                    description: `Cancellation Fee (${policy.reasonText}) for Booking #${trip.id} (${trip.title})`,
                  });
                }
              } catch (e) {
                console.warn('Cancellation fine deduction warning:', e);
              }
            }

            // 3. Persist cancellation in backend PostgreSQL DB
            try {
              await cancelTripApi(String(trip.id), { cancelledBy: 'tourist', role: 'tourist' });
            } catch (e) {
              console.warn('cancelTripApi call failed:', e);
            }

            // 4. Update local state & adminState
            if (Array.isArray(adminState.advanceBookings)) {
              adminState.advanceBookings.forEach((b: any) => {
                if (b && String(b.id) === String(trip.id)) {
                  b.status = 'Cancelled by Tourist';
                }
              });
            }
            if (Array.isArray(adminState.userTrips)) {
              adminState.userTrips.forEach((t: any) => {
                if (t && String(t.id) === String(trip.id)) {
                  t.status = 'Cancelled by Tourist';
                }
              });
            }

            setBackendTrips((prev) =>
              prev.map((t) => (String(t.id) === String(trip.id) ? { ...t, status: 'Cancelled by Tourist' } : t))
            );

            const confirmationMsg = policy.feeAmount > 0 
              ? `Your trip has been cancelled. ₹${policy.feeAmount} cancellation fee (${policy.reasonText}) was deducted from your wallet.`
              : 'Your trip has been cancelled successfully with ₹0 cancellation fee.';
            Alert.alert('Trip Cancelled', confirmationMsg);
            setCancelTrigger((prev) => prev + 1);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Trips</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>Upcoming trip</Text>
        </View>
        <NotificationModal role="tourist" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* TOP ACTIVE TRIP FEATURED CARD */}
        {primaryActiveTrip && (
          <View style={[styles.activeCard, { backgroundColor: isDark ? '#1A2234' : '#EBF5FF', borderColor: isDark ? '#2563EB' : '#93C5FD' }]}>
            <View style={styles.activeHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                <View style={styles.pulsingDot} />
                <Text style={[styles.activeTagText, { color: '#2563EB' }]}>LIVE ACTIVE TRIP</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: primaryActiveTrip.status?.toLowerCase().includes('started') ? '#10B981' : '#F5C518' }]}>
                <Text style={styles.statusPillText}>{String(primaryActiveTrip.status || 'Active').toUpperCase()}</Text>
              </View>
            </View>

            <Text style={[styles.activeTripTitle, { color: colors.textPrimary }]}>{primaryActiveTrip.title}</Text>

            <View style={styles.activeDetailRow}>
              <MaterialIcons name="person" size={scale(16)} color={colors.amber} />
              <Text style={[styles.activeDetailText, { color: colors.textPrimary }]}>
                Partner: <Text style={{ fontWeight: '800' }}>{primaryActiveTrip.driverOrGuideName}</Text>
              </Text>
            </View>

            {/* OTP DISPLAY BOX */}
            <View style={[styles.otpBox, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
              <View style={styles.otpColumn}>
                <Text style={[styles.otpLabel, { color: colors.textMuted }]}>START TRIP OTP</Text>
                <Text style={[styles.otpValue, { color: '#10B981' }]}>{primaryActiveTrip.otp || '8240'}</Text>
              </View>
              <View style={{ width: 1, height: '80%', backgroundColor: colors.border }} />
              <View style={styles.otpColumn}>
                <Text style={[styles.otpLabel, { color: colors.textMuted }]}>END TRIP OTP</Text>
                <Text style={[styles.otpValue, { color: '#3B82F6' }]}>{primaryActiveTrip.endOtp || '4321'}</Text>
              </View>
            </View>

            {/* MAP ROUTE PREVIEW */}
            <View style={[styles.routeBox, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                <MaterialIcons name="my-location" size={scale(14)} color="#10B981" />
                <Text style={[styles.routeText, { color: colors.textPrimary }]} numberOfLines={1}>
                  Pickup: {primaryActiveTrip.pickup || primaryActiveTrip.title}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: verticalScale(4) }}>
                <MaterialIcons name="location-on" size={scale(14)} color="#EF4444" />
                <Text style={[styles.routeText, { color: colors.textPrimary }]} numberOfLines={1}>
                  Fare ₹{primaryActiveTrip.price} · {primaryActiveTrip.paymentMode}
                </Text>
              </View>
            </View>

            {/* ACTION BUTTONS */}
            <View style={{ flexDirection: 'row', gap: scale(10), marginTop: verticalScale(12) }}>
              <TouchableOpacity
                style={[styles.activeActionBtn, { backgroundColor: '#10B981', flex: 1 }]}
                onPress={() => Alert.alert('Contact Partner', `Calling ${primaryActiveTrip.driverOrGuideName}...`)}
              >
                <MaterialIcons name="call" size={scale(16)} color="#FFFFFF" />
                <Text style={styles.activeActionBtnText}>Call Partner</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.activeActionBtn, { backgroundColor: '#EF4444', paddingHorizontal: scale(14) }]}
                onPress={() => handleCancelPress(primaryActiveTrip)}
              >
                <MaterialIcons name="cancel" size={scale(16)} color="#FFFFFF" />
                <Text style={styles.activeActionBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}


        {/* Filter Pills list */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterPillText, { color: activeFilter === 'all' ? '#101010' : colors.textPrimary }]}>
              All Bookings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'cab' && styles.filterPillActive]}
            onPress={() => setActiveFilter('cab')}
          >
            <Text style={[styles.filterPillText, { color: activeFilter === 'cab' ? '#101010' : colors.textPrimary }]}>
              Cabs & Plans
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'guide' && styles.filterPillActive]}
            onPress={() => setActiveFilter('guide')}
          >
            <Text style={[styles.filterPillText, { color: activeFilter === 'guide' ? '#101010' : colors.textPrimary }]}>
              Guides Booked
            </Text>
          </TouchableOpacity>
        </View>

        {/* History timeline Cards list */}
        {filteredTrips.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <MaterialIcons name="navigation" size={scale(36)} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(13), marginTop: scale(8) }}>
              No upcoming trips found.
            </Text>
          </View>
        ) : (
          filteredTrips.map((trip, idx) => {
            if (!trip) return null;
            const isCab = trip.type === 'cab' || trip.type === 'custom_trip' || trip.type === 'plan';
            const isCompleted = String(trip.status || '').toLowerCase() === 'completed';
            const isCancelled = String(trip.status || '').toLowerCase().includes('cancel');
            const badgeColors = getStatusBadgeColors(trip.status);

            const payModeStr = String(trip.paymentMode || 'Wallet');
            const isCash = payModeStr.toLowerCase().includes('cash');

            return (
              <View
                key={`${trip.id || 'trip'}_${idx}`}
                style={[
                  styles.tripCard,
                  {
                    backgroundColor: isCancelled ? (isDark ? 'rgba(239, 68, 68, 0.05)' : '#FFF5F5') : colors.surface,
                    borderColor: isCancelled ? 'rgba(239, 68, 68, 0.35)' : colors.border,
                  },
                ]}
              >
                {/* Card Title Header */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.titleIconCol}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: isCancelled
                            ? 'rgba(239, 68, 68, 0.15)'
                            : isCab
                              ? 'rgba(245,197,24,0.1)'
                              : 'rgba(16, 185, 129, 0.1)',
                        },
                      ]}
                    >
                      {isCancelled ? (
                        <MaterialIcons name="cancel" size={scale(18)} color="#EF4444" />
                      ) : (trip.type as string) === 'auto' ? (
                        <MaterialIcons name="electric-rickshaw" size={scale(16)} color={colors.amber} />
                      ) : (
                        <FontAwesome5
                          name={isCab ? (trip.type === 'custom_trip' ? 'map-marked-alt' : 'car') : 'compass'}
                          size={scale(14)}
                          color={isCab ? colors.amber : '#10B981'}
                        />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tripNameText, { color: isCancelled ? '#EF4444' : colors.textPrimary }]} numberOfLines={2}>
                        {trip.title}
                      </Text>
                      <Text style={[styles.tripDateSub, { color: colors.textMuted }]}>
                        {trip.date} · {trip.time}
                      </Text>
                    </View>
                  </View>

                  {/* Status indicator */}
                  <View style={[styles.statusBadge, { backgroundColor: badgeColors.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: badgeColors.text }]}>
                      {isCancelled ? '🚫 Cancelled by you' : (trip.status || 'Upcoming')}
                    </Text>
                  </View>
                </View>

                {/* Cancelled Alert Banner */}
                {isCancelled && (
                  <View
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      paddingHorizontal: scale(10),
                      paddingVertical: verticalScale(8),
                      borderRadius: scale(10),
                      marginTop: verticalScale(10),
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: scale(8),
                      borderWidth: 1,
                      borderColor: 'rgba(239, 68, 68, 0.2)',
                    }}
                  >
                    <MaterialIcons name="info" size={scale(16)} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontSize: moderateFontScale(11), fontWeight: '700', flex: 1 }}>
                      Trip Cancelled by Tourist · Fine Deducted & Notified to Admin
                    </Text>
                  </View>
                )}

                {/* Waypoints line visual if it is a cab route */}
                {isCab && Array.isArray(trip.route) && trip.route.length > 0 && (
                  <View style={styles.routeSection}>
                    {trip.route.map((stop: string, idx: number) => {
                      const isLast = idx === trip.route.length - 1;
                      return (
                        <View key={idx} style={styles.routeNodeItem}>
                          <View style={styles.nodeIndicator}>
                            <View style={[styles.nodeIndicatorDot, { backgroundColor: idx === 0 ? colors.amber : (isLast ? '#ef4444' : '#888') }]} />
                            {!isLast && <View style={[styles.nodeIndicatorLine, { backgroundColor: colors.border }]} />}
                          </View>
                          <Text style={[styles.nodeAddressName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {stop}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Service details row */}
                <View style={[styles.detailsSection, { borderTopColor: colors.border }]}>
                  {/* Left col info */}
                  <View>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                      {isCab ? 'Assigned Driver' : 'Tour Guide Name'}
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {trip.driverOrGuideName || 'Local Guide'}
                    </Text>
                    {trip.vehicleType && (
                      <Text style={[styles.vehicleModelLabel, { color: colors.textMuted }]}>
                        {trip.vehicleType}
                      </Text>
                    )}
                    {trip.passengerCount !== undefined && (
                      <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), marginTop: verticalScale(2) }}>
                        Passengers: {trip.passengerCount}
                      </Text>
                    )}
                  </View>

                  {/* Right col info */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Expenses</Text>
                    <Text style={[styles.detailPrice, isCancelled && { color: '#EF4444' }]}>₹{trip.price}</Text>
                    <Text style={[styles.payMethodVal, { color: isCash ? colors.amber : colors.textMuted }]}>
                      {isCash ? payModeStr : `Paid via ${payModeStr}`}
                    </Text>
                  </View>
                </View>

                {/* Cancellation button for upcoming schedules */}
                {!isCompleted && !isCancelled && (
                  <View style={[styles.ratingSection, { borderTopColor: colors.border }]}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>SCHEDULED STATUS</Text>
                    <TouchableOpacity
                      style={[styles.rebookBtn, { backgroundColor: '#ef4444' }]}
                      onPress={() => handleCancelPress(trip)}
                    >
                      <Text style={[styles.rebookBtnText, { color: '#ffffff' }]}>Cancel Trip</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isCancelled && (
                  <View style={[styles.ratingSection, { borderTopColor: colors.border }]}>
                    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>CANCELLATION STATUS</Text>
                    <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: scale(8) }}>
                      <Text style={{ color: '#EF4444', fontSize: moderateFontScale(10), fontWeight: '800' }}>CANCELLED BY TOURIST</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Space */}
        <View style={{ height: verticalScale(30) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101014',
  },
  header: {
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(12),
  },
  headerTitle: {
    fontSize: moderateFontScale(22),
    fontWeight: '900',
  },
  headerSub: {
    fontSize: moderateFontScale(12),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  scrollContent: {
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(20),
  },
  summaryCard: {
    borderRadius: scale(18),
    padding: scale(16),
    marginBottom: verticalScale(16),
    elevation: 2,
  },
  summaryTitle: {
    fontSize: moderateFontScale(11),
    color: '#888',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontSize: moderateFontScale(28),
    color: '#F5C518',
    fontWeight: '900',
    marginTop: verticalScale(4),
  },
  summaryDivider: {
    height: 1,
    marginVertical: verticalScale(12),
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  statValue: {
    fontSize: moderateFontScale(12),
    fontWeight: '800',
  },
  statLabel: {
    fontSize: moderateFontScale(10),
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(14),
  },
  filterPill: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  filterPillActive: {
    backgroundColor: '#F5C518',
  },
  filterPillText: {
    fontSize: moderateFontScale(12),
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: scale(18),
    padding: scale(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripCard: {
    borderRadius: scale(18),
    borderWidth: 1,
    padding: scale(14),
    marginBottom: verticalScale(14),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleIconCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flex: 1,
  },
  iconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripNameText: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  tripDateSub: {
    fontSize: moderateFontScale(11),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
  },
  statusBadgeText: {
    fontSize: moderateFontScale(10),
    fontWeight: '800',
  },
  routeSection: {
    marginTop: verticalScale(12),
    paddingLeft: scale(6),
  },
  routeNodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    height: verticalScale(22),
  },
  nodeIndicator: {
    alignItems: 'center',
    width: scale(12),
  },
  nodeIndicatorDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  nodeIndicatorLine: {
    width: 1,
    height: verticalScale(14),
  },
  nodeAddressName: {
    fontSize: moderateFontScale(11.5),
    fontWeight: '600',
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: verticalScale(12),
    paddingTop: verticalScale(10),
  },
  detailLabel: {
    fontSize: moderateFontScale(10),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  vehicleModelLabel: {
    fontSize: moderateFontScale(10.5),
    fontWeight: '600',
  },
  detailPrice: {
    fontSize: moderateFontScale(16),
    fontWeight: '900',
    color: '#F5C518',
    marginTop: verticalScale(2),
  },
  payMethodVal: {
    fontSize: moderateFontScale(10.5),
    fontWeight: '700',
    marginTop: verticalScale(2),
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: verticalScale(10),
    paddingTop: verticalScale(8),
  },
  rebookBtn: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(10),
  },
  rebookBtnText: {
    fontSize: moderateFontScale(11),
    fontWeight: '800',
  },
  activeCard: {
    padding: scale(14),
    borderRadius: scale(16),
    borderWidth: 1.5,
    marginBottom: verticalScale(16),
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  pulsingDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#2563EB',
  },
  activeTagText: {
    fontSize: moderateFontScale(11),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: moderateFontScale(9.5),
    fontWeight: '800',
  },
  activeTripTitle: {
    fontSize: moderateFontScale(15),
    fontWeight: '800',
    marginBottom: verticalScale(6),
  },
  activeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(10),
  },
  activeDetailText: {
    fontSize: moderateFontScale(12),
  },
  otpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
    borderWidth: 1,
    marginBottom: verticalScale(10),
  },
  otpColumn: {
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: moderateFontScale(9.5),
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: verticalScale(2),
  },
  otpValue: {
    fontSize: moderateFontScale(18),
    fontWeight: '900',
    letterSpacing: 2,
  },
  routeBox: {
    padding: scale(10),
    borderRadius: scale(10),
  },
  routeText: {
    fontSize: moderateFontScale(11.5),
    fontWeight: '600',
    flex: 1,
  },
  activeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: verticalScale(10),
    borderRadius: scale(10),
  },
  activeActionBtnText: {
    color: '#FFFFFF',
    fontSize: moderateFontScale(12),
    fontWeight: '800',
  },
});
