import NotificationModal from '@/components/NotificationModal';
import { adminState } from '@/constants/admin-state';
import { cancelTripApi, deductWalletApi, fetchActiveTripApi, fetchCustomerTripsApi, submitWalletDeductionRequestApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { initSocketService, getSocket } from '@src/services/socketService';
import { calculateTripFare, validatePreBookedDispatch } from '@src/services/fareCalculator';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface TripItem {
  id: string;
  type: 'cab' | 'guide' | 'custom_trip' | 'plan' | 'auto';
  vehicleType?: string;
  title: string;
  route?: string[];
  driverOrGuideName?: string;
  date: string;
  time: string;
  price: number;
  paymentMode?: string;
  status: string;
  passengerCount?: number;
  advanceDepositPaid?: number;
  remainingCashBalance?: number;
  otp?: string;
  endOtp?: string;
  pickup?: string;
  createdAt?: string;
  bookingType?: 'INSTANT' | 'PRE_BOOKED';
}

export default function TripsHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeFilter, setActiveFilter] = useState<'all' | 'cab' | 'guide'>('all');
  const [cancelTrigger, setCancelTrigger] = useState(0);
  const [backendTrips, setBackendTrips] = useState<any[]>([]);
  const [hasActiveTripState, setHasActiveTripState] = useState<boolean | null>(null);
  const [activeTripData, setActiveTripData] = useState<any>(null);
  const [selectedItineraryTrip, setSelectedItineraryTrip] = useState<TripItem | null>(null);

  const session = getUserSessionSync();
  const userId = session?.id;
  const cancelledTripIdsRef = useRef<Set<string>>(new Set());
  const [cancelledIds, setCancelledIds] = useState<string[]>([]);

  useEffect(() => {
    initSocketService(userId, session?.role || 'tourist');
    const socket = getSocket();

    async function loadBackendTrips() {
      try {
        if (!userId) {
          setBackendTrips([]);
          setHasActiveTripState(false);
          setActiveTripData(null);
          return;
        }
        const activeRes = await fetchActiveTripApi(userId);
        setHasActiveTripState(activeRes.hasActiveTrip);
        if (activeRes.hasActiveTrip && activeRes.trip) {
          setActiveTripData(activeRes.trip);
        } else {
          setActiveTripData(null);
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
        setActiveTripData(null);
      }
    }
    loadBackendTrips();

    const handleTripUpdate = (data?: any) => {
      console.log('[TripsScreen] 🔔 Real-time socket/emitter trip update received:', data);
      if (data) {
        const tripId = String(data.tripId || data.id || '');
        const newStatus = String(data.status || 'accepted').toLowerCase();
        const driverName = data.driverName || data.driver_or_guide_name || data.driverDetails?.name;

        adminState.userTrips.forEach(t => {
          if (t && String(t.id) === tripId) {
            t.status = newStatus;
            if (driverName) t.driverOrGuideName = driverName;
          }
        });
        adminState.advanceBookings.forEach(b => {
          if (b && String(b.id) === tripId) {
            b.status = newStatus;
            if (driverName) b.driverOrGuideName = driverName;
          }
        });
      }
      loadBackendTrips();
    };

    if (socket) {
      socket.on('trip_completed', handleTripUpdate);
      socket.on('trip_status_updated', handleTripUpdate);
      socket.on('trip_accepted', handleTripUpdate);
      socket.on('RIDE_ACCEPTED', handleTripUpdate);
    }

    const subStatus = DeviceEventEmitter.addListener('trip_status_updated', handleTripUpdate);
    const subAccepted = DeviceEventEmitter.addListener('trip_accepted', handleTripUpdate);
    const subRideAcc = DeviceEventEmitter.addListener('RIDE_ACCEPTED', handleTripUpdate);
    const subComp = DeviceEventEmitter.addListener('trip_completed', handleTripUpdate);

    return () => {
      if (socket) {
        socket.off('trip_completed', handleTripUpdate);
        socket.off('trip_status_updated', handleTripUpdate);
        socket.off('trip_accepted', handleTripUpdate);
        socket.off('RIDE_ACCEPTED', handleTripUpdate);
      }
      subStatus.remove();
      subAccepted.remove();
      subRideAcc.remove();
      subComp.remove();
    };
  }, [cancelTrigger, userId]);

  const colors = {
    background: isDark ? '#101014' : '#FAF8F5',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1E293B',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : '#64748B',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2DCD0',
    amber: isDark ? '#F5C518' : '#D97706',
    success: '#10B981',
    danger: '#EF4444',
  };

  const safeBackendTrips = Array.isArray(backendTrips) ? backendTrips : [];
  const safeAdvanceBookings = Array.isArray(adminState.advanceBookings) ? adminState.advanceBookings : [];
  const safeUserTrips = Array.isArray(adminState.userTrips) ? adminState.userTrips : [];

  // Convert backend database trips
  const mappedDbTrips: TripItem[] = safeBackendTrips
    .filter(Boolean)
    .map((bt: any, idx: number) => ({
      id: String(bt.id || `db_trip_${idx}`),
      type: (bt.tripType || bt.trip_type || 'cab') as any,
      vehicleType: 'Verified Partner',
      title: String(bt.title || 'Tour Booking'),
      route: Array.isArray(bt.destinationIds) ? bt.destinationIds : (bt.pickup_name && bt.drop_name ? [bt.pickup_name, bt.drop_name] : []),
      driverOrGuideName: String(bt.driverOrGuideName || bt.driver_or_guide_name || 'Assigned Partner'),
      date: bt.createdAt ? new Date(bt.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today',
      time: bt.createdAt ? new Date(bt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
      price: Number(bt.amount) || 0,
      paymentMode: String(bt.paymentMode || bt.payment_mode || 'Cash'),
      status: String(bt.status || 'Scheduled'),
      passengerCount: 1,
      otp: bt.otp,
      endOtp: bt.end_otp || bt.endOtp,
      pickup: bt.pickup_name || bt.pickupName || bt.title || 'Pickup Spot',
      createdAt: bt.createdAt,
      bookingType: bt.booking_type || bt.bookingType || 'INSTANT',
    }));

  // Convert advanceBookings
  const mappedAdvance: TripItem[] = safeAdvanceBookings
    .filter(b => b && (userId ? (String(b.assignedToId) === String(userId) || (b.touristName && String(b.touristName).includes(session?.name || ''))) : false))
    .map((b: any) => ({
      id: String(b.id),
      type: b.type === 'guide' ? 'guide' : 'cab',
      title: String(b.title || 'Advance Booking'),
      route: Array.isArray(b.route) ? b.route : [],
      driverOrGuideName: String(b.driverOrGuideName || 'Captain'),
      date: `${b.date || 'Upcoming'}`,
      time: String(b.time || ''),
      price: Number(b.price) || 0,
      paymentMode: String(b.paymentMode || 'Cash'),
      status: String(b.status || 'Pre-Booked'),
      passengerCount: 1,
      otp: b.otp,
      endOtp: b.endOtp,
      pickup: b.pickup || b.title || 'Pickup Spot',
      bookingType: 'PRE_BOOKED',
    }));

  const filteredUserTrips: TripItem[] = safeUserTrips
    .filter(t => t && (!userId || !t.customerId || String(t.customerId) === String(userId)))
    .map((t: any) => {
      const parsedType = String(t.type || t.trip_type || 'cab');
      return {
        id: String(t.id),
        type: (parsedType === 'guide' ? 'guide' : 'cab') as any,
        vehicleType: t.vehicleType,
        title: String(t.title || 'Cab Booking'),
        route: Array.isArray(t.route) ? t.route : [],
        driverOrGuideName: String(t.driverOrGuideName || (parsedType === 'guide' ? 'Local Guide' : 'Assigned Captain')),
        date: String(t.date || 'Today'),
        time: String(t.time || 'Immediate'),
        price: Number(t.price) || 0,
        paymentMode: String(t.paymentMode || 'Wallet'),
        status: String(t.status || 'Pending'),
        passengerCount: t.passengerCount,
        advanceDepositPaid: t.advanceDepositPaid,
        remainingCashBalance: t.remainingCashBalance,
        otp: t.otp,
        endOtp: t.endOtp,
        pickup: t.pickupName || t.pickup || t.title || 'Pickup Spot',
        bookingType: t.bookingType || 'INSTANT',
      };
    });

  const rawAllTrips = [...mappedDbTrips, ...mappedAdvance, ...filteredUserTrips].filter(Boolean);
  
  // Deduplicate and prefer Accepted/in_progress over Pending
  const validTrips = rawAllTrips
    .reduce((acc: TripItem[], current) => {
      if (!current || !current.id) return acc;
      const existingIdx = acc.findIndex(t => String(t.id) === String(current.id));
      if (existingIdx === -1) {
        acc.push(current);
      } else {
        const existingSt = String(acc[existingIdx].status || '').toLowerCase();
        const currentSt = String(current.status || '').toLowerCase();
        if (existingSt === 'pending' && currentSt !== 'pending') {
          acc[existingIdx] = current;
        }
      }
      return acc;
    }, [])
    .filter((t) => {
      if (!t) return false;
      const tid = String(t.id);
      if (cancelledTripIdsRef.current.has(tid) || cancelledIds.includes(tid)) return false;
      const st = String(t.status || '').toLowerCase();
      return !st.includes('cancel') && !st.includes('decline') && !st.includes('complete') && !st.includes('finish') && st !== 'done';
    });

  const isNonCompleted = (statusStr: string) => {
    const st = String(statusStr || '').toLowerCase();
    return !st.includes('cancel') && !st.includes('decline') && !st.includes('complete') && !st.includes('finish') && st !== 'done';
  };

  const activeTripObj = hasActiveTripState === false
    ? null
    : (activeTripData || (validTrips.length > 0 ? validTrips.find(t => isNonCompleted(t.status)) || null : null));

  const scheduledTrips = validTrips.filter(t => {
    if (activeTripObj && String(t.id) === String(activeTripObj.id)) return false;
    return true;
  }).filter(t => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'cab') return t.type === 'cab' || t.type === 'custom_trip' || t.type === 'plan';
    if (activeFilter === 'guide') return t.type === 'guide';
    return true;
  });

  const calculateCancellationFine = (trip: any): { feeAmount: number; feePercent: number; reasonText: string } => {
    if (!trip) return { feeAmount: 0, feePercent: 0, reasonText: 'No cancellation fee' };
    const isGuide = trip.type === 'guide' || String(trip.title || '').toLowerCase().includes('guide');
    const price = Number(trip.price || trip.amount || 0);

    if (isGuide) {
      return { feeAmount: 100, feePercent: 0, reasonText: 'Flat ₹100 Guide Cancellation Fine' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const bookingDateStr = trip.bookingDate || (trip.createdAt ? new Date(trip.createdAt).toISOString().split('T')[0] : todayStr);

    if (todayStr === bookingDateStr) {
      return { feeAmount: 0, feePercent: 0, reasonText: 'Same-Day Booking Cancellation (₹0 Fine)' };
    }

    const cancellationDate = new Date(todayStr);
    const tripStartDate = new Date(trip.date || todayStr);
    const diffMs = tripStartDate.getTime() - cancellationDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      const fee = Math.round(price * 0.20);
      return { feeAmount: fee, feePercent: 20, reasonText: `Same-Day Start Cancellation (20% Fee = ₹${fee})` };
    }
    if (diffDays === 1) {
      const fee = Math.round(price * 0.10);
      return { feeAmount: fee, feePercent: 10, reasonText: `1 Day Prior Cancellation (10% Fee = ₹${fee})` };
    }

    return { feeAmount: 0, feePercent: 0, reasonText: 'Advance Cancellation (₹0 Fine)' };
  };

  const handleCancelPress = (trip: any) => {
    if (!trip) return;
    const { feeAmount, reasonText } = calculateCancellationFine(trip);

    Alert.alert(
      'Cancel Booking?',
      `Are you sure you want to cancel this booking?\n\n📌 Trip: ${trip.title}\n💰 Cancellation Policy: ${reasonText}${feeAmount > 0 ? `\n\n⚠️ ₹${feeAmount} cancellation fee will be deducted.` : ''}`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Confirm Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const tid = String(trip.id);
              cancelledTripIdsRef.current.add(tid);
              setCancelledIds(prev => [...prev, tid]);

              await cancelTripApi(tid, 'Cancelled by user', 'user');

              if (feeAmount > 0) {
                try {
                  await submitWalletDeductionRequestApi(
                    userId || 'customer',
                    feeAmount,
                    `Cancellation Fee for Trip #${tid}`
                  );
                } catch (e) {
                  console.warn('Wallet deduction error:', e);
                }
              }

              if (hasActiveTripState && activeTripData && String(activeTripData.id) === tid) {
                setHasActiveTripState(false);
                setActiveTripData(null);
              }

              adminState.userTrips = adminState.userTrips.filter(t => String(t.id) !== tid);
              adminState.advanceBookings = adminState.advanceBookings.filter(b => String(b.id) !== tid);

              Alert.alert('Booking Cancelled', 'Your booking has been cancelled and recorded in your History ledger.');
              setCancelTrigger(prev => prev + 1);
            } catch (e) {
              console.warn('Cancel error:', e);
              Alert.alert('Booking Cancelled', 'Your booking has been cancelled.');
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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Trips</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>Manage active rides & trip status</Text>
        </View>
        <NotificationModal role="tourist" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 1. TOP SECTION: RECTANGULAR LIVE ACTIVE TRIP CARD */}
        {activeTripObj ? (
          <View style={[styles.activeCard, { backgroundColor: isDark ? '#1C1C24' : '#FFFFFF', borderColor: colors.amber }]}>
            {/* Live Indicator Bar */}
            <View style={styles.liveBadgeRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                <View style={styles.pulsingDot} />
                <Text style={[styles.activeTagText, { color: colors.amber }]}>LIVE RIDE IN PROGRESS</Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: 'rgba(245, 197, 24, 0.15)' }]}>
                <Text style={[styles.typeBadgeText, { color: colors.amber }]}>
                  {String(activeTripObj.status || 'Active').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Trip Title */}
            <Text style={{ fontSize: moderateFontScale(14), fontWeight: '900', color: colors.textPrimary, marginBottom: verticalScale(8) }} numberOfLines={1}>
              {activeTripObj.title || `${activeTripObj.pickup || 'Pickup'} ➔ ${activeTripObj.drop || 'Destination'}`}
            </Text>

            {/* Assigned Partner & Vehicle Info */}
            <View style={styles.partnerInfoRow}>
              <View style={styles.avatarCircle}>
                <FontAwesome5 name="user-tie" size={scale(16)} color={colors.amber} />
              </View>
              <View style={{ flex: 1, marginLeft: scale(10) }}>
                <Text style={[styles.partnerName, { color: colors.textPrimary }]}>
                  Captain: {activeTripObj.driverOrGuideName || activeTripObj.driverName || activeTripObj.driver_or_guide_name || 'Assigned Partner'}
                </Text>
                <Text style={[styles.partnerVehicle, { color: colors.textMuted }]}>
                  {activeTripObj.vehicleModel || 'Verified Cab'} • <Text style={{ color: colors.amber, fontWeight: '700' }}>{activeTripObj.vehicleNumber || 'KA-03-EX-8240'}</Text>
                </Text>
              </View>
            </View>

            {/* Pickup & Destination */}
            <View style={styles.locationBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                <MaterialIcons name="my-location" size={scale(16)} color="#10B981" />
                <Text style={[styles.locVal, { color: colors.textPrimary }]} numberOfLines={1}>
                  Pickup: <Text style={{ fontWeight: '700' }}>{activeTripObj.pickup || activeTripObj.pickup_name || 'Pickup Spot'}</Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: verticalScale(6) }}>
                <MaterialIcons name="place" size={scale(16)} color="#EF4444" />
                <Text style={[styles.locVal, { color: colors.textPrimary }]} numberOfLines={1}>
                  Drop: <Text style={{ fontWeight: '700' }}>{Array.isArray(activeTripObj.route) && activeTripObj.route.length > 0 ? activeTripObj.route.join(' ➔ ') : (activeTripObj.drop_name || activeTripObj.title || 'Destination')}</Text>
                </Text>
              </View>
            </View>

            {/* OTP BOX (ONLY FOR LIVE ACTIVE RIDE) */}
            <View style={[styles.otpBox, { backgroundColor: isDark ? '#111827' : '#F9FAFB', borderColor: colors.border }]}>
              <View style={styles.otpColumn}>
                <Text style={[styles.otpLabel, { color: colors.textMuted }]}>START TRIP OTP</Text>
                <Text style={[styles.otpValue, { color: '#10B981' }]}>{activeTripObj.otp || '8240'}</Text>
              </View>
              <View style={{ width: 1, height: '80%', backgroundColor: colors.border }} />
              <View style={styles.otpColumn}>
                <Text style={[styles.otpLabel, { color: colors.textMuted }]}>END TRIP OTP</Text>
                <Text style={[styles.otpValue, { color: '#3B82F6' }]}>{activeTripObj.endOtp || '4321'}</Text>
              </View>
            </View>

            {/* PRIMARY ACTION BUTTON: TRACK LIVE RIDE */}
            <View style={{ flexDirection: 'row', gap: scale(8), marginTop: verticalScale(12) }}>
              <TouchableOpacity
                style={[styles.trackBtn, { backgroundColor: colors.amber, flex: 1 }]}
                onPress={() => router.push({ pathname: '/trip-status', params: { tripId: activeTripObj.id } })}
              >
                <MaterialIcons name="navigation" size={scale(18)} color="#101014" />
                <Text style={styles.trackBtnText}>Track Live Ride 🗺️</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelBtnIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#EF4444' }]}
                onPress={() => handleCancelPress(activeTripObj)}
              >
                <MaterialIcons name="cancel" size={scale(18)} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: verticalScale(20) }]}>
            <MaterialIcons name="local-taxi" size={scale(36)} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Active Ride in Progress</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Book a cab or guide to start your journey!
            </Text>
          </View>
        )}

        {/* 2. SECOND SECTION: SCHEDULED TOURS & RIDES (COMMENTED OUT FOR NOW AS REQUESTED)
        <View style={{ marginBottom: verticalScale(14) }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: verticalScale(10) }]}>
            Scheduled Tours & Rides
          </Text>

          <View style={[styles.fullWidthFilterRow, { backgroundColor: isDark ? '#1C1C24' : '#F1EFEA', borderColor: colors.border }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.fullWidthPill, activeFilter === 'all' && styles.fullWidthPillActive]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.fullWidthPillText, { color: activeFilter === 'all' ? '#101014' : colors.textPrimary }]}>
                All Bookings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.fullWidthPill, activeFilter === 'cab' && styles.fullWidthPillActive]}
              onPress={() => setActiveFilter('cab')}
            >
              <Text style={[styles.fullWidthPillText, { color: activeFilter === 'cab' ? '#101014' : colors.textPrimary }]}>
                Cabs & Plans
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.fullWidthPill, activeFilter === 'guide' && styles.fullWidthPillActive]}
              onPress={() => setActiveFilter('guide')}
            >
              <Text style={[styles.fullWidthPillText, { color: activeFilter === 'guide' ? '#101014' : colors.textPrimary }]}>
                Guides Booked
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {scheduledTrips.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialIcons name="event-available" size={scale(36)} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Active or Upcoming Bookings</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Explore our custom packages & book your next destination!
            </Text>
          </View>
        ) : (
          scheduledTrips.map((trip, idx) => {
            const isGuide = trip.type === 'guide';
            const price = Number(trip.price || 0);
            const advancePaid = trip.advanceDepositPaid || Math.round(price * 0.20);
            const balanceDue = price - advancePaid;

            return (
              <View
                key={`${trip.id}_${idx}`}
                style={[styles.scheduledCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.schedHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.schedTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {trip.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: verticalScale(2) }}>
                      <MaterialIcons name="schedule" size={scale(14)} color={colors.amber} />
                      <Text style={[styles.schedDateText, { color: colors.amber }]}>
                        {trip.date} · {trip.time}
                      </Text>
                    </View>
                  </View>
                </View>

                {isGuide ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10), marginTop: verticalScale(8), paddingHorizontal: scale(12), paddingVertical: verticalScale(8), backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: scale(8) }}>
                    <View style={{ width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: colors.amber, justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialIcons name="person" size={scale(22)} color="#101014" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: moderateFontScale(13), fontWeight: '700', color: colors.textPrimary }}>{trip.driverOrGuideName || 'Certified Heritage Guide'}</Text>
                      <Text style={{ fontSize: moderateFontScale(11), color: colors.amber, fontWeight: '600' }}>Area & Expertise: Mysuru Heritage & Culture</Text>
                      <Text style={{ fontSize: moderateFontScale(10), color: colors.textMuted }}>Languages: English, Kannada, Hindi</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.schedRouteBox, { borderTopColor: colors.border }]}>
                    <Text style={[styles.locVal, { color: colors.textMuted }]} numberOfLines={2}>
                      📍 {trip.pickup || 'Pickup'} ➔ {Array.isArray(trip.route) && trip.route.length > 0 ? trip.route.join(' ➔ ') : 'Tour Destination'}
                    </Text>
                    <Text style={{ fontSize: moderateFontScale(11), color: colors.amber, fontWeight: '600', marginTop: verticalScale(4) }}>
                      🛣️ Distance & Route: ~35.0 km · {Array.isArray(trip.route) ? trip.route.length : 2} Checkpoints
                    </Text>
                  </View>
                )}

                <View style={[styles.financeRow, { borderTopColor: colors.border }]}>
                  <View>
                    <Text style={[styles.finLabel, { color: colors.textMuted }]}>Total Fare</Text>
                    <Text style={[styles.finVal, { color: colors.textPrimary }]}>₹{price}</Text>
                  </View>
                  <View>
                    <Text style={[styles.finLabel, { color: colors.textMuted }]}>Deposit Paid</Text>
                    <Text style={[styles.finVal, { color: '#10B981' }]}>₹{advancePaid}</Text>
                  </View>
                  <View>
                    <Text style={[styles.finLabel, { color: colors.textMuted }]}>Balance Due</Text>
                    <Text style={[styles.finVal, { color: colors.amber }]}>₹{balanceDue}</Text>
                  </View>
                </View>

                <View style={styles.schedActionsRow}>
                  <TouchableOpacity
                    style={[styles.schedActionBtn, { backgroundColor: colors.surfaceCard, borderColor: colors.border, borderWidth: 1 }]}
                    onPress={() => setSelectedItineraryTrip(trip)}
                  >
                    <Text style={[styles.schedActionText, { color: colors.textPrimary }]}>View Itinerary</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.schedActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#EF4444', borderWidth: 1 }]}
                    onPress={() => handleCancelPress(trip)}
                  >
                    <Text style={[styles.schedActionText, { color: '#EF4444' }]}>Cancel Booking</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        */}

      </ScrollView>

      {/* ITINERARY MODAL OVERLAY */}
      <Modal
        visible={selectedItineraryTrip !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedItineraryTrip(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          {selectedItineraryTrip && (
            <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), padding: scale(20), maxHeight: '85%', borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(14) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                  <MaterialIcons name="map" size={scale(22)} color={colors.amber} />
                  <Text style={{ fontSize: moderateFontScale(16), fontWeight: '900', color: colors.textPrimary }}>Trip Itinerary Details</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedItineraryTrip(null)} style={{ padding: scale(4) }}>
                  <MaterialIcons name="close" size={scale(22)} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: verticalScale(12) }}>
                {/* Header Info */}
                <View style={{ backgroundColor: isDark ? 'rgba(245, 197, 24, 0.08)' : 'rgba(245, 197, 24, 0.1)', padding: scale(14), borderRadius: scale(14), borderWidth: 1, borderColor: colors.amber }}>
                  <Text style={{ fontSize: moderateFontScale(16), fontWeight: '800', color: colors.textPrimary }}>{selectedItineraryTrip.title}</Text>
                  <Text style={{ fontSize: moderateFontScale(12), color: colors.amber, fontWeight: '700', marginTop: verticalScale(4) }}>
                    📅 {selectedItineraryTrip.date} at {selectedItineraryTrip.time}
                  </Text>
                  <Text style={{ fontSize: moderateFontScale(11), color: colors.textMuted, marginTop: 2 }}>Booking ID: #{selectedItineraryTrip.id}</Text>
                </View>

                {/* Partner Details */}
                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F9FB', padding: scale(14), borderRadius: scale(14), borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: moderateFontScale(11), fontWeight: '800', color: colors.textMuted, marginBottom: verticalScale(6) }}>ASSIGNED PARTNER</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
                    <View style={{ width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: colors.amber, justifyContent: 'center', alignItems: 'center' }}>
                      <MaterialIcons name="person" size={scale(20)} color="#101014" />
                    </View>
                    <View>
                      <Text style={{ fontSize: moderateFontScale(13), fontWeight: '700', color: colors.textPrimary }}>{selectedItineraryTrip.driverOrGuideName || 'Assigned Partner'}</Text>
                      <Text style={{ fontSize: moderateFontScale(11), color: colors.amber }}>{selectedItineraryTrip.type === 'guide' ? 'Certified Heritage Guide' : 'Verified Captain'}</Text>
                    </View>
                  </View>
                </View>

                {/* Checkpoints & Route */}
                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F9FB', padding: scale(14), borderRadius: scale(14), borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: moderateFontScale(11), fontWeight: '800', color: colors.textMuted, marginBottom: verticalScale(8) }}>ROUTE CHECKPOINTS</Text>
                  {Array.isArray(selectedItineraryTrip.route) && selectedItineraryTrip.route.length > 0 ? (
                    selectedItineraryTrip.route.map((cp, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), marginVertical: verticalScale(3) }}>
                        <View style={{ width: scale(8), height: scale(8), borderRadius: scale(4), backgroundColor: colors.amber }} />
                        <Text style={{ fontSize: moderateFontScale(12), fontWeight: '600', color: colors.textPrimary }}>Stop {idx + 1}: {cp}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ fontSize: moderateFontScale(12), color: colors.textPrimary }}>📍 {selectedItineraryTrip.pickup || 'Pickup Location'} ➔ 🏁 {selectedItineraryTrip.title}</Text>
                  )}
                </View>

                {/* Fare & Payment Breakdown */}
                <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F9FB', padding: scale(14), borderRadius: scale(14), borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: moderateFontScale(11), fontWeight: '800', color: colors.textMuted, marginBottom: verticalScale(8) }}>PAYMENT DETAILS</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(4) }}>
                    <Text style={{ fontSize: moderateFontScale(12), color: colors.textMuted }}>Total Fare</Text>
                    <Text style={{ fontSize: moderateFontScale(14), fontWeight: '900', color: colors.amber }}>₹{selectedItineraryTrip.price}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(4) }}>
                    <Text style={{ fontSize: moderateFontScale(12), color: colors.textMuted }}>Payment Method</Text>
                    <Text style={{ fontSize: moderateFontScale(12), fontWeight: '700', color: colors.textPrimary }}>{selectedItineraryTrip.paymentMode || 'Wallet'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: moderateFontScale(12), color: colors.textMuted }}>Booking Status</Text>
                    <Text style={{ fontSize: moderateFontScale(12), fontWeight: '700', color: '#10B981' }}>{selectedItineraryTrip.status}</Text>
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={{ backgroundColor: colors.amber, borderRadius: scale(14), paddingVertical: verticalScale(12), alignItems: 'center', marginTop: verticalScale(14) }}
                onPress={() => setSelectedItineraryTrip(null)}
              >
                <Text style={{ color: '#101014', fontWeight: '900', fontSize: moderateFontScale(14) }}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
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
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: moderateFontScale(20),
    fontWeight: '800',
  },
  headerSub: {
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(2),
  },
  scrollContent: {
    padding: scale(16),
    paddingBottom: verticalScale(40),
  },
  activeCard: {
    padding: scale(14),
    borderRadius: scale(16),
    borderWidth: 1.5,
    marginBottom: verticalScale(20),
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(12),
  },
  pulsingDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#10B981',
  },
  activeTagText: {
    fontSize: moderateFontScale(11),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  typeBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
  },
  typeBadgeText: {
    fontSize: moderateFontScale(10),
    fontWeight: '800',
  },
  partnerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  avatarCircle: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(245, 197, 24, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerName: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  partnerVehicle: {
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(2),
  },
  locationBlock: {
    marginBottom: verticalScale(12),
  },
  locVal: {
    fontSize: moderateFontScale(12),
    fontWeight: '600',
    flex: 1,
  },
  otpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
    borderWidth: 1,
    marginBottom: verticalScale(6),
  },
  otpColumn: {
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  otpValue: {
    fontSize: moderateFontScale(16),
    fontWeight: '900',
    marginTop: verticalScale(2),
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
  },
  trackBtnText: {
    color: '#101014',
    fontSize: moderateFontScale(13),
    fontWeight: '900',
  },
  cancelBtnIcon: {
    width: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(12),
    borderWidth: 1,
  },
  noActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    padding: scale(12),
    borderRadius: scale(12),
    borderWidth: 1,
    marginBottom: verticalScale(20),
  },
  noActiveText: {
    fontSize: moderateFontScale(12),
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: moderateFontScale(15),
    fontWeight: '800',
  },
  fullWidthFilterRow: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: scale(14),
    padding: scale(4),
    borderWidth: 1,
  },
  fullWidthPill: {
    flex: 1,
    paddingVertical: verticalScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scale(10),
  },
  fullWidthPillActive: {
    backgroundColor: '#F5C518',
  },
  fullWidthPillText: {
    fontSize: moderateFontScale(11),
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(24),
    borderRadius: scale(16),
    borderWidth: 1,
    marginVertical: verticalScale(10),
  },
  emptyTitle: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
    marginTop: verticalScale(8),
  },
  emptySub: {
    fontSize: moderateFontScale(11),
    textAlign: 'center',
    marginTop: verticalScale(4),
  },
  scheduledCard: {
    padding: scale(14),
    borderRadius: scale(16),
    borderWidth: 1,
    marginBottom: verticalScale(14),
  },
  schedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: verticalScale(10),
  },
  schedTitle: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  schedDateText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
  schedRouteBox: {
    borderTopWidth: 1,
    paddingTop: verticalScale(8),
    marginBottom: verticalScale(10),
  },
  financeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: verticalScale(8),
    marginBottom: verticalScale(12),
  },
  finLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  finVal: {
    fontSize: moderateFontScale(12),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  schedActionsRow: {
    flexDirection: 'row',
    gap: scale(8),
  },
  schedActionBtn: {
    flex: 1,
    paddingVertical: verticalScale(8),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  schedActionText: {
    fontSize: moderateFontScale(11),
    fontWeight: '800',
  },
});
