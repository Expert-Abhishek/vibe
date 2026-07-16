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

interface TripRecord {
  id: string;
  type: 'cab' | 'guide' | 'custom_trip';
  vehicleType?: string;
  title: string;
  route?: string[];
  driverOrGuideName: string;
  date: string;
  time: string;
  price: number;
  paymentMode: 'UPI' | 'Cash';
  status: 'Completed' | 'Upcoming';
  rating?: number;
}

const initialTripHistory: TripRecord[] = [
  {
    id: 't1',
    type: 'cab',
    vehicleType: '5 Seater (Maruti Swift)',
    title: 'Bengaluru Palace ➔ Indiranagar',
    route: ['Bengaluru Palace', 'Indiranagar 100 Feet Road'],
    driverOrGuideName: 'Suresh Kumar',
    date: 'Today',
    time: '03:15 PM',
    price: 340,
    paymentMode: 'UPI',
    status: 'Completed',
    rating: 5,
  },
  {
    id: 't2',
    type: 'guide',
    title: 'Mysuru Palace Heritage Tour',
    driverOrGuideName: 'Ramesh Gowda (Expert)',
    date: 'Yesterday',
    time: '10:00 AM',
    price: 1500,
    paymentMode: 'Cash',
    status: 'Completed',
    rating: 4.8,
  },
  {
    id: 't3',
    type: 'cab',
    vehicleType: '7 Seater (Toyota Innova)',
    title: 'Kempegowda Airport ➔ Bengaluru Palace',
    route: ['KIAL Airport Terminal', 'Hebbal Flyover', 'Bengaluru Palace'],
    driverOrGuideName: 'Anil Gowda',
    date: '12 July 2026',
    time: '01:30 PM',
    price: 1250,
    paymentMode: 'UPI',
    status: 'Completed',
    rating: 5,
  },
  {
    id: 't4',
    type: 'custom_trip',
    vehicleType: '4*4 Jeep (Mahindra Thar)',
    title: 'Multi-Checkpoint Western Ghats Tour',
    route: ['Bengaluru Palace', 'Chikmagalur Peak', 'Abbey Falls Coorg'],
    driverOrGuideName: 'Darshan Hegde',
    date: 'Upcoming - 18 July 2026',
    time: '06:00 AM',
    price: 4500,
    paymentMode: 'UPI',
    status: 'Upcoming',
  },
  {
    id: 't5',
    type: 'cab',
    vehicleType: 'Auto (Bajaj RE)',
    title: 'Majestic Metro ➔ Malleshwaram Temple',
    route: ['Majestic Station', 'Malleshwaram Temple'],
    driverOrGuideName: 'Raju Auto',
    date: '08 July 2026',
    time: '06:45 PM',
    price: 90,
    paymentMode: 'Cash',
    status: 'Completed',
    rating: 4.5,
  },
  {
    id: 't6',
    type: 'guide',
    title: 'Hampi Architectural Insights Tour',
    driverOrGuideName: 'Krishna Murthy',
    date: '04 July 2026',
    time: '09:00 AM',
    price: 2500,
    paymentMode: 'UPI',
    status: 'Completed',
    rating: 4.9,
  },
];

