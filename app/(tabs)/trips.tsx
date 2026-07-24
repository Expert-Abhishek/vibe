import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adminState } from '../admin-state';
import { fetchCustomerTripsApi, fetchTripsApi } from '@/constants/api';

const initialTripHistory: any[] = [];

export default function TripsHistoryScreen() {

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeFilter, setActiveFilter] = useState<'all' | 'cab' | 'guide'>('all');
  const [cancelTrigger, setCancelTrigger] = useState(0);
  const [backendTrips, setBackendTrips] = useState<any[]>([]);

  React.useEffect(() => {
    async function loadBackendTrips() {
      const data = await fetchTripsApi();
      if (data && data.length > 0) {
        setBackendTrips(data);
      }
    }
    loadBackendTrips();
  }, [cancelTrigger]);


  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  // Convert backend database trips
  const mappedDbTrips = backendTrips.map((bt: any) => ({
    id: String(bt.id),
    type: (bt.tripType || 'cab') as any,
    vehicleType: 'Verified Cab Partner',
    title: bt.title || 'Tour Booking',
    route: bt.destinationIds || [],
    driverOrGuideName: bt.driverOrGuideName || 'Assigned Driver',
    date: bt.createdAt ? new Date(bt.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Today',
    time: bt.createdAt ? new Date(bt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM',
    price: Number(bt.amount) || 0,
    paymentMode: (bt.paymentMode || 'Cash') as any,
    status: (bt.status === 'Confirmed' ? 'Upcoming' : bt.status) as any,
    passengerCount: 1,
  }));

  // Convert advanceBookings to list items
  const mappedAdvance = adminState.advanceBookings
    .filter(b => b.status !== 'Cancelled')
    .map(b => ({
      id: b.id,
      type: b.type === 'guide' ? 'guide' as const : 'cab' as const,
      vehicleType: undefined as string | undefined,
      title: b.title,
      route: b.route,
      driverOrGuideName: b.driverOrGuideName || 'Searching for Captain...',
      date: `Upcoming - ${b.date}`,
      time: b.time,
      price: b.price,
      paymentMode: (b.paymentMode || 'Cash') as any,
      status: 'Upcoming' as const,
      rawBooking: b,
      passengerCount: undefined as number | undefined,
    }));

  const allTrips = mappedDbTrips.length > 0
    ? [...mappedDbTrips, ...adminState.userTrips]
    : [...mappedAdvance, ...adminState.userTrips, ...initialTripHistory];

  const filteredTrips = allTrips.filter((trip) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'cab') return trip.type === 'cab' || trip.type === 'custom_trip' || trip.type === 'plan';
    if (activeFilter === 'guide') return trip.type === 'guide';
    return true;
  });

  const totalSpend = allTrips.reduce((sum, item) => sum + item.price, 0);
  const cabCount = allTrips.filter((t) => t.type === 'cab' || t.type === 'custom_trip' || t.type === 'plan').length;
  const guideCount = allTrips.filter((t) => t.type === 'guide').length;

  const handleCancelPress = (trip: any) => {
    const bookingDateStr = trip.rawBooking?.bookingDate || '2026-07-10';
    const tripDateStr = trip.rawBooking?.date || '2026-07-18';
    const price = trip.price;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const tDate = new Date(tripDateStr);
    const bDate = new Date(bookingDateStr);
    const currDate = new Date(todayStr);

    const msPerDay = 24 * 60 * 60 * 1000;
    const diffToTripDays = Math.round((tDate.getTime() - currDate.getTime()) / msPerDay);
    const diffToBookingDays = Math.round((currDate.getTime() - bDate.getTime()) / msPerDay);

    let feePercent = 15;
    let explanation = '';

    if (diffToTripDays === 0) {
      feePercent = 100;
      explanation = 'Cancellation on the same day as trip start date results in a 100% fee deduction.';
    } else if (diffToBookingDays === 0) {
      feePercent = 0;
      explanation = 'Cancellation on the same day as booking creation results in a 0% fee deduction (Full Refund).';
    } else if (diffToTripDays === 1) {
      feePercent = 30;
      explanation = 'Cancellation 1 day before the trip start date results in a 30% fee deduction.';
    } else {
      feePercent = 15;
      explanation = 'Cancellation more than 1 day before the trip start date results in a 15% fee deduction.';
    }

    const feeAmount = Math.round((price * feePercent) / 100);
    const refundAmount = price - feeAmount;

    Alert.alert(
      'Confirm Cancellation',
      `Trip: ${trip.title}\nTotal Price: ₹${price}\n\nCancellation Fee: ${feePercent}% (₹${feeAmount})\nRefund Amount: ₹${refundAmount}\n\nExplanation:\n${explanation}`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        { 
          text: 'Confirm Cancel', 
          style: 'destructive',
          onPress: () => {
            adminState.advanceBookings.forEach(b => {
              if (b.id === trip.id) {
                b.status = 'Cancelled';
              }
            });
            adminState.userTrips.forEach(t => {
              if (t.id === trip.id) {
                t.status = 'Cancelled';
              }
            });
            Alert.alert('Booking Cancelled', `Your trip has been cancelled. Refund of ₹${refundAmount} will be credited shortly.`);
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
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Trips</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>Upcoming trip</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Expenses Dashboard Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.summaryTitle}>Scheduled Value / Active Bookings</Text>
          <Text style={styles.summaryAmount}>₹{totalSpend.toLocaleString('en-IN')}</Text>
          
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.summaryStatsRow}>
            <View style={styles.statItem}>
              <FontAwesome5 name="car" size={scale(14)} color={colors.amber} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{cabCount} Scheduled</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Cabs & Custom Trips</Text>
            </View>

            <View style={styles.statItem}>
              <FontAwesome5 name="explore" size={scale(14)} color={colors.amber} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{guideCount} Guided</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Tours / Guides</Text>
            </View>
          </View>
        </View>

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
            const isCab = trip.type === 'cab' || trip.type === 'custom_trip' || trip.type === 'plan';
            const isCompleted = trip.status === 'Completed';

            return (
              <View key={trip.id} style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                
                {/* Card Title Header */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.titleIconCol}>
                    <View style={[styles.iconBox, { backgroundColor: isCab ? 'rgba(245,197,24,0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                      {(trip.type as string) === 'auto' ? (
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
                      <Text style={[styles.tripNameText, { color: colors.textPrimary }]} numberOfLines={2}>
                        {trip.title}
                      </Text>
                      <Text style={[styles.tripDateSub, { color: colors.textMuted }]}>
                        {trip.date} · {trip.time}
                      </Text>
                    </View>
                  </View>

                  {/* Status indicator */}
                  <View style={[styles.statusBadge, { backgroundColor: 'rgba(245,197,24,0.1)' }]}>
                    <Text style={[styles.statusBadgeText, { color: colors.amber }]}>
                      {trip.status}
                    </Text>
                  </View>
                </View>

                {/* Waypoints line visual if it is a cab route */}
                {isCab && trip.route && (
                  <View style={styles.routeSection}>
                    {trip.route.map((stop: string, idx: number) => {
                      const isLast = idx === trip.route!.length - 1;
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
                      {trip.driverOrGuideName}
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
                    <Text style={styles.detailPrice}>₹{trip.price}</Text>
                    <Text style={[styles.payMethodVal, { color: trip.paymentMode && trip.paymentMode.toLowerCase().includes('cash') ? colors.amber : colors.textMuted }]}>
                      {trip.paymentMode ? (trip.paymentMode.toLowerCase().includes('cash') ? `${trip.paymentMode}` : `Paid via ${trip.paymentMode}`) : 'Cash'}
                    </Text>
                  </View>
                </View>

                {/* Cancellation button for upcoming schedules */}
                {!isCompleted && (
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(12),
  },
  headerTitle: {
    fontSize: moderateFontScale(20),
    fontWeight: '800',
  },
  headerSub: {
    fontSize: moderateFontScale(12),
    marginTop: verticalScale(2),
  },
  scrollContent: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(100),
  },
  summaryCard: {
    borderRadius: scale(24),
    padding: scale(18),
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  summaryTitle: {
    color: '#8E8E93',
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryAmount: {
    color: '#F5C518',
    fontSize: moderateFontScale(24),
    fontWeight: '900',
    marginTop: verticalScale(4),
  },
  summaryDivider: {
    height: 1.2,
    marginVertical: verticalScale(12),
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
    marginTop: verticalScale(4),
  },
  statLabel: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginTop: verticalScale(1),
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: verticalScale(16),
  },
  filterPill: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderRadius: scale(20),
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterPillActive: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },
  filterPillText: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  tripCard: {
    borderRadius: scale(22),
    borderWidth: 1.2,
    padding: scale(14),
    marginBottom: verticalScale(14),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleIconCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    flex: 1,
  },
  iconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripNameText: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
    lineHeight: moderateFontScale(18),
  },
  tripDateSub: {
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(2),
  },
  statusBadge: {
    paddingVertical: verticalScale(3),
    paddingHorizontal: scale(8),
    borderRadius: scale(8),
  },
  statusBadgeText: {
    fontSize: moderateFontScale(10),
    fontWeight: '700',
  },
  routeSection: {
    marginTop: verticalScale(12),
    paddingLeft: scale(6),
  },
  routeNodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(2),
  },
  nodeIndicator: {
    alignItems: 'center',
    width: scale(14),
    marginRight: scale(8),
  },
  nodeIndicatorDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  nodeIndicatorLine: {
    width: 1.2,
    height: verticalScale(14),
  },
  nodeAddressName: {
    fontSize: moderateFontScale(11),
    fontWeight: '600',
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1.2,
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
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(1),
  },
  detailPrice: {
    color: '#F5C518',
    fontSize: moderateFontScale(17),
    fontWeight: '900',
    marginTop: verticalScale(2),
  },
  payMethodVal: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.2,
    marginTop: verticalScale(10),
    paddingTop: verticalScale(8),
  },
  rebookBtn: {
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(14),
    borderRadius: scale(10),
    backgroundColor: '#F5C518',
  },
  rebookBtnText: {
    color: '#101010',
    fontSize: moderateFontScale(11),
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: scale(20),
    padding: scale(30),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
