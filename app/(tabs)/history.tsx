import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adminState } from '../admin-state';

interface HistoryRecord {
  id: string;
  type: 'cab' | 'guide' | 'custom_trip' | 'plan';
  title: string;
  route?: string[];
  driverOrGuideName?: string;
  date: string;
  time: string;
  price: number;
  status: 'Completed' | 'Cancelled';
  rating?: number;
  passengerCount?: number;
}

const defaultHistory: HistoryRecord[] = [
  {
    id: 'h1',
    type: 'cab',
    title: 'Bengaluru Palace ➔ Indiranagar',
    route: ['Bengaluru Palace', 'Indiranagar 100 Feet Road'],
    driverOrGuideName: 'Suresh Kumar',
    date: 'Today',
    time: '03:15 PM',
    price: 340,
    status: 'Completed',
    rating: 5,
  },
  {
    id: 'h2',
    type: 'guide',
    title: 'Mysuru Palace Heritage Tour',
    driverOrGuideName: 'Ramesh Gowda',
    date: 'Yesterday',
    time: '10:00 AM',
    price: 1500,
    status: 'Completed',
    rating: 5,
  },
  {
    id: 'h3',
    type: 'cab',
    title: 'Kempegowda Airport ➔ Bengaluru Palace',
    route: ['KIAL Airport Terminal', 'Bengaluru Palace'],
    driverOrGuideName: 'Anil Gowda',
    date: '12 July 2026',
    time: '01:30 PM',
    price: 1250,
    status: 'Completed',
    rating: 4,
  },
  {
    id: 'h4',
    type: 'plan',
    title: 'Western Ghats Nature Escape',
    route: ['Chikmagalur Peak', 'Abbey Falls Coorg'],
    date: '08 July 2026',
    time: '07:00 AM',
    price: 4800,
    status: 'Completed',
    rating: 5,
    passengerCount: 4,
  },
  {
    id: 'h5',
    type: 'cab',
    title: 'Majestic Metro ➔ Malleshwaram',
    route: ['Majestic Station', 'Malleshwaram Temple'],
    driverOrGuideName: 'Raju Auto',
    date: '05 July 2026',
    time: '06:45 PM',
    price: 90,
    status: 'Completed',
    rating: 3,
  },
  {
    id: 'h6',
    type: 'guide',
    title: 'Hampi Architectural Tour',
    driverOrGuideName: 'Krishna Murthy',
    date: '04 July 2026',
    time: '09:00 AM',
    price: 2500,
    status: 'Completed',
    rating: 5,
  },
];

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeFilter, setActiveFilter] = useState<'all' | 'cab' | 'guide' | 'plan'>('all');

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
    danger: '#EF4444',
    success: '#10B981',
  };

  const localUserTrips = adminState.userTrips
    .filter(t => t.status === 'Completed')
    .map(t => ({
      id: t.id,
      type: t.type,
      title: t.title,
      route: t.route,
      driverOrGuideName: t.driverOrGuideName,
      date: t.date,
      time: t.time,
      price: t.price,
      status: 'Completed' as const,
      rating: t.rating || 5,
      passengerCount: t.passengerCount,
    }));

  const localCancelledBookings = adminState.advanceBookings
    .filter(b => b.status === 'Cancelled')
    .map(b => ({
      id: b.id,
      type: b.type,
      title: b.title,
      route: b.route,
      driverOrGuideName: b.driverOrGuideName || 'N/A',
      date: b.date,
      time: b.time,
      price: b.price,
      status: 'Cancelled' as const,
      rating: undefined,
      passengerCount: undefined,
    }));

  const fullHistory: HistoryRecord[] = [...localUserTrips, ...localCancelledBookings, ...defaultHistory];

  const filteredHistory = fullHistory.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'cab') return item.type === 'cab' || item.type === 'custom_trip';
    return item.type === activeFilter;
  });

  const totalSpend = fullHistory
    .filter(h => h.status === 'Completed')
    .reduce((sum, item) => sum + item.price, 0);

  const getIcon = (type: string) => {
    switch (type) {
      case 'cab':
        return 'directions-car';
      case 'custom_trip':
        return 'map';
      case 'guide':
        return 'explore';
      case 'plan':
        return 'collections-bookmark';
      default:
        return 'history';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'cab':
        return 'Cab Ride';
      case 'custom_trip':
        return 'Custom Route';
      case 'guide':
        return 'Local Guide';
      case 'plan':
        return 'Trip Plan Package';
      default:
        return 'Travel';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Travel History</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>View your past rides, hired guides, and package tours</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>PAST TRIPS</Text>
            <Text style={[styles.statValue, { color: colors.amber }]}>{fullHistory.length}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>TOTAL SPENT</Text>
            <Text style={[styles.statValue, { color: colors.amber }]}>₹{totalSpend.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['all', 'cab', 'guide', 'plan'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterPill,
                activeFilter === filter && { backgroundColor: colors.amber, borderColor: colors.amber }
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: activeFilter === filter ? '#101010' : colors.textPrimary }
                ]}
              >
                {filter === 'all' ? 'All' : filter === 'cab' ? 'Cabs' : filter === 'guide' ? 'Guides' : 'Plans'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List of past bookings */}
        <View style={styles.listContainer}>
          {filteredHistory.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="history" size={scale(40)} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No past records found for this category.</Text>
            </View>
          ) : (
            filteredHistory.map((item) => (
              <View
                key={item.id}
                style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {/* Header info */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardTypeRow}>
                    <MaterialIcons name={getIcon(item.type)} size={scale(18)} color={colors.amber} />
                    <Text style={[styles.typeNameText, { color: colors.textMuted }]}>
                      {getTypeName(item.type)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === 'Completed'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: item.status === 'Completed' ? colors.success : colors.danger },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={[styles.titleText, { color: colors.textPrimary }]}>{item.title}</Text>

                {/* Route detail if present */}
                {item.route && item.route.length > 0 && (
                  <View style={styles.routeBox}>
                    <Text style={[styles.routeLabel, { color: colors.textMuted }]}>Route checkpoints:</Text>
                    <Text style={[styles.routeText, { color: colors.textPrimary }]}>
                      {item.route.join(' ➔ ')}
                    </Text>
                  </View>
                )}

                {/* Driver / Guide details */}
                {item.driverOrGuideName && (
                  <View style={styles.metaRow}>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>
                      {item.type === 'guide' ? 'Guide: ' : 'Captain: '}
                      <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                        {item.driverOrGuideName}
                      </Text>
                    </Text>
                  </View>
                )}

                {/* Passenger count detail */}
                {item.passengerCount !== undefined && (
                  <View style={styles.metaRow}>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>
                      Passengers: <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{item.passengerCount}</Text>
                    </Text>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  {/* Date & Time */}
                  <View style={styles.dateTimeCol}>
                    <Text style={[styles.dateTimeText, { color: colors.textMuted }]}>
                      {item.date} · {item.time}
                    </Text>
                  </View>

                  {/* Price */}
                  <View style={styles.priceCol}>
                    <Text style={[styles.priceText, { color: colors.amber }]}>
                      ₹{item.price.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* Rating if Completed */}
                {item.status === 'Completed' && (
                  <View style={styles.ratingRow}>
                    <Text style={[styles.ratingLabel, { color: colors.textMuted }]}>Your Rating:</Text>
                    <View style={styles.starsBox}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialIcons
                          key={star}
                          name="star"
                          size={scale(16)}
                          color={star <= (item.rating || 5) ? colors.amber : 'rgba(255,255,255,0.15)'}
                          style={{ marginRight: scale(2) }}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: moderateFontScale(20),
    fontWeight: '800',
  },
  headerSub: {
    fontSize: moderateFontScale(12),
    marginTop: verticalScale(4),
  },
  scrollContent: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(100),
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(12),
    marginBottom: verticalScale(16),
  },
  statCard: {
    flex: 1,
    borderRadius: scale(16),
    borderWidth: 1.2,
    padding: scale(14),
  },
  statLabel: {
    fontSize: moderateFontScale(10),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: moderateFontScale(20),
    fontWeight: '800',
    marginTop: verticalScale(4),
  },
  filterRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(16),
  },
  filterPill: {
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(14),
    borderRadius: scale(18),
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
  },
  filterPillText: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  listContainer: {
    gap: scale(14),
  },
  emptyCard: {
    borderRadius: scale(20),
    borderWidth: 1.2,
    padding: scale(30),
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
  },
  emptyText: {
    fontSize: moderateFontScale(12),
    textAlign: 'center',
  },
  historyCard: {
    borderRadius: scale(20),
    borderWidth: 1.2,
    padding: scale(16),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  cardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  typeNameText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingVertical: verticalScale(3),
    paddingHorizontal: scale(8),
    borderRadius: scale(10),
  },
  statusText: {
    fontSize: moderateFontScale(10),
    fontWeight: '700',
  },
  titleText: {
    fontSize: moderateFontScale(15),
    fontWeight: '800',
    marginBottom: verticalScale(8),
  },
  routeBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: scale(10),
    padding: scale(10),
    marginBottom: verticalScale(8),
  },
  routeLabel: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginBottom: verticalScale(2),
  },
  routeText: {
    fontSize: moderateFontScale(12),
    fontWeight: '600',
  },
  metaRow: {
    marginBottom: verticalScale(6),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(8),
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  dateTimeCol: {
    justifyContent: 'center',
  },
  dateTimeText: {
    fontSize: moderateFontScale(11),
    fontWeight: '500',
  },
  priceCol: {
    justifyContent: 'center',
  },
  priceText: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(8),
    paddingTop: verticalScale(8),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  ratingLabel: {
    fontSize: moderateFontScale(11),
    fontWeight: '600',
    marginRight: scale(6),
  },
  starsBox: {
    flexDirection: 'row',
  },
});