export default function TripsHistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeFilter, setActiveFilter] = useState<'all' | 'cab' | 'guide'>('all');
  const [cancelTrigger, setCancelTrigger] = useState(0);

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

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
      paymentMode: 'UPI' as const,
      status: 'Upcoming' as const,
      rawBooking: b,
    }));

  const allTrips = [...mappedAdvance, ...adminState.userTrips, ...initialTripHistory];

  const filteredTrips = allTrips.filter((trip) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'cab') return trip.type === 'cab' || trip.type === 'custom_trip';
    if (activeFilter === 'guide') return trip.type === 'guide';
    return true;
  });

  // Dynamic Spend statistics calculator
  const totalSpend = allTrips.reduce((sum, item) => sum + item.price, 0);
  const cabCount = allTrips.filter((t) => t.type === 'cab' || t.type === 'custom_trip').length;
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Trip History</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>Record of your travels & bookings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Expenses Dashboard Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.summaryTitle}>Total Travel Expenses</Text>
          <Text style={styles.summaryAmount}>₹{totalSpend.toLocaleString('en-IN')}</Text>
          
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.summaryStatsRow}>
            <View style={styles.statItem}>
              <FontAwesome5 name="car" size={scale(14)} color={colors.amber} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{cabCount} Rides</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Cabs Booked</Text>
            </View>

            <View style={styles.statItem}>
              <FontAwesome5 name="explore" size={scale(14)} color={colors.amber} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{guideCount} Guides</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Tours Guided</Text>
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
              Cabs & Trips
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
        {filteredTrips.map((trip) => {
          const isCab = trip.type === 'cab' || trip.type === 'custom_trip';
          const isCompleted = trip.status === 'Completed';

          return (
            <View key={trip.id} style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              
              {/* Card Title Header */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.titleIconCol}>
                  <View style={[styles.iconBox, { backgroundColor: isCab ? 'rgba(245,197,24,0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                    {trip.type === 'auto' ? (
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
                <View style={[styles.statusBadge, { backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245,197,24,0.1)' }]}>
                  <Text style={[styles.statusBadgeText, { color: isCompleted ? '#10B981' : colors.amber }]}>
                    {trip.status}
                  </Text>
                </View>
              </View>

              {/* Waypoints line visual if it is a cab route */}
              {isCab && trip.route && (
                <View style={styles.routeSection}>
                  {trip.route.map((stop, idx) => {
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
                </View>

                {/* Right col info */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Expenses</Text>
                  <Text style={styles.detailPrice}>₹{trip.price}</Text>
                  <Text style={[styles.payMethodVal, { color: colors.textMuted }]}>
                    Paid via {trip.paymentMode}
                  </Text>
                </View>
              </View>

              {/* Star Rating details if present */}
              {isCompleted && trip.rating && (
                <View style={[styles.ratingSection, { borderTopColor: colors.border }]}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <MaterialIcons
                        key={s}
                        name={s <= Math.floor(trip.rating!) ? 'star' : 'star-border'}
                        size={scale(14)}
                        color={colors.amber}
                      />
                    ))}
                    <Text style={[styles.ratingNum, { color: colors.textPrimary }]}>
                      {trip.rating}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.rebookBtn}>
                    <Text style={styles.rebookBtnText}>Book Again</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Cancellation button for upcoming schedules */}
              {!isCompleted && (
                <View style={[styles.ratingSection, { borderTopColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textMuted }]}>SCHEDULED STATUS</Text>
                  <TouchableOpacity 
                    style={[styles.rebookBtn, { backgroundColor: '#ef4444' }]}
                    onPress={() => handleCancelPress(trip)}
                  >
                    <Text style={styles.rebookBtnText}>Cancel Booking</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Spacing */}
        <View style={{ height: verticalScale(30) }} />
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
    paddingBottom: verticalScale(14),
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
  },
  summaryCard: {
    borderRadius: scale(22),
    padding: scale(18),
    marginBottom: verticalScale(18),
  },
  summaryTitle: {
    color: '#8D8D97',
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    color: '#F5C518',
    fontSize: moderateFontScale(24),
    fontWeight: '800',
    marginTop: verticalScale(4),
  },
  summaryDivider: {
    height: 1.2,
    marginVertical: verticalScale(14),
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
    marginTop: verticalScale(6),
  },
  statLabel: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(16),
  },
  filterPill: {
    borderRadius: scale(12),
    paddingVertical: verticalScale(7),
    paddingHorizontal: scale(14),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  filterPillActive: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },
  filterPillText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
  tripCard: {
    borderRadius: scale(20),
    padding: scale(16),
    marginBottom: verticalScale(16),
    borderWidth: 1.2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleIconCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.75,
  },
  iconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  tripNameText: {
    fontSize: moderateFontScale(13.5),
    fontWeight: '800',
    lineHeight: moderateFontScale(18),
  },
  tripDateSub: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  statusBadge: {
    borderRadius: scale(8),
    paddingVertical: verticalScale(3),
    paddingHorizontal: scale(8),
  },
  statusBadgeText: {
    fontSize: moderateFontScale(9),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  routeSection: {
    marginTop: verticalScale(14),
    paddingLeft: scale(6),
  },
  routeNodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: verticalScale(20),
  },
  nodeIndicator: {
    width: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(8),
  },
  nodeIndicatorDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  nodeIndicatorLine: {
    width: scale(1.5),
    height: verticalScale(15),
    position: 'absolute',
    top: scale(10),
  },
  nodeAddressName: {
    fontSize: moderateFontScale(11.5),
    fontWeight: '600',
    flex: 1,
  },
  detailsSection: {
    borderTopWidth: 1.2,
    marginTop: verticalScale(14),
    paddingTop: verticalScale(12),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
    marginTop: verticalScale(3),
  },
  vehicleModelLabel: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginTop: verticalScale(1),
  },
  detailPrice: {
    color: '#F5C518',
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  payMethodVal: {
    fontSize: moderateFontScale(9.5),
    fontWeight: '600',
    marginTop: verticalScale(1),
  },
  ratingSection: {
    borderTopWidth: 1.2,
    marginTop: verticalScale(12),
    paddingTop: verticalScale(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(2),
  },
  ratingNum: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    marginLeft: scale(4),
  },
  rebookBtn: {
    backgroundColor: '#2C2C34',
    borderRadius: scale(8),
    paddingVertical: verticalScale(5),
    paddingHorizontal: scale(10),
  },
  rebookBtnText: {
    color: '#ffffff',
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
});
