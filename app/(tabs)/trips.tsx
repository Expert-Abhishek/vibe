import NotificationModal from '@/components/NotificationModal';
import LanguageSelector from '@/src/components/LanguageSelector';
import { adminState } from '@/constants/admin-state';
import { cancelTripApi, fetchLiveLocationApi, fetchActiveTripApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { sendLocalNotification } from '@/constants/notifications';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { getSocket, initSocketService, joinTripRoom } from '@src/services/socketService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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

import MapView, { Marker, Polyline } from '@/components/react-native-maps';

import { useTranslation } from 'react-i18next';

export default function TripsHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ tripId?: string; id?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const tripIdParam = (params.tripId as string) || (params.id as string) || '';
  const mapRef = React.useRef<any>(null);

  // Local memory trip fallback lookup
  const initialLocalTrip = React.useMemo(() => {
    const tid = String(tripIdParam || '').toLowerCase().trim();
    const all = [
      ...(adminState.userTrips || []),
      ...((adminState as any).pendingDriverRequests || []),
      ...(adminState.customTripRequests || []),
      ...(adminState.advanceBookings || []),
    ].filter(Boolean);

    if (tid) {
      return all.find((t: any) => t && (String(t.id).toLowerCase().trim() === tid || String(t.tripId || '').toLowerCase().trim() === tid)) || all[0] || null;
    }
    return all[0] || null;
  }, [tripIdParam]);

  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [effectiveTripId, setEffectiveTripId] = useState<string>(tripIdParam || initialLocalTrip?.id || initialLocalTrip?.tripId || '');
  const [tripStatus, setTripStatus] = useState<string>(initialLocalTrip?.status || 'Accepted');
  const [driverInfo, setDriverInfo] = useState<any>({
    name: initialLocalTrip?.driverOrGuideName || initialLocalTrip?.driverName || null,
    phone: initialLocalTrip?.driverPhone || initialLocalTrip?.phone || null,
    vehicleModel: initialLocalTrip?.vehicleModel || initialLocalTrip?.vehicleType || null,
    vehicleNumber: initialLocalTrip?.vehicleNumber || null,
    latitude: 12.9716,
    longitude: 77.5946,
    heading: 0,
  });

  const [pickupLocation, setPickupLocation] = useState(initialLocalTrip?.pickupName || initialLocalTrip?.pickup || 'Pickup Spot');
  const [dropLocation, setDropLocation] = useState(initialLocalTrip?.dropName || initialLocalTrip?.drop || 'Destination');
  const [pickupLat, setPickupLat] = useState<number>(initialLocalTrip?.pickupLat || 12.9716);
  const [pickupLng, setPickupLng] = useState<number>(initialLocalTrip?.pickupLng || 77.5946);
  const [dropLat, setDropLat] = useState<number>(initialLocalTrip?.dropLat || 12.2958);
  const [dropLng, setDropLng] = useState<number>(initialLocalTrip?.dropLng || 76.6394);
  const [fareAmount, setFareAmount] = useState(initialLocalTrip?.price || initialLocalTrip?.amount || 1200);
  const [paymentMode, setPaymentMode] = useState(initialLocalTrip?.paymentMode || 'Wallet');
  const [advanceDepositPaid, setAdvanceDepositPaid] = useState<number>(initialLocalTrip?.advanceDepositPaid || 0);
  const [remainingCashBalance, setRemainingCashBalance] = useState<number>(initialLocalTrip?.remainingCashBalance || (initialLocalTrip?.price || initialLocalTrip?.amount || 1200));
  const [tripCheckpoints, setTripCheckpoints] = useState<any[]>(initialLocalTrip?.checkpoints || initialLocalTrip?.route || []);
  const [startOtp, setStartOtp] = useState(initialLocalTrip?.otp || '8240');
  const [endOtp, setEndOtp] = useState(initialLocalTrip?.endOtp || '4321');
  const [planName, setPlanName] = useState<string>(initialLocalTrip?.title || 'Tour Plan Package');
  const [durationHours, setDurationHours] = useState<number>(initialLocalTrip?.durationHours || 8);
  const [distanceKm, setDistanceKm] = useState<number>(initialLocalTrip?.distanceKm || 120);

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

  // Check active trip on mount if tripIdParam is missing
  useEffect(() => {
    async function checkActiveTrip() {
      const session = getUserSessionSync();
      const uId = session?.id;
      if (!tripIdParam && uId) {
        try {
          const res = await fetchActiveTripApi(uId);
          if (res && res.hasActiveTrip && res.trip) {
            const tid = String(res.trip.id || res.trip.tripId || '');
            if (tid) setEffectiveTripId(tid);
          }
        } catch (e) {}
      }
    }
    checkActiveTrip();
  }, [tripIdParam]);

  // Poll live location & trip status from DB
  useEffect(() => {
    async function loadStatus() {
      const targetId = tripIdParam || effectiveTripId;
      try {
        const res = await fetchLiveLocationApi(targetId);
        if (res && res.success && res.data) {
          const statusStr = String(res.data.status || '');
          const statusLower = statusStr.toLowerCase();
          setTripStatus(statusStr);

          if (res.data.driver) setDriverInfo((prev: any) => ({ ...prev, ...res.data.driver }));
          if (res.data.pickup_name || res.data.pickupName || res.data.pickup) {
            setPickupLocation(res.data.pickup_name || res.data.pickupName || res.data.pickup);
          }
          if (res.data.drop_name || res.data.dropName || res.data.drop) {
            setDropLocation(res.data.drop_name || res.data.dropName || res.data.drop);
          }
          if (res.data.pickup_lat || res.data.pickupLat) setPickupLat(parseFloat(res.data.pickup_lat || res.data.pickupLat));
          if (res.data.pickup_lng || res.data.pickupLng) setPickupLng(parseFloat(res.data.pickup_lng || res.data.pickupLng));
          if (res.data.drop_lat || res.data.dropLat) setDropLat(parseFloat(res.data.drop_lat || res.data.dropLat));
          if (res.data.drop_lng || res.data.dropLng) setDropLng(parseFloat(res.data.drop_lng || res.data.dropLng));

          const totalAmt = parseFloat(res.data.amount || res.data.price || 0);
          if (totalAmt > 0) setFareAmount(totalAmt);
          if (res.data.payment_mode || res.data.paymentMode) setPaymentMode(res.data.payment_mode || res.data.paymentMode);

          const advPaid = parseFloat(res.data.advance_deposit_paid || res.data.advanceDepositPaid || 0);
          setAdvanceDepositPaid(advPaid);
          const remBal = parseFloat(res.data.remaining_cash_balance || res.data.remainingCashBalance || (totalAmt > 0 ? totalAmt - advPaid : 0));
          setRemainingCashBalance(remBal);

          if (res.data.trip_checkpoints || res.data.checkpoints || res.data.destination_ids || res.data.route) {
            const rawCps = res.data.trip_checkpoints || res.data.checkpoints || res.data.destination_ids || res.data.route;
            let parsed: any[] = Array.isArray(rawCps) ? rawCps : [];
            if (typeof rawCps === 'string') {
              try { parsed = JSON.parse(rawCps); } catch (e) { parsed = [rawCps]; }
            }
            if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
              parsed.sort((a, b) => (a.step_order || a.stepOrder || 0) - (b.step_order || b.stepOrder || 0));
            }
            setTripCheckpoints(parsed);
          }

          if (res.data.planName || res.data.title) setPlanName(res.data.planName || res.data.title);
          if (res.data.durationHours || res.data.duration_hours) setDurationHours(parseFloat(res.data.durationHours || res.data.duration_hours || 8));
          if (res.data.distanceKm || res.data.distance_km) setDistanceKm(parseFloat(res.data.distanceKm || res.data.distance_km || 120));

          // Direct API OTP bindings
          if (res.data.otp) setStartOtp(String(res.data.otp));
          if (res.data.end_otp || res.data.endOtp) setEndOtp(String(res.data.end_otp || res.data.endOtp));

          // Transition away if completed or cancelled on poll
          if (statusLower.includes('completed') || statusLower.includes('finish') || statusLower === 'done') {
            sendLocalNotification('Trip Completed 🎉', 'Your ride has finished successfully.');
            Alert.alert('Trip Completed 🎉', 'Your ride has finished. Thank you for riding with Vibe!', [
              { text: 'View History', onPress: () => router.navigate('/(tabs)/history') }
            ]);
            router.navigate('/(tabs)/history');
            return;
          }
          if (statusLower.includes('cancelled') || statusLower.includes('declined')) {
            Alert.alert('Trip Cancelled', 'This booking was cancelled.', [
              { text: 'OK', onPress: () => router.navigate('/(tabs)/history') }
            ]);
            router.navigate('/(tabs)/history');
            return;
          }
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
  }, [tripIdParam, effectiveTripId]);

  // Dynamic Map Bounds Camera Fit
  useEffect(() => {
    if (mapRef.current && mapRef.current.fitToCoordinates && driverInfo.latitude && pickupLat && dropLat) {
      try {
        mapRef.current.fitToCoordinates(
          [
            { latitude: driverInfo.latitude, longitude: driverInfo.longitude },
            { latitude: pickupLat, longitude: pickupLng },
            { latitude: dropLat, longitude: dropLng },
          ],
          {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          }
        );
      } catch (e) { }
    }
  }, [driverInfo.latitude, driverInfo.longitude, pickupLat, pickupLng, dropLat, dropLng]);

  // Socket & DeviceEventEmitter listeners
  const hasShownAcceptedAlertRef = useRef(false);

  useEffect(() => {
    const session = getUserSessionSync();
    initSocketService(session?.id, session?.role || 'tourist');

    const targetId = tripIdParam || effectiveTripId;
    if (targetId) {
      joinTripRoom(targetId, 'tourist', session?.id);
    }

    const socket = getSocket();

    const handleAccepted = (data: any) => {
      if (data) {
        setTripStatus('Accepted');
        const dName = data.driverName || data.driver_or_guide_name || 'Captain';
        if (data.driverName || data.driver_or_guide_name) {
          setDriverInfo((prev: any) => ({
            ...prev,
            name: dName,
            phone: data.driverPhone || prev.phone,
            vehicleModel: data.vehicleModel || prev.vehicleModel,
            vehicleNumber: data.vehicleNumber || prev.vehicleNumber,
          }));
        }
        if (!hasShownAcceptedAlertRef.current) {
          hasShownAcceptedAlertRef.current = true;
          sendLocalNotification('🎉 Captain Accepted Ride!', `${dName} has accepted your trip request.`);
          Alert.alert(
            '🎉 Ride Accepted by Captain!',
            `Captain ${dName} has accepted your tour booking!\n\nYou can view all your trip details and live status on My Trips.`,
            [{ text: 'OK' }]
          );
        }
      }
    };

    const handleCompleted = (data: any) => {
      console.log('[TripsScreen] 🏁 Active trip completed:', data);
      setTripStatus('Completed');
      sendLocalNotification('Trip Completed 🎉', 'Your ride has finished successfully.');
      Alert.alert('Trip Completed 🎉', 'Your ride has finished! Thank you for choosing Vibe.', [
        { text: 'View History', onPress: () => router.navigate('/(tabs)/history') }
      ]);
      router.navigate('/(tabs)/history');
    };

    const handleDeclined = (data?: any) => {
      setTripStatus('Pending');
      setDriverInfo((prev: any) => ({
        ...prev,
        name: 'Searching Captain...',
        vehicleNumber: 'Assigning Captain...',
      }));
      sendLocalNotification('Searching Captain...', 'A nearby captain passed this request. Re-searching next available Captain.');
    };

    const handleCancelled = () => {
      setTripStatus('CANCELLED');
      router.navigate('/(tabs)/history');
      setTimeout(() => {
        Alert.alert('Trip Cancelled', 'This trip has been cancelled.');
      }, 300);
    };

    const handleLocationStream = (data: any) => {
      if (data && (data.latitude || data.lat)) {
        const newLat = parseFloat(data.latitude || data.lat);
        const newLng = parseFloat(data.longitude || data.lng);
        const newHeading = data.heading ? parseFloat(data.heading) : 0;

        setDriverInfo((prev: any) => ({
          ...prev,
          latitude: newLat,
          longitude: newLng,
          heading: newHeading,
        }));

        if (mapRef.current && mapRef.current.animateToRegion) {
          try {
            mapRef.current.animateToRegion({
              latitude: newLat,
              longitude: newLng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 1000);
          } catch (e) { }
        }
      }
    };

    const handleStageUpdate = (data: any) => {
      if (!data) return;
      const st = String(data.stage || data.status || '').toLowerCase();
      setTripStatus(st);
      if (data.driverName || data.driver_or_guide_name) {
        setDriverInfo((prev: any) => ({
          ...prev,
          name: data.driverName || data.driver_or_guide_name,
          phone: data.driverPhone || prev.phone,
          vehicleModel: data.vehicleModel || prev.vehicleModel,
          vehicleNumber: data.vehicleNumber || prev.vehicleNumber,
        }));
      }
      if (st === 'completed' || st === 'done') {
        handleCompleted(data);
      }
    };

    if (socket) {
      socket.on('trip_accepted', handleAccepted);
      socket.on('trip_status_updated', handleStageUpdate);
      socket.on('driver_location_stream', handleLocationStream);
      socket.on('driver_location_update', handleLocationStream);
      socket.on('trip_completed', handleCompleted);
      socket.on('trip_cancelled', handleCancelled);
      socket.on('trip_stage_update', handleStageUpdate);
      socket.on('trip_declined_by_driver', handleDeclined);
    }

    const sub1 = DeviceEventEmitter.addListener('trip_accepted', handleAccepted);
    const sub2 = DeviceEventEmitter.addListener('trip_declined', handleDeclined);
    const sub3 = DeviceEventEmitter.addListener('trip_cancelled', handleCancelled);
    const sub4 = DeviceEventEmitter.addListener('trip_completed', handleCompleted);
    const sub5 = DeviceEventEmitter.addListener('driver_location_stream', handleLocationStream);
    const sub6 = DeviceEventEmitter.addListener('driver_location_update', handleLocationStream);
    const sub7 = DeviceEventEmitter.addListener('trip_stage_update', handleStageUpdate);
    const sub8 = DeviceEventEmitter.addListener('trip_declined_by_driver', handleDeclined);

    return () => {
      if (socket) {
        socket.off('trip_accepted', handleAccepted);
        socket.off('trip_status_updated', handleStageUpdate);
        socket.off('driver_location_stream', handleLocationStream);
        socket.off('driver_location_update', handleLocationStream);
        socket.off('trip_completed', handleCompleted);
        socket.off('trip_cancelled', handleCancelled);
        socket.off('trip_stage_update', handleStageUpdate);
        socket.off('trip_declined_by_driver', handleDeclined);
      }
      sub1.remove();
      sub2.remove();
      sub3.remove();
      sub4.remove();
      sub5.remove();
      sub6.remove();
      sub7.remove();
      sub8.remove();
    };
  }, [tripIdParam, effectiveTripId]);

  const handleCancelTrip = () => {
    const targetId = tripIdParam || effectiveTripId;
    const dNameLower = String(driverInfo?.name || '').toLowerCase();
    const isPendingDriver = statusLower.includes('pending') || statusLower.includes('dispatched') || dNameLower.includes('search') || dNameLower.includes('auto') || !driverInfo?.name;

    const alertTitle = isPendingDriver ? 'Withdraw Ride Request?' : `Cancel Booking with Captain ${driverInfo.name}?`;
    const alertBody = isPendingDriver
      ? 'Are you sure you want to withdraw this booking request from nearby searching captains?'
      : `Are you sure you want to cancel this trip with Captain ${driverInfo.name}?`;

    Alert.alert(
      alertTitle,
      alertBody,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: isPendingDriver ? 'Yes, Withdraw' : 'Yes, Cancel Trip',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            const session = getUserSessionSync();
            try {
              await cancelTripApi(targetId, { cancelledBy: 'tourist', role: 'tourist' });
              const socket = getSocket();
              if (socket && socket.connected) {
                socket.emit('trip_cancelled', { tripId: targetId, userId: session?.id, cancelledBy: 'tourist' });
              }
              DeviceEventEmitter.emit('trip_cancelled', { tripId: targetId });
              sendLocalNotification('Trip Cancelled', 'Your trip has been cancelled successfully.');
              router.navigate('/(tabs)/history');
              setTimeout(() => {
                Alert.alert('Trip Cancelled', 'Your ride request was cancelled and recorded in your History ledger.');
              }, 300);
            } catch (e) {
              console.warn('Cancel error:', e);
              router.navigate('/(tabs)/history');
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
    if (statusLower.includes('accepted')) return { text: t('partnerAssigned'), bg: '#10B981', color: '#FFFFFF' };
    if (statusLower.includes('arrived')) return { text: t('driverArrived'), bg: '#F5C518', color: '#101014' };
    if (statusLower.includes('start') || statusLower.includes('active')) return { text: t('tripInProgress'), bg: '#3B82F6', color: '#FFFFFF' };
    if (statusLower.includes('declined') || statusLower.includes('cancel')) return { text: t('tripCancelled'), bg: '#EF4444', color: '#FFFFFF' };
    return { text: t('searchingCaptain'), bg: '#F5C518', color: '#101014' };
  };

  const badge = getStatusBadge();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.amber} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => { if (router.canGoBack()) { router.back(); } else { router.navigate('/(tabs)'); } }} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={scale(22)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('liveStatus')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
          <LanguageSelector compact />
          <NotificationModal role="tourist" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: scale(16), paddingBottom: verticalScale(130) }} showsVerticalScrollIndicator={false}>
        {/* Status Header Badge */}
        <View style={[styles.statusBanner, { backgroundColor: badge.bg }]}>
          <MaterialIcons name="navigation" size={scale(18)} color={badge.color} style={{ marginRight: scale(6) }} />
          <Text style={[styles.statusBannerText, { color: badge.color }]}>{badge.text}</Text>
        </View>

        {/* Live Map Visual */}
        <View style={[styles.mapFrame, { borderColor: colors.border }]}>
          {(() => {
            const connectedPoints = [
              { latitude: driverInfo.latitude || pickupLat || 12.9716, longitude: driverInfo.longitude || pickupLng || 77.5946, label: `Driver: ${driverInfo.name}` },
              { latitude: pickupLat || 12.9716, longitude: pickupLng || 77.5946, label: `Pickup: ${pickupLocation}` },
              ...(Array.isArray(tripCheckpoints)
                ? tripCheckpoints
                  .filter((cp: any) => cp && (cp.latitude || cp.lat) && (cp.longitude || cp.lng))
                  .map((cp: any, idx: number) => ({
                    latitude: parseFloat(cp.latitude || cp.lat),
                    longitude: parseFloat(cp.longitude || cp.lng),
                    label: typeof cp === 'object' ? (cp.checkpoint_name || cp.name || `Stop ${idx + 1}`) : String(cp),
                  }))
                : []),
              { latitude: dropLat || 12.2958, longitude: dropLng || 76.6394, label: `Destination: ${dropLocation}` },
            ].filter((pt: any) => !isNaN(pt.latitude) && !isNaN(pt.longitude));

            if (Platform.OS === 'web' || !MapView) {
              return (
                <View style={styles.webMapPlaceholder}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), marginBottom: verticalScale(8) }}>
                    <MaterialIcons name="map" size={scale(24)} color={colors.amber} />
                    <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: moderateFontScale(14) }}>
                      Live Connected GPS Route
                    </Text>
                  </View>

                  <View style={{ paddingHorizontal: scale(10), width: '100%' }}>
                    {connectedPoints.map((pt: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ alignItems: 'center', width: scale(24) }}>
                          <View
                            style={{
                              width: scale(12),
                              height: scale(12),
                              borderRadius: scale(6),
                              backgroundColor: idx === 0 ? colors.amber : idx === connectedPoints.length - 1 ? '#EF4444' : '#10B981',
                              borderWidth: 2,
                              borderColor: '#FFFFFF',
                            }}
                          />
                          {idx < connectedPoints.length - 1 && (
                            <View style={{ width: 2, height: verticalScale(20), backgroundColor: colors.amber }} />
                          )}
                        </View>
                        <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '600', marginLeft: scale(8) }} numberOfLines={1}>
                          {pt.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            }

            return (
              <MapView
                ref={mapRef}
                provider="google"
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                  latitude: driverInfo.latitude || pickupLat || 12.9716,
                  longitude: driverInfo.longitude || pickupLng || 77.5946,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                <Marker
                  coordinate={{ latitude: driverInfo.latitude || 12.9716, longitude: driverInfo.longitude || 77.5946 }}
                  title={`Driver: ${driverInfo.name}`}
                  description={driverInfo.vehicleModel}
                  pinColor={colors.amber}
                  rotation={driverInfo.heading || 0}
                  flat={true}
                />

                <Marker
                  coordinate={{ latitude: pickupLat, longitude: pickupLng }}
                  title="Pickup Spot"
                  description={pickupLocation}
                  pinColor="#10B981"
                />

                {Array.isArray(tripCheckpoints) &&
                  tripCheckpoints.map((cp: any, idx: number) => {
                    const cpLat = parseFloat(cp.latitude || cp.lat);
                    const cpLng = parseFloat(cp.longitude || cp.lng);
                    if (isNaN(cpLat) || isNaN(cpLng)) return null;
                    const cpName = typeof cp === 'object' ? (cp.checkpoint_name || cp.name || `Stop ${idx + 1}`) : String(cp);
                    return (
                      <Marker
                        key={idx}
                        coordinate={{ latitude: cpLat, longitude: cpLng }}
                        title={`Stop #${idx + 1}`}
                        description={cpName}
                        pinColor="#3B82F6"
                      />
                    );
                  })}

                <Marker
                  coordinate={{ latitude: dropLat, longitude: dropLng }}
                  title="Destination"
                  description={dropLocation}
                  pinColor="#EF4444"
                />

                {Polyline && connectedPoints.length >= 2 && (
                  <Polyline
                    coordinates={connectedPoints}
                    strokeColor="#F5C518"
                    strokeWidth={4}
                  />
                )}
              </MapView>
            );
          })()}
        </View>

        {/* Driver Details Card */}
        {(() => {
          const dNameLower = String(driverInfo?.name || '').toLowerCase();
          const isPendingDriver = statusLower.includes('pending') || statusLower.includes('dispatched') || dNameLower.includes('search') || dNameLower.includes('auto') || !driverInfo?.name;
          const captainTitle = isPendingDriver ? 'Searching Captain...' : (driverInfo?.name || 'Searching Captain...');
          const vehicleNumberDisplay = isPendingDriver ? 'Assigning Captain...' : (driverInfo?.vehicleNumber || 'Assigning Captain...');

          return (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardHeaderTitle, { color: colors.textMuted }]}>
                {isPendingDriver ? 'SEARCHING NEARBY CAPTAINS' : 'ASSIGNED CAPTAIN'}
              </Text>
              <View style={styles.driverInfoRow}>
                <View style={styles.avatarCircle}>
                  <FontAwesome5 name="user-tie" size={scale(22)} color="#101014" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.driverName, { color: colors.textPrimary }]}>{captainTitle}</Text>
                  <Text style={[styles.driverVehicle, { color: colors.textMuted }]}>
                    {driverInfo.vehicleModel} • <Text style={{ color: colors.amber, fontWeight: '700' }}>{vehicleNumberDisplay}</Text>
                  </Text>
                  <View style={styles.ratingRow}>
                    <MaterialIcons name="verified" size={scale(14)} color={colors.amber} />
                    <Text style={[styles.ratingText, { color: colors.textPrimary }]}>
                      {isPendingDriver ? 'Targeted Category Captains' : 'Verified Partner'}
                    </Text>
                  </View>
                </View>

                {!isPendingDriver && (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => Linking.openURL(`tel:${driverInfo.phone || '+919900082400'}`)}
                  >
                    <MaterialIcons name="call" size={scale(18)} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })()}

        {/* Start OTP & End OTP Share Card */}
        {(() => {
          const isPending = statusLower.includes('pending') || statusLower.includes('dispatched') || statusLower.includes('search');

          return (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.amber, borderWidth: 1.5 }]}>
              <Text style={[styles.cardHeaderTitle, { color: colors.amber }]}>🔐 TRIP VERIFICATION CODES</Text>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), marginBottom: verticalScale(10) }}>
                {isPending ? 'Your Start OTP will be generated automatically as soon as a Captain accepts your ride.' : 'Share Start OTP with driver to begin ride, and End OTP at destination.'}
              </Text>

              {isPending ? (
                <View style={[styles.otpBox, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.border, paddingVertical: verticalScale(14) }]}>
                  <Text style={[styles.otpLabel, { color: colors.textMuted, textAlign: 'center' }]}>START OTP STATUS</Text>
                  <Text style={[styles.otpValue, { color: colors.amber, fontSize: moderateFontScale(14), textAlign: 'center', letterSpacing: 0 }]}>
                    ⏳ Generating on Acceptance...
                  </Text>
                </View>
              ) : (
                <View style={styles.otpRowGrid}>
                  <View style={[styles.otpBox, { backgroundColor: isDark ? 'rgba(245,197,24,0.1)' : '#FFFBEB', borderColor: colors.amber }]}>
                    <Text style={[styles.otpLabel, { color: colors.textMuted }]}>START TRIP OTP</Text>
                    <Text style={[styles.otpValue, { color: colors.amber }]}>{startOtp || '8240'}</Text>
                  </View>

                  <View style={[styles.otpBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', borderColor: colors.success }]}>
                    <Text style={[styles.otpLabel, { color: colors.textMuted }]}>END TRIP OTP</Text>
                    <Text style={[styles.otpValue, { color: colors.success }]}>{endOtp || '4321'}</Text>
                  </View>
                </View>
              )}
            </View>
          );
        })()}

        {/* Package Plan Details & Waypoints Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.amber, borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(10) }}>
            <Text style={[styles.cardHeaderTitle, { color: colors.amber }]}>🗺️ TOUR PACKAGE & ITINERARY</Text>
            <View style={{ backgroundColor: 'rgba(245, 197, 24, 0.15)', paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: scale(12) }}>
              <Text style={{ color: colors.amber, fontSize: moderateFontScale(11), fontWeight: '700' }}>
                {durationHours} HOURS TOUR
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: moderateFontScale(15), fontWeight: '800', color: colors.textPrimary, marginBottom: verticalScale(8) }}>
            {planName}
          </Text>

          <View style={{ flexDirection: 'row', gap: scale(12), marginBottom: verticalScale(14), paddingBottom: verticalScale(10), borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
              <MaterialIcons name="schedule" size={scale(14)} color={colors.amber} />
              <Text style={{ fontSize: moderateFontScale(12), color: colors.textMuted, fontWeight: '600' }}>
                Duration: <Text style={{ color: colors.textPrimary }}>{durationHours} Hours</Text>
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
              <MaterialIcons name="directions-car" size={scale(14)} color={colors.success} />
              <Text style={{ fontSize: moderateFontScale(12), color: colors.textMuted, fontWeight: '600' }}>
                Est. Distance: <Text style={{ color: colors.textPrimary }}>{distanceKm} KM</Text>
              </Text>
            </View>
          </View>

          {/* Checkpoint Nodes Timeline (Pickup -> Stop 1 to Stop N -> Final Drop) */}
          <Text style={{ fontSize: moderateFontScale(12), fontWeight: '800', color: colors.textPrimary, marginBottom: verticalScale(10), letterSpacing: 0.5 }}>
            📍 TOUR ITINERARY STOPS ({Array.isArray(tripCheckpoints) && tripCheckpoints.length > 0 ? tripCheckpoints.length : 0} STOPS)
          </Text>

          {(() => {
            const checkpointsList = Array.isArray(tripCheckpoints) && tripCheckpoints.length > 0
              ? tripCheckpoints.map((cp: any, idx: number) => {
                const cpName = typeof cp === 'object' && cp !== null ? (cp.checkpoint_name || cp.name || cp.title || `Stop ${idx + 1}`) : String(cp);
                return {
                  title: `STOP ${idx + 1}`,
                  name: cpName,
                  color: colors.amber,
                  note: null,
                };
              })
              : [];

            const fullTimeline = [
              {
                title: 'PICKUP POINT',
                name: pickupLocation || 'Pickup Point',
                color: colors.success,
                note: '* Driver will pick tourist up from Pickup Point',
              },
              ...checkpointsList,
              {
                title: 'FINAL DROP POINT',
                name: dropLocation || 'Drop Destination',
                color: colors.danger,
                note: '* Final tour destination drop point',
              },
            ];

            return (
              <View style={{ paddingLeft: scale(4) }}>
                {fullTimeline.map((item: any, idx: number) => {
                  const isLast = idx === fullTimeline.length - 1;

                  return (
                    <View key={idx} style={{ flexDirection: 'row', marginBottom: isLast ? 0 : verticalScale(14) }}>
                      <View style={{ alignItems: 'center', width: scale(22) }}>
                        <View
                          style={{
                            width: scale(14),
                            height: scale(14),
                            borderRadius: scale(7),
                            backgroundColor: item.color,
                            borderWidth: 2,
                            borderColor: '#FFFFFF',
                          }}
                        />
                        {!isLast && (
                          <View style={{ width: 2, height: verticalScale(28), backgroundColor: colors.border, marginTop: verticalScale(2) }} />
                        )}
                      </View>

                      <View style={{ flex: 1, marginLeft: scale(10) }}>
                        <Text style={{ fontSize: moderateFontScale(10), fontWeight: '800', color: item.color, letterSpacing: 0.5 }}>
                          {item.title}
                        </Text>
                        <Text style={{ fontSize: moderateFontScale(13), fontWeight: '700', color: colors.textPrimary, marginTop: verticalScale(2) }}>
                          {item.name}
                        </Text>
                        {item.note && (
                          <Text style={{ fontSize: moderateFontScale(11), color: colors.textMuted, marginTop: verticalScale(1) }}>
                            {item.note}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {/* Payment Breakdown */}
          <View style={[styles.fareRow, { borderTopColor: colors.border, marginTop: verticalScale(14) }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fareLabel, { color: colors.textMuted }]}>Payment Mode</Text>
              <Text style={[styles.paymentModeText, { color: colors.textPrimary }]}>{paymentMode}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.fareLabel, { color: colors.textMuted }]}>Total Fare</Text>
              <Text style={[styles.fareVal, { color: colors.amber }]}>₹{fareAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          {advanceDepositPaid > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: verticalScale(8), paddingTop: verticalScale(8), borderTopWidth: 1, borderTopColor: colors.border }}>
              <View>
                <Text style={{ fontSize: moderateFontScale(11), color: colors.success }}>Advance Deposit Paid</Text>
                <Text style={{ fontSize: moderateFontScale(13), fontWeight: '700', color: colors.success }}>₹{advanceDepositPaid.toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: moderateFontScale(11), color: colors.textMuted }}>Remaining Cash Balance</Text>
                <Text style={{ fontSize: moderateFontScale(13), fontWeight: '700', color: colors.textPrimary }}>₹{remainingCashBalance.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Cancel Trip Action Button (ONLY ALLOWED WHEN PENDING) */}
        {statusLower.includes('pending') && (
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
    marginBottom: verticalScale(24),
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: moderateFontScale(14),
  },
});
