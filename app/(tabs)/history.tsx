import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adminState } from '@/constants/admin-state';
import { fetchCustomerTripsApi, fetchTripsApi, fetchUserTripHistoryApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { initSocketService, getSocket } from '@src/services/socketService';

interface HistoryRecord {
  id: string;
  type: 'cab' | 'guide' | 'custom_trip' | 'plan';
  title: string;
  route?: string[];
  driverOrGuideName?: string;
  date: string;
  time: string;
  price: number;
  status: 'Completed' | 'Cancelled' | string;
  rating?: number;
  passengerCount?: number;
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeFilter, setActiveFilter] = useState<'all' | 'cab' | 'guide' | 'plan'>('all');
  const [dbHistory, setDbHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const session = getUserSessionSync();
  const userId = session?.id;

  useEffect(() => {
    initSocketService(userId, session?.role || 'tourist');
    const socket = getSocket();

    async function loadRealHistory() {
      setLoading(true);
      try {
        // 1. Fetch dedicated user history split endpoint (matching driver-history method)
        let apiCompletedTrips: any[] = [];
        const effectiveUserId = userId || 't1';
        const userHistoryRes = await fetchUserTripHistoryApi(effectiveUserId);
        if (userHistoryRes && userHistoryRes.success && userHistoryRes.data) {
          apiCompletedTrips = userHistoryRes.data.completed || [];
        }

        // Fallback to customer trips API if dedicated endpoint returned empty
        if (apiCompletedTrips.length === 0) {
          const fallbackData = await fetchCustomerTripsApi(effectiveUserId);
          if (Array.isArray(fallbackData)) {
            apiCompletedTrips = fallbackData;
          }
        }

        const localUserTrips = Array.isArray(adminState.userTrips) ? adminState.userTrips : [];
        const localAdvance = Array.isArray(adminState.advanceBookings) ? adminState.advanceBookings : [];
        const localPending = Array.isArray((adminState as any).pendingDriverRequests) ? (adminState as any).pendingDriverRequests : [];
        const localCustom = Array.isArray(adminState.customTripRequests) ? adminState.customTripRequests : [];

        const combinedRaw = [...apiCompletedTrips, ...localUserTrips, ...localAdvance, ...localPending, ...localCustom];

        const historyItems: HistoryRecord[] = combinedRaw
          .filter(Boolean)
          .filter((t: any) => {
            const st = String(t?.status || '').toLowerCase().trim();
            return st.includes('complete') || st.includes('cancel') || st.includes('decline') || st.includes('finish') || st === 'done';
          })
          .reduce((acc: HistoryRecord[], item: any) => {
            const idStr = String(item.id || item.tripId || '');
            if (!idStr) return acc;
            if (acc.some(existing => existing.id === idStr)) return acc;

            const stLower = String(item.status || '').toLowerCase();
            let statusLabel = 'Completed';
            if (stLower.includes('driver') || item.cancelled_by === 'driver') {
              statusLabel = 'Cancelled by Driver';
            } else if (stLower.includes('user') || stLower.includes('tourist') || item.cancelled_by === 'user' || item.cancelled_by === 'tourist') {
              statusLabel = 'Cancelled by User';
            } else if (stLower.includes('cancel') || stLower.includes('decline')) {
              statusLabel = 'Cancelled';
            }

            const titleStr = item.title || (item.pickupName && item.dropName ? `${item.pickupName} ➔ ${item.dropName}` : (item.pickup ? `${item.pickup} ➔ Destination` : 'Tour Booking'));
            const partnerName = item.driverOrGuideName || item.driverName || item.driver_or_guide_name || undefined;

            acc.push({
              id: idStr,
              type: (item.type || item.tripType || 'cab') as any,
              title: titleStr,
              pickupName: item.pickupName || item.pickup_name || item.pickup || 'Pickup Point',
              dropName: item.dropName || item.drop_name || item.drop || 'Drop Point',
              route: Array.isArray(item.destinationIds) && item.destinationIds.length > 0 ? item.destinationIds : (Array.isArray(item.route) ? item.route : (Array.isArray(item.checkpoints) ? item.checkpoints : undefined)),
              driverOrGuideName: partnerName,
              date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (item.date || 'Today'),
              time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (item.time || ''),
              price: Number(item.amount || item.price) || 0,
              status: statusLabel,
              rating: Number(item.rating) || 5,
              passengerCount: item.passengerCount || 1,
            });
            return acc;
          }, []);

        setDbHistory(historyItems);
      } catch (e) {
        console.warn('Error fetching history trips:', e);
        setDbHistory([]);
      } finally {
        setLoading(false);
      }
    }
    loadRealHistory();

    const handleRefresh = () => {
      console.log('[HistoryScreen] 🔔 Real-time socket/emitter trip update received. Refreshing history...');
      loadRealHistory();
    };

    if (socket) {
      socket.on('trip_completed', handleRefresh);
      socket.on('trip_status_updated', handleRefresh);
      socket.on('RIDE_COMPLETED', handleRefresh);
    }

    const subComp = DeviceEventEmitter.addListener('trip_completed', handleRefresh);
    const subRideComp = DeviceEventEmitter.addListener('RIDE_COMPLETED', handleRefresh);
    const subStatus = DeviceEventEmitter.addListener('trip_status_updated', handleRefresh);

    return () => {
      if (socket) {
        socket.off('trip_completed', handleRefresh);
        socket.off('trip_status_updated', handleRefresh);
        socket.off('RIDE_COMPLETED', handleRefresh);
      }
      subComp.remove();
      subRideComp.remove();
      subStatus.remove();
    };
  }, [userId]);

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
    .filter(t => {
      if (!t) return false;
      if (userId && t.customerId && String(t.customerId) !== String(userId)) return false;
      const st = String(t.status || '').toLowerCase();
      return st.includes('complete') || st.includes('cancel') || st.includes('decline') || st.includes('finish') || st.includes('reject') || st === 'done' || st.includes('done');
    })
    .map(t => {
      const stLower = String(t.status || '').toLowerCase();
      let statusLabel = 'Completed';
      if (stLower.includes('driver')) {
        statusLabel = 'Cancelled by Driver';
      } else if (stLower.includes('user') || stLower.includes('tourist')) {
        statusLabel = 'Cancelled by User';
      } else if (stLower.includes('cancel') || stLower.includes('decline')) {
        statusLabel = 'Cancelled';
      }
      return {
        id: t.id,
        type: t.type,
        title: t.title,
        route: t.route,
        driverOrGuideName: t.driverOrGuideName,
        date: t.date,
        time: t.time,
        price: t.price,
        status: statusLabel,
        rating: t.rating || 5,
        passengerCount: t.passengerCount,
      };
    });

  const localCancelledBookings = adminState.advanceBookings
    .filter(b => b.status === 'Cancelled' && (userId ? (String(b.assignedToId) === String(userId) || b.touristName?.includes(session?.name || '')) : false))
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

  const rawFullHistory: HistoryRecord[] = [...dbHistory, ...localUserTrips, ...localCancelledBookings];
  const fullHistory: HistoryRecord[] = rawFullHistory.filter(
    (item, index, self) => index === self.findIndex(t => t.id === item.id)
  );

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
            filteredHistory.map((item, idx) => (
              <View
                key={`${item.id || 'hist'}_${idx}`}
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

                {/* Full Route Itinerary (Pickup, Checkpoints, Drop) */}
                <View style={styles.routeBox}>
                  <Text style={[styles.routeLabel, { color: colors.textMuted }]}>Full Travel Itinerary:</Text>
                  <Text style={[styles.routeText, { color: colors.textPrimary }]}>
                    🟢 <Text style={{ fontWeight: '700' }}>Pickup:</Text> {item.pickupName || 'Pickup Location'}
                  </Text>
                  {item.route && item.route.length > 0 && (
                    <Text style={[styles.routeText, { color: colors.amber, marginTop: verticalScale(2) }]}>
                      📍 <Text style={{ fontWeight: '700' }}>Stops:</Text> {item.route.join(' ➔ ')}
                    </Text>
                  )}
                  <Text style={[styles.routeText, { color: colors.textPrimary, marginTop: verticalScale(2) }]}>
                    🔴 <Text style={{ fontWeight: '700' }}>Drop:</Text> {item.dropName || 'Destination'}
                  </Text>
                </View>

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
