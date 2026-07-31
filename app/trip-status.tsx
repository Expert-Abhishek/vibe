import NotificationModal from '@/components/NotificationModal';
import { cancelTripApi, fetchLiveLocationApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { sendLocalNotification } from '@/constants/notifications';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { initSocketService } from '@src/services/socketService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn('react-native-maps dynamic load error in trip-status:', e);
  }
}

export default function TripStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const tripIdParam = (params.tripId as string) || (params.id as string) || 'active_trip_1';

  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [tripStatus, setTripStatus] = useState<string>('Accepted');
  const [driverInfo, setDriverInfo] = useState<any>({
    name: 'Captain Anil Gowda',
    phone: '+91 99000 82400',
    vehicleModel: 'Mahindra Thar 4x4 / Innova',
    vehicleNumber: 'KA-03-EX-8240',
    rating: 4.9,
    latitude: 12.9716,
    longitude: 77.5946,
  });

  const [pickupLocation, setPickupLocation] = useState('Heritage City Palace, Mysore');
  const [dropLocation, setDropLocation] = useState('Chamundi Hill View Point');
  const [fareAmount, setFareAmount] = useState(2500);
  const [paymentMode, setPaymentMode] = useState('Wallet / Online');
  const [startOtp, setStartOtp] = useState('8240');
  const [endOtp, setEndOtp] = useState('4321');

  const colors = {
    bg: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#101010',
    textMuted: isDark ? 'rgba(255,255,255,0.6)' : '#666666',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    amber: '#F5C518',
    success: '#10B981',
    danger: '#EF4444',
    blue: '#3B82F6',
  };

  // Poll live location & trip status from DB
  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetchLiveLocationApi(tripIdParam);
        if (res && res.success && res.data) {
          if (res.data.status) setTripStatus(res.data.status);
          if (res.data.driver) setDriverInfo((prev: any) => ({ ...prev, ...res.data.driver }));
          if (res.data.pickup_name) setPickupLocation(res.data.pickup_name);
          if (res.data.drop_name) setDropLocation(res.data.drop_name);
          if (res.data.amount) setFareAmount(parseFloat(res.data.amount));
          if (res.data.otp) setStartOtp(res.data.otp);
          if (res.data.end_otp || res.data.endOtp) setEndOtp(res.data.end_otp || res.data.endOtp);
        }
      } catch (e) {
        console.warn('loadStatus error:', e);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, [tripIdParam]);

  // Socket & DeviceEventEmitter listeners
  useEffect(() => {
    initSocketService();

    const handleAccepted = (data: any) => {
      if (data) {
        setTripStatus('Accepted');
        if (data.driverName || data.driver_or_guide_name) {
          setDriverInfo((prev: any) => ({
            ...prev,
            name: data.driverName || data.driver_or_guide_name,
            phone: data.driverPhone || prev.phone,
            vehicleModel: data.vehicleModel || prev.vehicleModel,
            vehicleNumber: data.vehicleNumber || prev.vehicleNumber,
          }));
        }
      }
    };

    const handleDeclined = () => {
      setTripStatus('Declined');
      Alert.alert('Trip Declined', 'The driver declined this trip request.', [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    };

    const handleCancelled = () => {
      setTripStatus('CANCELLED');
      Alert.alert('Trip Cancelled', 'This trip has been cancelled.', [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    };

    const handleLocationStream = (data: any) => {
      if (data && (data.latitude || data.lat)) {
        setDriverInfo((prev: any) => ({
          ...prev,
          latitude: parseFloat(data.latitude || data.lat),
          longitude: parseFloat(data.longitude || data.lng),
        }));
      }
    };

    const sub1 = DeviceEventEmitter.addListener('trip_accepted', handleAccepted);
    const sub2 = DeviceEventEmitter.addListener('trip_declined', handleDeclined);
    const sub3 = DeviceEventEmitter.addListener('trip_cancelled', handleCancelled);
    const sub4 = DeviceEventEmitter.addListener('driver_location_stream', handleLocationStream);

    return () => {
      sub1.remove();
      sub2.remove();
      sub3.remove();
      sub4.remove();
    };
  }, []);

  const handleCancelTrip = () => {
    Alert.alert(
      'Cancel Trip',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            const session = getUserSessionSync();
            try {
              await cancelTripApi(tripIdParam, { cancelledBy: 'tourist', role: 'tourist' });
              sendLocalNotification('Trip Cancelled', 'Your trip has been cancelled successfully.');
              Alert.alert('Cancelled', 'Your trip has been cancelled.');
              router.replace('/');
            } catch (e) {
              console.warn('Cancel error:', e);
              Alert.alert('Error', 'Failed to cancel trip.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const statusLower = String(tripStatus).toLowerCase();
  const getStatusBadge = () => {
    if (statusLower.includes('accepted')) return { text: 'PARTNER ASSIGNED & EN ROUTE', bg: '#10B981', color: '#FFFFFF' };
    if (statusLower.includes('arrived')) return { text: 'DRIVER ARRIVED AT PICKUP', bg: '#F5C518', color: '#101014' };
    if (statusLower.includes('start') || statusLower.includes('active')) return { text: 'TRIP IN PROGRESS', bg: '#3B82F6', color: '#FFFFFF' };
    if (statusLower.includes('declined') || statusLower.includes('cancel')) return { text: 'TRIP CANCELLED / DECLINED', bg: '#EF4444', color: '#FFFFFF' };
    return { text: 'SEARCHING FOR NEARBY DRIVER', bg: '#F5C518', color: '#101014' };
  };

  const badge = getStatusBadge();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.amber} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading trip status...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={scale(22)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Live Trip Status</Text>
        <NotificationModal role="tourist" />
      </View>

      <ScrollView contentContainerStyle={{ padding: scale(16), paddingBottom: verticalScale(30) }} showsVerticalScrollIndicator={false}>
        {/* Status Header Badge */}
        <View style={[styles.statusBanner, { backgroundColor: badge.bg }]}>
          <MaterialIcons name="navigation" size={scale(18)} color={badge.color} style={{ marginRight: scale(6) }} />
          <Text style={[styles.statusBannerText, { color: badge.color }]}>{badge.text}</Text>
        </View>

        {/* Live Map Visual */}
        <View style={[styles.mapFrame, { borderColor: colors.border }]}>
          {Platform.OS === 'web' || !MapView ? (
            <View style={styles.webMapPlaceholder}>
              <MaterialIcons name="map" size={scale(42)} color={colors.amber} />
              <Text style={{ color: colors.textPrimary, fontWeight: '800', marginTop: 8 }}>
                Live GPS Tracking Active
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), marginTop: 2 }}>
                Driver: {driverInfo.name} ({driverInfo.latitude.toFixed(4)}, {driverInfo.longitude.toFixed(4)})
              </Text>
            </View>
          ) : (
            <MapView
              provider="google"
              style={StyleSheet.absoluteFillObject}
              initialRegion={{
                latitude: driverInfo.latitude || 12.9716,
                longitude: driverInfo.longitude || 77.5946,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              }}
            >
              <Marker
                coordinate={{ latitude: driverInfo.latitude || 12.9716, longitude: driverInfo.longitude || 77.5946 }}
                title={driverInfo.name}
                description={driverInfo.vehicleModel}
                pinColor={colors.amber}
              />
            </MapView>
          )}
        </View>

        {/* Driver Details Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textMuted }]}>ASSIGNED CAPTAIN</Text>
          <View style={styles.driverInfoRow}>
            <View style={styles.avatarCircle}>
              <FontAwesome5 name="user-tie" size={scale(22)} color="#101014" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.driverName, { color: colors.textPrimary }]}>{driverInfo.name}</Text>
              <Text style={[styles.driverVehicle, { color: colors.textMuted }]}>
                {driverInfo.vehicleModel} • <Text style={{ color: colors.amber, fontWeight: '700' }}>{driverInfo.vehicleNumber}</Text>
              </Text>
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={scale(14)} color={colors.amber} />
                <Text style={[styles.ratingText, { color: colors.textPrimary }]}>{driverInfo.rating || 4.9} ⭐ Verified Partner</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${driverInfo.phone || '+919900082400'}`)}
            >
              <MaterialIcons name="call" size={scale(18)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Start OTP & End OTP Share Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.amber, borderWidth: 1.5 }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.amber }]}>🔐 TRIP VERIFICATION CODES</Text>
          <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), marginBottom: verticalScale(10) }}>
            Share Start OTP with driver to begin ride, and End OTP at destination.
          </Text>

          <View style={styles.otpRowGrid}>
            <View style={[styles.otpBox, { backgroundColor: isDark ? 'rgba(245,197,24,0.1)' : '#FFFBEB', borderColor: colors.amber }]}>
              <Text style={[styles.otpLabel, { color: colors.textMuted }]}>START TRIP OTP</Text>
              <Text style={[styles.otpValue, { color: colors.amber }]}>{startOtp}</Text>
            </View>

            <View style={[styles.otpBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', borderColor: colors.success }]}>
              <Text style={[styles.otpLabel, { color: colors.textMuted }]}>END TRIP OTP</Text>
              <Text style={[styles.otpValue, { color: colors.success }]}>{endOtp}</Text>
            </View>
          </View>
        </View>

        {/* Route Plan Timeline Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textMuted }]}>ROUTE & DETAILS</Text>

          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.routeTypeLabel, { color: colors.success }]}>PICKUP LOCATION</Text>
              <Text style={[styles.routeAddressText, { color: colors.textPrimary }]}>{pickupLocation}</Text>
            </View>
          </View>

          <View style={styles.routeDividerLine} />

          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.routeTypeLabel, { color: colors.danger }]}>DESTINATION</Text>
              <Text style={[styles.routeAddressText, { color: colors.textPrimary }]}>{dropLocation}</Text>
            </View>
          </View>

          <View style={[styles.fareRow, { borderTopColor: colors.border }]}>
            <View>
              <Text style={[styles.fareLabel, { color: colors.textMuted }]}>Total Fare</Text>
              <Text style={[styles.fareVal, { color: colors.amber }]}>₹{fareAmount}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.fareLabel, { color: colors.textMuted }]}>Payment Mode</Text>
              <Text style={[styles.paymentModeText, { color: colors.textPrimary }]}>{paymentMode}</Text>
            </View>
          </View>
        </View>

        {/* Cancel Trip Action Button */}
        {!statusLower.includes('cancel') && !statusLower.includes('decline') && !statusLower.includes('complete') && (
          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: colors.danger }]}
            onPress={handleCancelTrip}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="cancel" size={scale(18)} color="#FFFFFF" style={{ marginRight: scale(6) }} />
                <Text style={styles.cancelBtnText}>Cancel Booking</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '900',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    borderRadius: scale(10),
    marginBottom: verticalScale(14),
  },
  statusBannerText: {
    fontWeight: '900',
    fontSize: moderateFontScale(12),
    letterSpacing: 0.5,
  },
  mapFrame: {
    height: verticalScale(180),
    borderRadius: scale(14),
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: verticalScale(14),
  },
  webMapPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(245, 197, 24, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(16),
  },
  card: {
    padding: scale(14),
    borderRadius: scale(14),
    borderWidth: 1,
    marginBottom: verticalScale(14),
  },
  cardHeaderTitle: {
    fontSize: moderateFontScale(10),
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: verticalScale(10),
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  avatarCircle: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverName: {
    fontSize: moderateFontScale(15),
    fontWeight: '900',
  },
  driverVehicle: {
    fontSize: moderateFontScale(12),
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  ratingText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
  callBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpRowGrid: {
    flexDirection: 'row',
    gap: scale(10),
  },
  otpBox: {
    flex: 1,
    padding: scale(12),
    borderRadius: scale(10),
    borderWidth: 1,
    alignItems: 'center',
  },
  otpLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '800',
    marginBottom: 4,
  },
  otpValue: {
    fontSize: moderateFontScale(22),
    fontWeight: '900',
    letterSpacing: 2,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
  },
  dot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    marginTop: verticalScale(4),
  },
  routeTypeLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '900',
  },
  routeAddressText: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
    marginTop: 2,
  },
  routeDividerLine: {
    width: 2,
    height: verticalScale(16),
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: scale(4),
    marginVertical: verticalScale(4),
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(14),
    paddingTop: verticalScale(10),
    borderTopWidth: 1,
  },
  fareLabel: {
    fontSize: moderateFontScale(11),
  },
  fareVal: {
    fontSize: moderateFontScale(18),
    fontWeight: '900',
    marginTop: 2,
  },
  paymentModeText: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
    marginTop: 2,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    marginTop: verticalScale(6),
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: moderateFontScale(14),
  },
});
