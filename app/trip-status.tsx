import NotificationModal from '@/components/NotificationModal';
import { adminState } from '@/constants/admin-state';
import { cancelTripApi, fetchLiveLocationApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { sendLocalNotification } from '@/constants/notifications';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import LanguageSelector from '@/src/components/LanguageSelector';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { getSocket, initSocketService, joinTripRoom } from '@src/services/socketService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { fetchRoadRoute, LatLng, snapToRoadRoute } from '@/src/services/roadRoutingService';


export default function TripStatusScreen() {
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
      return all.find((t: any) => t && (String(t.id).toLowerCase().trim() === tid || String(t.tripId || '').toLowerCase().trim() === tid)) || null;
    }
    return null;
  }, [tripIdParam]);

  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
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
  const [pickupLat, setPickupLat] = useState<number>(initialLocalTrip?.pickupLat || 12.9723);
  const [pickupLng, setPickupLng] = useState<number>(initialLocalTrip?.pickupLng || 75.7865);
  const [dropLat, setDropLat] = useState<number>(initialLocalTrip?.dropLat || 12.9730);
  const [dropLng, setDropLng] = useState<number>(initialLocalTrip?.dropLng || 75.7845);
  const [fareAmount, setFareAmount] = useState(initialLocalTrip?.price || initialLocalTrip?.amount || 1200);
  const [paymentMode, setPaymentMode] = useState(initialLocalTrip?.paymentMode || 'Wallet');
  const [advanceDepositPaid, setAdvanceDepositPaid] = useState<number>(initialLocalTrip?.advanceDepositPaid || 0);
  const [remainingCashBalance, setRemainingCashBalance] = useState<number>(initialLocalTrip?.remainingCashBalance || (initialLocalTrip?.price || initialLocalTrip?.amount || 1200));
  const [tripCheckpoints, setTripCheckpoints] = useState<any[]>(initialLocalTrip?.checkpoints || initialLocalTrip?.route || []);
  const [startOtp, setStartOtp] = useState(initialLocalTrip?.otp || initialLocalTrip?.startOtp || '');
  const [endOtp, setEndOtp] = useState(initialLocalTrip?.endOtp || initialLocalTrip?.end_otp || '');
  const [planName, setPlanName] = useState<string>(initialLocalTrip?.title || 'Tour Plan Package');
  const [durationHours, setDurationHours] = useState<number>(initialLocalTrip?.durationHours || 8);
  const [distanceKm, setDistanceKm] = useState<number>(initialLocalTrip?.distanceKm || 120);
  const [roadCoords, setRoadCoords] = useState<LatLng[]>([]);

  // Fetch real-world road route connecting Driver -> Pickup -> Checkpoints -> Destination
  useEffect(() => {
    const waypoints: LatLng[] = [];

    const hasValidDriverLoc = driverInfo.latitude && driverInfo.latitude !== 12.9716 && driverInfo.latitude !== 0;
    if (hasValidDriverLoc) {
      waypoints.push({ latitude: driverInfo.latitude, longitude: driverInfo.longitude });
    }

    if (pickupLat && pickupLat !== 0) {
      waypoints.push({ latitude: pickupLat, longitude: pickupLng });
    }

    if (Array.isArray(tripCheckpoints)) {
      tripCheckpoints.forEach((cp: any) => {
        const cLat = parseFloat(cp.latitude || cp.lat);
        const cLng = parseFloat(cp.longitude || cp.lng);
        if (!isNaN(cLat) && !isNaN(cLng) && (cLat !== 0 || cLng !== 0)) {
          waypoints.push({ latitude: cLat, longitude: cLng });
        }
      });
    }

    if (dropLat && dropLat !== 0) {
      waypoints.push({ latitude: dropLat, longitude: dropLng });
    }

    if (waypoints.length >= 2) {
      fetchRoadRoute(waypoints)
        .then(res => {
          if (res && res.coordinates && res.coordinates.length >= 2) {
            setRoadCoords(res.coordinates);
          }
        })
        .catch(err => {
          console.warn('[TripStatus] Error fetching real road route:', err);
        });
    }
  }, [pickupLat, pickupLng, dropLat, dropLng, tripCheckpoints, driverInfo.latitude, driverInfo.longitude]);

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

  const hasHandledTerminalStateRef = useRef(false);

  // Poll live location & trip status from DB
  useEffect(() => {
    async function loadStatus() {
      if (hasHandledTerminalStateRef.current) return;
      try {
        const res = await fetchLiveLocationApi(tripIdParam);
        if (res && res.success && res.data) {
          const statusStr = String(res.data.status || '');
          const statusLower = statusStr.toLowerCase();
          setTripStatus(statusStr);

          const dObj = res.data.driver || res.data.driverDetails || {};
          const dName = dObj.name || dObj.driverName || res.data.driver_or_guide_name || res.data.driverName || res.data.driver_name;
          const dPhone = dObj.phone || dObj.driverPhone || res.data.driver_phone || res.data.driverPhone;
          const dModel = dObj.vehicleModel || dObj.vehicle_model || res.data.vehicle_model || res.data.vehicleModel;
          const dNum = dObj.vehicleNumber || dObj.vehicle_number || res.data.vehicle_number || res.data.vehicleNumber;

          if (dName || dPhone || dModel || dNum) {
            setDriverInfo((prev: any) => {
              const updated = {
                ...prev,
                name: dName || prev.name,
                phone: dPhone || prev.phone,
                vehicleModel: dModel || prev.vehicleModel,
                vehicleNumber: (dNum && dNum !== 'Assigning Captain...') ? dNum : prev.vehicleNumber,
                latitude: dObj.latitude ? parseFloat(dObj.latitude) : prev.latitude,
                longitude: dObj.longitude ? parseFloat(dObj.longitude) : prev.longitude,
                heading: dObj.heading ? parseFloat(dObj.heading) : prev.heading,
              };

              if (Array.isArray(adminState.userTrips)) {
                const target: any = adminState.userTrips.find((t: any) => String(t.id) === String(tripIdParam));
                if (target) {
                  target.driverOrGuideName = updated.name;
                  target.driverName = updated.name;
                  target.driverPhone = updated.phone;
                  target.vehicleModel = updated.vehicleModel;
                  target.vehicleNumber = updated.vehicleNumber;
                }
              }
              return updated;
            });
          }
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
          if (statusLower.includes('completed') || statusLower.includes('finish') || statusLower.includes('done')) {
            hasHandledTerminalStateRef.current = true;
            sendLocalNotification('Trip Completed 🎉', 'Your ride has finished successfully.');
            Alert.alert('Trip Completed 🎉', 'Your ride has finished. Thank you for riding with Vibzz!', [
              { text: 'View History', onPress: () => router.navigate('/(tabs)/history') }
            ]);
            return;
          }
          if (statusLower.includes('cancelled') || statusLower.includes('declined')) {
            hasHandledTerminalStateRef.current = true;
            if (Array.isArray(adminState.userTrips)) {
              adminState.userTrips = adminState.userTrips.filter(t => t && String(t.id) !== String(tripIdParam));
            }
            Alert.alert('Trip Cancelled', 'This booking was cancelled by Admin/Driver.', [
              { text: 'OK', onPress: () => router.replace('/(tabs)' as any) }
            ]);
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
  }, [tripIdParam]);

  // Dynamic Map Bounds Camera Fit (Halo Repo tracking pattern)
  useEffect(() => {
    const timer = setTimeout(() => {
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
    }, 600);
    return () => clearTimeout(timer);
  }, [driverInfo.latitude, driverInfo.longitude, pickupLat, pickupLng, dropLat, dropLng]);

  // Socket & DeviceEventEmitter listeners
  const hasShownAcceptedAlertRef = useRef(false);

  useEffect(() => {
    const session = getUserSessionSync();
    initSocketService(session?.id, session?.role || 'tourist');

    if (tripIdParam) {
      joinTripRoom(tripIdParam, 'tourist', session?.id);
    }

    const socket = getSocket();

    const handleAccepted = (data: any) => {
      console.log('[TripStatusScreen] 🟢 Received real-time trip_accepted event:', data);
      if (data) {
        setTripStatus('Accepted');
        const dName = data.driverName || data.driver_or_guide_name || data.name;
        const dPhone = data.driverPhone || data.phone;
        const dModel = data.vehicleModel || data.vehicle_model;
        const dNum = data.vehicleNumber || data.vehicle_number;

        setDriverInfo((prev: any) => {
          const updated = {
            ...prev,
            name: dName || prev.name,
            phone: dPhone || prev.phone,
            vehicleModel: dModel || prev.vehicleModel,
            vehicleNumber: (dNum && dNum !== 'Assigning Captain...') ? dNum : prev.vehicleNumber,
          };
          if (Array.isArray(adminState.userTrips)) {
            const target: any = adminState.userTrips.find((t: any) => String(t.id) === String(tripIdParam));
            if (target) {
              target.driverOrGuideName = updated.name;
              target.driverName = updated.name;
              target.driverPhone = updated.phone;
              target.vehicleModel = updated.vehicleModel;
              target.vehicleNumber = updated.vehicleNumber;
            }
          }
          return updated;
        });

        if (data.otp) setStartOtp(String(data.otp));
        if (data.endOtp || data.end_otp) setEndOtp(String(data.endOtp || data.end_otp));
        sendLocalNotification('Driver Assigned!', `${dName || 'Captain'} has accepted your booking.`);
      }
    };

    const handleCompleted = (data: any) => {
      if (hasHandledTerminalStateRef.current) return;
      hasHandledTerminalStateRef.current = true;
      console.log('[TripStatusScreen] 🏁 Active trip completed:', data);
      setTripStatus('Completed');
      sendLocalNotification('Trip Completed 🎉', 'Your ride has finished successfully.');
      Alert.alert('Trip Completed 🎉', 'Your ride has finished! Thank you for choosing Vibzz.', [
        { text: 'View History', onPress: () => router.navigate('/(tabs)/history') }
      ]);
    };

    const handleDeclined = (data?: any) => {
      console.log('[TripStatusScreen] ❌ Driver declined booking:', data);
      const dName = data?.driverName || data?.driver_or_guide_name || 'The captain';
      setTripStatus('Pending');
      setDriverInfo((prev: any) => ({
        ...prev,
        name: 'Searching Captain...',
        vehicleNumber: 'Assigning Captain...',
      }));
      sendLocalNotification('Booking Declined', `${dName} declined your booking request.`);
      Alert.alert(
        'Booking Request Declined ❌',
        `${dName} has declined your trip request. You can re-book with a new driver.`,
        [
          { text: 'Book New Driver 🚕', onPress: () => router.replace('/plan-route' as any) },
          { text: 'Keep Waiting', style: 'cancel' }
        ]
      );
    };

    const handleCancelled = () => {
      if (hasHandledTerminalStateRef.current) return;
      hasHandledTerminalStateRef.current = true;
      setTripStatus('CANCELLED');
      if (Array.isArray(adminState.userTrips)) {
        adminState.userTrips = adminState.userTrips.filter(t => t && String(t.id) !== String(tripIdParam));
      }
      Alert.alert('Trip Cancelled', 'This booking was cancelled by Admin/Driver.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)' as any) }
      ]);
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
  }, [tripIdParam]);

  const handleCancelTrip = () => {
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
            if (hasHandledTerminalStateRef.current) return;
            hasHandledTerminalStateRef.current = true;
            setCancelling(true);
            const session = getUserSessionSync();
            try {
              await cancelTripApi(tripIdParam, { cancelledBy: 'tourist', role: 'tourist' });
              const socket = getSocket();
              if (socket && socket.connected) {
                socket.emit('trip_cancelled', { tripId: tripIdParam, userId: session?.id, cancelledBy: 'tourist' });
              }
              DeviceEventEmitter.emit('trip_cancelled', { tripId: tripIdParam });
              sendLocalNotification('Trip Cancelled', 'Your trip has been cancelled successfully.');
              router.replace('/(tabs)/history');
            } catch (e) {
              console.warn('Cancel error:', e);
              router.replace('/(tabs)/history');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const statusLower = String(tripStatus).toLowerCase();
  const dNameLower = String(driverInfo?.name || '').toLowerCase();
  const isDriverAccepted = (
    statusLower.includes('accept') ||
    statusLower.includes('arrived') ||
    statusLower.includes('start') ||
    statusLower.includes('active') ||
    statusLower.includes('progress')
  ) && Boolean(driverInfo?.name && !dNameLower.includes('search'));

  const getStatusBadge = () => {
    if (isDriverAccepted) return { text: t('partnerAssigned'), bg: '#10B981', color: '#FFFFFF' };
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

  if (!tripIdParam && !initialLocalTrip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: scale(20) }]} edges={['top']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <MaterialIcons name="directions-car" size={scale(64)} color={colors.amber} style={{ marginBottom: 16 }} />
        <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(22), fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
          {t('noActiveTripFound')}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(14), textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 }}>
          {t('noActiveTripSub')}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.amber, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, marginBottom: 12, width: '100%', alignItems: 'center' }}
          onPress={() => router.navigate('/(tabs)')}
        >
          <Text style={{ color: '#101014', fontWeight: '800', fontSize: moderateFontScale(15) }}>{t('bookNewTrip')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, width: '100%', alignItems: 'center' }}
          onPress={() => router.navigate('/(tabs)/history')}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: moderateFontScale(14) }}>{t('viewTripHistory')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
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

      <ScrollView contentContainerStyle={{ padding: scale(16), paddingBottom: verticalScale(100) }} showsVerticalScrollIndicator={false}>
        {/* Status Header Badge */}
        <View style={[styles.statusBanner, { backgroundColor: badge.bg }]}>
          <MaterialIcons name="navigation" size={scale(18)} color={badge.color} style={{ marginRight: scale(6) }} />
          <Text style={[styles.statusBannerText, { color: badge.color }]}>{badge.text}</Text>
        </View>

        {/* Live Map Visual */}
        <View style={[styles.mapFrame, { borderColor: colors.border }]}>
          {(() => {
            // Build 100% connected points sequence (Driver ➔ Pickup ➔ Checkpoints ➔ Destination)
            const pLat = (pickupLat && pickupLat !== 12.9716 && pickupLat !== 0) ? pickupLat : 12.9723;
            const pLng = (pickupLng && pickupLng !== 77.5946 && pickupLng !== 0) ? pickupLng : 75.7865;
            const dLat = (dropLat && dropLat !== 12.2958 && dropLat !== 0) ? dropLat : 12.9730;
            const dLng = (dropLng && dropLng !== 76.6394 && dropLng !== 0) ? dropLng : 75.7845;
            const drvLat = (driverInfo.latitude && driverInfo.latitude !== 12.9716 && driverInfo.latitude !== 0) ? driverInfo.latitude : pLat + 0.002;
            const drvLng = (driverInfo.longitude && driverInfo.longitude !== 77.5946 && driverInfo.longitude !== 0) ? driverInfo.longitude : pLng + 0.002;

            const connectedPoints = [
              { latitude: drvLat, longitude: drvLng, label: `Driver: ${driverInfo.name || 'Captain'}` },
              { latitude: pLat, longitude: pLng, label: `Pickup: ${pickupLocation}` },
              ...(Array.isArray(tripCheckpoints)
                ? tripCheckpoints
                  .filter((cp: any) => cp && (cp.latitude || cp.lat) && (cp.longitude || cp.lng))
                  .map((cp: any, idx: number) => ({
                    latitude: parseFloat(cp.latitude || cp.lat),
                    longitude: parseFloat(cp.longitude || cp.lng),
                    label: typeof cp === 'object' ? (cp.checkpoint_name || cp.name || `Stop ${idx + 1}`) : String(cp),
                  }))
                : []),
              { latitude: dLat, longitude: dLng, label: `Destination: ${dropLocation}` },
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

                  {/* Connected Route Line Visual */}
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
                  latitude: pLat,
                  longitude: pLng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                {/* Driver Marker */}
                <Marker
                  coordinate={{ latitude: drvLat, longitude: drvLng }}
                  title={`Driver: ${driverInfo.name || 'Captain'}`}
                  description={driverInfo.vehicleModel || 'Cab'}
                  pinColor={colors.amber}
                  rotation={driverInfo.heading || 0}
                  flat={true}
                />

                {/* Pickup Marker */}
                <Marker
                  coordinate={{ latitude: pLat, longitude: pLng }}
                  title="Pickup Spot"
                  description={pickupLocation}
                  pinColor="#10B981"
                />

                {/* Intermediate Checkpoint Markers */}
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

                {/* Drop Marker */}
                <Marker
                  coordinate={{ latitude: dLat, longitude: dLng }}
                  title="Destination"
                  description={dropLocation}
                  pinColor="#EF4444"
                />

                {/* Connected Real-World Road Polyline */}
                {Polyline && (roadCoords.length >= 2 || connectedPoints.length >= 2) && (
                  <>
                    <Polyline
                      coordinates={roadCoords.length >= 2 ? roadCoords : connectedPoints}
                      strokeColor="rgba(0, 0, 0, 0.45)"
                      strokeWidth={7}
                    />
                    <Polyline
                      coordinates={roadCoords.length >= 2 ? roadCoords : connectedPoints}
                      strokeColor="#F5C518"
                      strokeWidth={4}
                    />
                  </>
                )}
              </MapView>
            );
          })()}
        </View>

        {/* Driver Details Card */}
        {(() => {
          const dNameLower = String(driverInfo?.name || '').toLowerCase();
          const hasDriver = Boolean(driverInfo?.name && !dNameLower.includes('searching'));
          const isPendingDriver = !hasDriver || (statusLower.includes('pending') || statusLower.includes('dispatched'));
          const captainTitle = isPendingDriver ? `${t('searchingNearbyCaptains')}...` : (driverInfo?.name || `${t('searchingNearbyCaptains')}...`);
          const vehicleNumberDisplay = isPendingDriver ? 'Assigning Captain...' : (driverInfo?.vehicleNumber || 'Assigning Captain...');

          return (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardHeaderTitle, { color: colors.textMuted }]}>
                {isPendingDriver ? t('searchingNearbyCaptains') : t('assignedCaptain')}
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
                      {isPendingDriver ? t('targetedCategoryCaptains') : t('verifiedPartner')}
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

        {/* Start OTP & End OTP Share Card - Only shown when driver accepts trip */}
        {isDriverAccepted && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.amber, borderWidth: 1.5 }]}>
            <Text style={[styles.cardHeaderTitle, { color: colors.amber }]}>{t('verificationCodes')}</Text>
            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), marginBottom: verticalScale(10) }}>
              Share Start OTP with driver to begin ride, and End OTP at destination.
            </Text>

            <View style={styles.otpRowGrid}>
              <View style={[styles.otpBox, { backgroundColor: isDark ? 'rgba(245,197,24,0.1)' : '#FFFBEB', borderColor: colors.amber }]}>
                <Text style={[styles.otpLabel, { color: colors.textMuted }]}>{t('startOtp')}</Text>
                <Text style={[styles.otpValue, { color: colors.amber }]}>{startOtp || '----'}</Text>
              </View>

              <View style={[styles.otpBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', borderColor: colors.success }]}>
                <Text style={[styles.otpLabel, { color: colors.textMuted }]}>{t('endOtp')}</Text>
                <Text style={[styles.otpValue, { color: colors.success }]}>{endOtp || '----'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Package Plan Details & Waypoints Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.amber, borderWidth: 1 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(10) }}>
            <Text style={[styles.cardHeaderTitle, { color: colors.amber }]}>{t('tourPackageItinerary')}</Text>
            <View style={{ backgroundColor: 'rgba(245, 197, 24, 0.15)', paddingHorizontal: scale(8), paddingVertical: verticalScale(2), borderRadius: scale(12) }}>
              <Text style={{ color: colors.amber, fontSize: moderateFontScale(11), fontWeight: '700' }}>
                {durationHours} {t('hoursTour')}
              </Text>
            </View>
          </View>

          {/* Package Name & Metadata Grid */}
          <Text style={{ fontSize: moderateFontScale(15), fontWeight: '800', color: colors.textPrimary, marginBottom: verticalScale(8) }}>
            {planName}
          </Text>

          <View style={{ flexDirection: 'row', gap: scale(12), marginBottom: verticalScale(14), paddingBottom: verticalScale(10), borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
              <MaterialIcons name="schedule" size={scale(14)} color={colors.amber} />
              <Text style={{ fontSize: moderateFontScale(12), color: colors.textMuted, fontWeight: '600' }}>
                {t('duration')}: <Text style={{ color: colors.textPrimary }}>{durationHours} {t('hours')}</Text>
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
              <MaterialIcons name="directions-car" size={scale(14)} color={colors.success} />
              <Text style={{ fontSize: moderateFontScale(12), color: colors.textMuted, fontWeight: '600' }}>
                {t('estDistance')}: <Text style={{ color: colors.textPrimary }}>{distanceKm} {t('km')}</Text>
              </Text>
            </View>
          </View>

          {/* Checkpoint Nodes Timeline (Pickup -> Stop 1 to Stop N -> Final Drop) */}
          <Text style={{ fontSize: moderateFontScale(12), fontWeight: '800', color: colors.textPrimary, marginBottom: verticalScale(10), letterSpacing: 0.5 }}>
            {t('tourItineraryStops')} ({Array.isArray(tripCheckpoints) && tripCheckpoints.length > 0 ? tripCheckpoints.length : 0} {t('stops')})
          </Text>

          {(() => {
            const checkpointsList = Array.isArray(tripCheckpoints) && tripCheckpoints.length > 0
              ? tripCheckpoints.map((cp: any, idx: number) => {
                const cpName = typeof cp === 'object' && cp !== null ? (cp.checkpoint_name || cp.name || cp.title || `${t('stop')} ${idx + 1}`) : String(cp);
                return {
                  title: `${t('stop')} ${idx + 1}`,
                  name: cpName,
                  color: colors.amber,
                  note: null,
                };
              })
              : [];

            const fullTimeline = [
              {
                title: t('pickupPoint'),
                name: pickupLocation || 'Pickup Point',
                color: colors.success,
                note: t('driverWillPickUp'),
              },
              ...checkpointsList,
              {
                title: t('finalDropPoint'),
                name: dropLocation || 'Drop Destination',
                color: colors.danger,
                note: t('finalDestinationDrop'),
              },
            ];

            return (
              <View style={{ paddingLeft: scale(4) }}>
                {fullTimeline.map((item: any, idx: number) => {
                  const isLast = idx === fullTimeline.length - 1;

                  return (
                    <View key={idx} style={{ flexDirection: 'row', marginBottom: isLast ? 0 : verticalScale(14) }}>
                      {/* Timeline Dot & Line */}
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

                      {/* Stop Address Details */}
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
              <Text style={[styles.fareLabel, { color: colors.textMuted }]}>{t('paymentMode')}</Text>
              <Text style={[styles.paymentModeText, { color: colors.textPrimary }]}>{paymentMode}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.fareLabel, { color: colors.textMuted }]}>{t('totalFare')}</Text>
              <Text style={[styles.fareVal, { color: colors.amber }]}>₹{fareAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          {advanceDepositPaid > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: verticalScale(8), paddingTop: verticalScale(8), borderTopWidth: 1, borderTopColor: colors.border }}>
              <View>
                <Text style={{ fontSize: moderateFontScale(11), color: colors.success }}>{t('advanceDepositPaid')}</Text>
                <Text style={{ fontSize: moderateFontScale(13), fontWeight: '700', color: colors.success }}>₹{advanceDepositPaid.toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: moderateFontScale(11), color: colors.textMuted }}>{t('remainingCashBalance')}</Text>
                <Text style={{ fontSize: moderateFontScale(13), fontWeight: '700', color: colors.textPrimary }}>₹{remainingCashBalance.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Cancel / Withdraw Action Button */}
        {(!statusLower.includes('cancel') && !statusLower.includes('completed') && !statusLower.includes('done')) && (
          !isDriverAccepted ? (
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
                  <Text style={styles.cancelBtnText}>{t('cancelTrip')}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: '#DC2626', marginTop: verticalScale(10) }]}
              onPress={() => {
                Alert.alert(
                  '📞 Request Active Trip Cancellation',
                  'Active trips require Admin verification before cancellation.\n\nPlease call Admin Support directly to state your cancellation reason. Admin will verify with the captain/tourist and process the cancellation.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: '📞 Call Admin Support',
                      onPress: () => {
                        try {
                          Linking.openURL('tel:918088626099');
                        } catch (e) {
                          Alert.alert('Admin Support', 'Please call Admin Support at +91 80886 26099 to cancel your active trip.');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <MaterialIcons name="phone-in-talk" size={scale(18)} color="#FFFFFF" style={{ marginRight: scale(6) }} />
              <Text style={styles.cancelBtnText}>{t('cancelTrip')}</Text>
            </TouchableOpacity>
          )
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
