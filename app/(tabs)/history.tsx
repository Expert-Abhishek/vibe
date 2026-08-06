import { adminState } from '@/constants/admin-state';
import { fetchCustomerTripsApi, fetchUserTripHistoryApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { getSocket, initSocketService } from '@src/services/socketService';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HistoryRecord {
  id: string;
  type: 'cab' | 'guide' | 'custom_trip' | 'plan';
  title: string;
  pickupName?: string;
  dropName?: string;
  destinationId?: string;
  destinationIds?: string[];
  route?: string[];
  driverOrGuideName?: string;
  date: string;
  time: string;
  price: number;
  status: 'Completed' | 'Cancelled' | string;
  passengerCount?: number;
  paymentMode?: string;
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeFilter, setActiveFilter] = useState<'all' | 'cab' | 'guide' | 'plan'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbHistory, setDbHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const session = getUserSessionSync();
  const userId = session?.id;

  const reloadTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initSocketService(userId, session?.role || 'tourist');

    async function loadRealHistory() {
      setLoading(true);
      try {
        // 1. Fetch dedicated user history split endpoint (matching driver-history method)
        let apiCompletedTrips: any[] = [];
        const effectiveUserId = userId || 't1';
        const userHistoryRes = await fetchUserTripHistoryApi(effectiveUserId);
        if (userHistoryRes && userHistoryRes.success && userHistoryRes.data) {
          const comp = userHistoryRes.data.completed || [];
          const canc = userHistoryRes.data.cancelled || userHistoryRes.data.cancelledTrips || [];
          apiCompletedTrips = [...comp, ...canc];
        }

        // Always merge with customer trips API to ensure no cancelled trips are missed
        const fallbackData = await fetchCustomerTripsApi(effectiveUserId);
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
          const historicalFallback = fallbackData.filter((t: any) => {
            const st = String(t?.status || '').toLowerCase().trim();
            return st.includes('complete') || st.includes('cancel') || st.includes('decline') || st.includes('finish') || st === 'done';
          });
          apiCompletedTrips = [...apiCompletedTrips, ...historicalFallback];
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
            const cancelledBy = String(item.cancelled_by || item.cancelledBy || '').toLowerCase();
            let statusLabel = item.status || 'Completed';
            if (stLower.includes('cancel') || stLower.includes('decline')) {
              statusLabel = cancelledBy ? `Cancelled by ${cancelledBy}` : 'Cancelled';
            } else if (stLower.includes('complete') || stLower.includes('finish') || stLower === 'done') {
              statusLabel = 'Completed';
            }

            acc.push({
              id: idStr,
              type: (item.bookingType || item.type || 'cab').toLowerCase().includes('guide') ? 'guide' : 'cab',
              title: item.title || item.pickupName || item.pickup_name || 'Vibe Trip',
              pickupName: item.pickupName || item.pickup_name || item.pickup,
              dropName: item.dropName || item.drop_name || item.drop,
              destinationId: item.destinationId || item.destination_id,
              destinationIds: item.destinationIds || item.destination_ids,
              route: Array.isArray(item.route) ? item.route : undefined,
              driverOrGuideName: item.driverOrGuideName || item.driverName || item.driver_or_guide_name || item.guideName,
              date: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : (item.date || new Date().toLocaleDateString()),
              time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (item.time || ''),
              price: Number(item.amount || item.price) || 0,
              status: statusLabel,
              passengerCount: item.passengerCount || 1,
              paymentMode: item.paymentMode || item.payment_mode || undefined,
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
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = setTimeout(() => {
        loadRealHistory();
      }, 350) as any;
    };

    const subComp = DeviceEventEmitter.addListener('trip_completed', handleRefresh);
    const subCancel = DeviceEventEmitter.addListener('trip_cancelled', handleRefresh);
    const subStatus = DeviceEventEmitter.addListener('trip_status_updated', handleRefresh);

    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      subComp.remove();
      subCancel.remove();
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
    if (activeFilter !== 'all') {
      if (activeFilter === 'cab' && (item.type !== 'cab' && item.type !== 'custom_trip')) return false;
      if (activeFilter !== 'cab' && item.type !== activeFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = item.title?.toLowerCase().includes(q);
      const pickupMatch = item.pickupName?.toLowerCase().includes(q);
      const dropMatch = item.dropName?.toLowerCase().includes(q);
      const destIdMatch = item.destinationId?.toLowerCase().includes(q) || (item.destinationIds && item.destinationIds.some(d => d.toLowerCase().includes(q)));
      const partnerMatch = item.driverOrGuideName?.toLowerCase().includes(q);
      const statusMatch = item.status?.toLowerCase().includes(q);
      return titleMatch || pickupMatch || dropMatch || destIdMatch || partnerMatch || statusMatch;
    }

    return true;
  });

  const totalSpend = fullHistory
    .filter(h => h.status === 'Completed')
    .reduce((sum, item) => sum + item.price, 0);

  const completedCount = fullHistory.filter(h => h.status === 'Completed').length;

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



        {/* Search Input Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialIcons name="search" size={scale(20)} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search trips, places, drivers, destination ID..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={scale(18)} color={colors.textMuted} />
            </TouchableOpacity>
          )}
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

        {/* Loading Indicator */}
        {loading ? (
          <View style={{ paddingVertical: verticalScale(40), alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.amber} />
            <Text style={{ color: colors.textMuted, marginTop: verticalScale(10), fontSize: moderateFontScale(12) }}>Loading travel history...</Text>
          </View>
        ) : (
          /* List of past bookings */
          <View style={styles.listContainer}>
            {filteredHistory.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialIcons name="history" size={scale(40)} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {searchQuery ? 'No matching trips found.' : 'No past records found for this category.'}
                </Text>
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

                  {/* Destination ID Tag if present */}
                  {item.destinationId && (
                    <View style={styles.destIdRow}>
                      <MaterialIcons name="place" size={scale(13)} color={colors.amber} />
                      <Text style={[styles.destIdText, { color: colors.amber }]}>
                        Destination ID: {item.destinationId}
                      </Text>
                    </View>
                  )}

                  {/* Full Route Itinerary (Pickup, Checkpoints, Drop) */}
                  <View style={[styles.routeBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: scale(10), borderRadius: scale(12), marginVertical: verticalScale(8), gap: verticalScale(6) }]}>
                    <Text style={{ fontSize: moderateFontScale(10), fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: verticalScale(2) }}>
                      Full Travel Itinerary
                    </Text>

                    {/* Pickup Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                      <MaterialIcons name="my-location" size={scale(16)} color="#10B981" />
                      <Text style={{ fontSize: moderateFontScale(12), color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                        <Text style={{ fontWeight: '800' }}>Pickup: </Text>{item.pickupName || 'Pickup Location'}
                      </Text>
                    </View>

                    {/* Intermediate Stops Row */}
                    {item.route && item.route.length > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                        <MaterialIcons name="alt-route" size={scale(16)} color={colors.amber} />
                        <Text style={{ fontSize: moderateFontScale(11.5), color: colors.amber, flex: 1 }} numberOfLines={2}>
                          <Text style={{ fontWeight: '800' }}>Stops ({item.route.length}): </Text>{item.route.join(' ➔ ')}
                        </Text>
                      </View>
                    )}

                    {/* Drop Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                      <MaterialIcons name="place" size={scale(16)} color="#EF4444" />
                      <Text style={{ fontSize: moderateFontScale(12), color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                        <Text style={{ fontWeight: '800' }}>Drop: </Text>{item.dropName || 'Destination'}
                      </Text>
                    </View>
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

                  {/* Passenger count & Payment mode */}
                  <View style={styles.metaRowInline}>
                    {item.passengerCount !== undefined && (
                      <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>
                        Pax: <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{item.passengerCount}</Text>
                      </Text>
                    )}
                    {item.paymentMode && (
                      <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>
                        Payment: <Text style={{ color: colors.amber, fontWeight: '600' }}>{item.paymentMode}</Text>
                      </Text>
                    )}
                  </View>

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
                </View>
              ))
            )}
          </View>
        )}
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
    marginBottom: verticalScale(14),
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(14),
    borderWidth: 1.2,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    marginBottom: verticalScale(14),
    gap: scale(8),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateFontScale(13),
    padding: 0,
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
    marginBottom: verticalScale(6),
  },
  destIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginBottom: verticalScale(8),
  },
  destIdText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
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
  metaRowInline: {
    flexDirection: 'row',
    gap: scale(16),
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
