import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { getUserSessionSync } from '@/constants/authStore';
import { fetchDriverTripHistoryApi } from '@/constants/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { adminState } from '@/constants/admin-state';

export default function DriverHistoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scheduledTrips, setScheduledTrips] = useState<any[]>([]);
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);

  const colors = {
    bg: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#101010',
    textMuted: isDark ? 'rgba(255,255,255,0.6)' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    amber: '#F5C518',
    success: '#10B981',
    blue: '#3B82F6',
  };

  const loadHistoryData = async () => {
    try {
      const session = getUserSessionSync();
      const driverId = session?.id || 'd1';

      // 1. Fetch from backend endpoint
      const res = await fetchDriverTripHistoryApi(driverId);

      let fetchedScheduled: any[] = [];
      let fetchedCompleted: any[] = [];

      if (res && res.success && res.data) {
        fetchedScheduled = res.data.scheduled || [];
        fetchedCompleted = res.data.completed || [];
      }

      // 2. Merge local adminState fallback trips if available
      const memoryBookings = adminState?.advanceBookings || [];
      memoryBookings.forEach((b: any) => {
        if (!b) return;
        const formatted = {
          id: b.id || `mem_${Date.now()}`,
          title: b.title || `${b.pickupName || b.pickup || 'Pickup'} ➔ ${b.dropName || b.drop || 'Drop'}`,
          pickupName: b.pickupName || b.pickup || 'Pickup Location',
          dropName: b.dropName || b.drop || 'Dropoff Location',
          date: b.date || 'Today',
          time: b.time || 'Immediate',
          amount: parseFloat(b.price || b.amount || 2500),
          commission: (parseFloat(b.price || b.amount || 2500) * 0.1),
          driverEarnings: (parseFloat(b.price || b.amount || 2500) * 0.9),
          touristName: b.touristName || 'Tourist Client',
          status: String(b.status || '').toLowerCase() === 'completed' ? 'COMPLETED' : 'SCHEDULED',
          paymentMode: b.paymentMode || 'Wallet',
        };

        if (formatted.status === 'COMPLETED') {
          if (!fetchedCompleted.some(x => String(x.id) === String(formatted.id))) {
            fetchedCompleted.push(formatted);
          }
        } else {
          if (!fetchedScheduled.some(x => String(x.id) === String(formatted.id))) {
            fetchedScheduled.push(formatted);
          }
        }
      });

      setScheduledTrips(fetchedScheduled);
      setCompletedTrips(fetchedCompleted);
    } catch (e) {
      console.warn('Error loading driver trip history:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistoryData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadHistoryData();
  };

  const renderScheduledItem = ({ item }: { item: any }) => (
    <View style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.badgeScheduled}>
          <MaterialIcons name="event" size={scale(12)} color={colors.blue} />
          <Text style={styles.badgeScheduledText}>SCHEDULED</Text>
        </View>
        <Text style={[styles.cardDateText, { color: colors.textMuted }]}>
          {item.date} • {item.time}
        </Text>
      </View>

      <Text style={[styles.touristNameText, { color: colors.textPrimary }]}>
        👤 {item.touristName}
      </Text>

      {/* Pickup & Drop Details */}
      <View style={styles.routeContainer}>
        <View style={styles.routeRow}>
          <View style={[styles.dotStart, { backgroundColor: colors.success }]} />
          <Text style={[styles.routeText, { color: colors.textPrimary }]} numberOfLines={1}>
            <Text style={{ fontWeight: '800' }}>Pickup: </Text>{item.pickupName}
          </Text>
        </View>

        <View style={styles.routeRow}>
          <View style={[styles.dotEnd, { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.routeText, { color: colors.textPrimary }]} numberOfLines={1}>
            <Text style={{ fontWeight: '800' }}>Drop: </Text>{item.dropName}
          </Text>
        </View>
      </View>

      {/* Fare Footer */}
      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.fareLabel, { color: colors.textMuted }]}>Estimated Fare</Text>
        <Text style={[styles.fareValue, { color: colors.amber }]}>
          ₹{Number(item.amount || 0).toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );

  const renderCompletedItem = ({ item }: { item: any }) => {
    const cps = Array.isArray(item.checkpoints) ? item.checkpoints : (Array.isArray(item.route) ? item.route : []);

    return (
      <View style={[styles.tripCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.badgeCompleted}>
            <MaterialIcons name="check-circle" size={scale(12)} color={colors.success} />
            <Text style={styles.badgeCompletedText}>COMPLETED</Text>
          </View>
          <Text style={[styles.cardDateText, { color: colors.textMuted }]}>
            {item.date} • {item.time}
          </Text>
        </View>

        <Text style={[styles.touristNameText, { color: colors.textPrimary }]}>
          👤 {item.touristName || 'Passenger Client'}
        </Text>

        {/* Full Route Itinerary (Pickup, Checkpoints, Drop) */}
        <View style={styles.routeContainer}>
          <View style={styles.routeRow}>
            <View style={[styles.dotStart, { backgroundColor: colors.success }]} />
            <Text style={[styles.routeText, { color: colors.textPrimary }]} numberOfLines={1}>
              <Text style={{ fontWeight: '800' }}>Pickup: </Text>{item.pickupName || item.pickup || 'Pickup Spot'}
            </Text>
          </View>

          {cps.length > 0 && (
            <View style={{ paddingLeft: scale(16), marginVertical: verticalScale(2) }}>
              <Text style={{ fontSize: moderateFontScale(11), color: colors.amber, fontWeight: '700' }}>
                📍 Checkpoints: {cps.join(' ➔ ')}
              </Text>
            </View>
          )}

          <View style={styles.routeRow}>
            <View style={[styles.dotEnd, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.routeText, { color: colors.textPrimary }]} numberOfLines={1}>
              <Text style={{ fontWeight: '800' }}>Drop: </Text>{item.dropName || item.drop || 'Destination'}
            </Text>
          </View>
        </View>

        {/* Payment Mode Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: verticalScale(6) }}>
          <MaterialIcons name="payment" size={scale(14)} color={colors.textMuted} />
          <Text style={{ fontSize: moderateFontScale(11), color: colors.textMuted }}>
            Payment Mode: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{item.paymentMode || 'Wallet'}</Text>
          </Text>
        </View>

        {/* Fare Breakdown Footer */}
        <View style={[styles.cardFooterSplit, { borderTopColor: colors.border, marginTop: verticalScale(10) }]}>
          <View>
            <Text style={[styles.fareLabel, { color: colors.textMuted }]}>Total Fare</Text>
            <Text style={[styles.fareValueSmall, { color: colors.textPrimary }]}>
              ₹{Number(item.amount || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.vertDivider} />

          <View>
            <Text style={[styles.fareLabel, { color: colors.textMuted }]}>Platform Fee (10%)</Text>
            <Text style={[styles.fareValueSmall, { color: '#EF4444' }]}>
              -₹{Number(item.commission || (item.amount * 0.1)).toFixed(0)}
            </Text>
          </View>

          <View style={styles.vertDivider} />

          <View>
            <Text style={[styles.fareLabel, { color: colors.textMuted }]}>Driver Net Earnings</Text>
            <Text style={[styles.fareValueBold, { color: colors.success }]}>
              ₹{Number(item.driverEarnings || (item.amount * 0.9)).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* AppBar Header */}
      <View style={[styles.appBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back-ios" size={scale(18)} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.appBarTitle, { color: colors.textPrimary }]}>Driver Trip History</Text>
          <Text style={[styles.appBarSub, { color: colors.textMuted }]}>Scheduled & Completed Rides Ledger</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
          <MaterialIcons name="refresh" size={scale(20)} color={colors.amber} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.amber} />
          <Text style={{ color: colors.textMuted, marginTop: verticalScale(10), fontSize: moderateFontScale(13) }}>
            Loading driver history...
          </Text>
        </View>
      ) : (
        <View style={styles.splitLayoutContainer}>
          {/* ================= TOP SECTION: SCHEDULED / PRE-BOOKED TRIPS ================= */}
          <View style={[styles.topSection, { borderBottomColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="event-available" size={scale(18)} color={colors.blue} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                SCHEDULED TRIPS ({scheduledTrips.length})
              </Text>
            </View>

            <FlatList
              data={scheduledTrips}
              keyExtractor={(item, idx) => `sch_${item.id}_${idx}`}
              renderItem={renderScheduledItem}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.listContentPadding}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.amber} />
              }
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <MaterialIcons name="event-busy" size={scale(32)} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Scheduled Trips</Text>
                  <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                    No upcoming or pre-booked scheduled rides found.
                  </Text>
                </View>
              }
            />
          </View>

          {/* ================= BOTTOM SECTION: COMPLETED TRIPS (60% Height) ================= */}
          <View style={styles.bottomSection}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="history" size={scale(18)} color={colors.success} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                COMPLETED TRIPS ({completedTrips.length})
              </Text>
            </View>

            <FlatList
              data={completedTrips}
              keyExtractor={(item, idx) => `comp_${item.id}_${idx}`}
              renderItem={renderCompletedItem}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.listContentPadding}
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <MaterialIcons name="history-toggle-off" size={scale(32)} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Completed Trips</Text>
                  <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                    Completed rides and earnings history will appear here.
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appBar: {
    height: verticalScale(54),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    borderBottomWidth: 1,
    gap: scale(12),
  },
  backBtn: {
    padding: scale(6),
  },
  appBarTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  appBarSub: {
    fontSize: moderateFontScale(11),
    fontWeight: '600',
  },
  refreshBtn: {
    padding: scale(6),
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitLayoutContainer: {
    flex: 1,
  },
  topSection: {
    flex: 4, // 40% Vertical Height
    borderBottomWidth: 1.5,
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(10),
  },
  bottomSection: {
    flex: 6, // 60% Vertical Height
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(10),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: verticalScale(8),
  },
  sectionTitle: {
    fontSize: moderateFontScale(12),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  listContentPadding: {
    paddingBottom: verticalScale(16),
  },
  tripCard: {
    borderRadius: scale(16),
    padding: scale(12),
    marginBottom: verticalScale(10),
    borderWidth: 1.2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  badgeScheduled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
    gap: scale(4),
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  badgeScheduledText: {
    color: '#3B82F6',
    fontSize: moderateFontScale(9.5),
    fontWeight: '900',
  },
  badgeCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
    gap: scale(4),
    borderWidth: 1,
    borderColor: '#10B981',
  },
  badgeCompletedText: {
    color: '#10B981',
    fontSize: moderateFontScale(9.5),
    fontWeight: '900',
  },
  cardDateText: {
    fontSize: moderateFontScale(11),
    fontWeight: '600',
  },
  touristNameText: {
    fontSize: moderateFontScale(13.5),
    fontWeight: '800',
    marginBottom: verticalScale(8),
  },
  routeContainer: {
    gap: verticalScale(6),
    marginBottom: verticalScale(10),
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  dotStart: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  dotEnd: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  routeText: {
    fontSize: moderateFontScale(12),
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: verticalScale(8),
  },
  cardFooterSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: verticalScale(8),
  },
  vertDivider: {
    width: 1,
    height: verticalScale(20),
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  fareLabel: {
    fontSize: moderateFontScale(9.5),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fareValue: {
    fontSize: moderateFontScale(15),
    fontWeight: '900',
  },
  fareValueSmall: {
    fontSize: moderateFontScale(12.5),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  fareValueBold: {
    fontSize: moderateFontScale(13.5),
    fontWeight: '900',
    marginTop: verticalScale(2),
  },
  emptyCard: {
    padding: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    gap: verticalScale(6),
  },
  emptyTitle: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  emptySub: {
    fontSize: moderateFontScale(11),
    textAlign: 'center',
  },
});
