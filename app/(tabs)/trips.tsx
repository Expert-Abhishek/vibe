import NotificationModal from '@/components/NotificationModal';
import { adminState } from '@/constants/admin-state';
import { deductWalletApi, fetchCustomerTripsApi, submitWalletDeductionRequestApi, cancelTripApi } from '@/constants/api';
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
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
    success: '#10B981',
    danger: '#EF4444',
  };

  const safeBackendTrips = Array.isArray(backendTrips) ? backendTrips : [];
  const safeAdvanceBookings = Array.isArray(adminState.advanceBookings) ? adminState.advanceBookings : [];
  const safeUserTrips = Array.isArray(adminState.userTrips) ? adminState.userTrips : [];

  // Convert backend database trips
  const mappedDbTrips = safeBackendTrips
    .filter(Boolean)
    .map((bt: any) => ({
      id: String(bt.id || `db_${Math.random()}`),
      type: (bt.tripType || bt.trip_type || 'cab') as any,
      vehicleType: 'Verified Cab Partner',
      title: String(bt.title || 'Tour Booking'),
      route: Array.isArray(bt.destinationIds) ? bt.destinationIds : [],
      driverOrGuideName: String(bt.driverOrGuideName || bt.driver_or_guide_name || 'Assigned Partner'),
      date: bt.createdAt ? new Date(bt.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Today',
      time: bt.createdAt ? new Date(bt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
      price: Number(bt.amount) || 0,
      paymentMode: String(bt.paymentMode || bt.payment_mode || 'Cash'),
      status: String(bt.status === 'Confirmed' ? 'Upcoming' : (bt.status || 'Upcoming')),
      passengerCount: 1,
    }));

  // Convert advanceBookings to list items
  const mappedAdvance = safeAdvanceBookings
    .filter(b => b && b.status !== 'Cancelled' && (userId ? (String(b.assignedToId) === String(userId) || (b.touristName && String(b.touristName).includes(session?.name || ''))) : false))
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
      status: 'Upcoming' as const,
      rawBooking: b,
      passengerCount: undefined as number | undefined,
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
      status: String(t.status || 'Pending Guide Confirmation'),
      passengerCount: t.passengerCount,
      advanceDepositPaid: t.advanceDepositPaid,
      remainingCashBalance: t.remainingCashBalance,
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

  const handleCancelPress = (trip: any) => {
    if (!trip) return;
    const isGuideBooking = trip.type === 'guide' || String(trip.status || '').toLowerCase().includes('guide');
    const isAcceptedByGuide = String(trip.status || '').toLowerCase().includes('accepted') || isGuideBooking;
    const price = trip.price || 0;

    const feeAmount = isAcceptedByGuide ? 100 : 0;
    const alertTitle = isGuideBooking ? 'Confirm Guide Booking Cancellation' : 'Confirm Cancellation';
    const alertMsg = `Trip: ${trip.title}\n\nCancellation Fine: ₹100 (Fine for cancelling guide booking)\n\nNote: ₹100 fine will be deducted from your wallet and recorded in Admin Panel.`;

    Alert.alert(
      alertTitle,
      alertMsg,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Confirm Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Deduct ₹100 fine from Tourist Wallet
              await deductWalletApi({
                userId: userId || 't1',
                amount: 100,
                description: `Cancellation Fine for Guide Booking #${trip.id}`,
              });

              // 2. Submit Wallet Deduction Request for Admin Panel
              await submitWalletDeductionRequestApi({
                userId: userId || 't1',
                userName: session?.name || 'Tourist Client',
                role: 'tourist',
                amount: 100,
                description: `Cancellation Fine for Guide Booking #${trip.id} (${trip.title})`,
              });
            } catch (e) {
              console.warn('Cancellation fine deduction warning:', e);
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

            setDbTrips((prev) =>
              prev.map((t) => (String(t.id) === String(trip.id) ? { ...t, status: 'Cancelled by Tourist' } : t))
            );

            Alert.alert('Trip Cancelled', 'Your trip has been cancelled and ₹100 cancellation fine was deducted from your wallet.');
          },
        },
      ]
    );

            Alert.alert(
              'Booking Cancelled',
              isAcceptedByGuide
                ? 'Your accepted guide booking has been cancelled. A ₹100 cancellation fine has been deducted from your wallet and sent to Admin Panel for manual wallet updating.'
                : `Your trip has been cancelled. Refund of ₹${refundAmount} will be credited shortly.`
            );
            setCancelTrigger(prev => prev + 1);
          }
        }
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
          filteredTrips.map((trip) => {
            if (!trip) return null;
            const isCab = trip.type === 'cab' || trip.type === 'custom_trip' || trip.type === 'plan';
            const isCompleted = String(trip.status || '').toLowerCase() === 'completed';
            const isCancelled = String(trip.status || '').toLowerCase().includes('cancel');
            const badgeColors = getStatusBadgeColors(trip.status);

            const payModeStr = String(trip.paymentMode || 'Wallet');
            const isCash = payModeStr.toLowerCase().includes('cash');

            return (
              <View
                key={trip.id}
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
});
