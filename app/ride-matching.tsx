import { initSocketService, getSocket } from '@src/services/socketService';
import { adminState, TripRecord } from '@/constants/admin-state';
import { fetchDriversApi, fetchGuidesApi, fetchLiveLocationApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { broadcastNewTripRequest } from '@/constants/tripSync';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapView, { Marker, Polyline } from '@/components/react-native-maps';

interface Coordinate {
  latitude: number;
  longitude: number;
}

export default function RideMatchingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State: 'searching' | 'matched' | 'started' | 'completed'
  const [status, setStatus] = useState<'searching' | 'matched' | 'started' | 'completed'>('searching');
  const [progressIndex, setProgressIndex] = useState(0);
  const [completedModalVisible, setCompletedModalVisible] = useState(false);

  // Parse location nodes passed via search params
  const pickupName = (params.pickupName as string) || 'Bengaluru Palace';
  const pickupLat = parseFloat((params.pickupLat as string) || '12.9982');
  const pickupLng = parseFloat((params.pickupLng as string) || '77.5920');

  const dropName = (params.dropName as string) || 'Majestic Railway Station';
  const dropLat = parseFloat((params.dropLat as string) || '12.9784');
  const dropLng = parseFloat((params.dropLng as string) || '77.5694');

  const rawStops = params.stops as string;
  let parsedStops: any[] = [];
  if (rawStops) {
    try {
      parsedStops = JSON.parse(rawStops);
    } catch (e) {
      console.warn('Failed to parse stops:', e);
    }
  }

  const price = parseInt((params.price as string) || '340');
  const tripType = (params.type as 'cab' | 'guide' | 'custom_trip') || 'cab';
  const vehicle = (params.vehicle as string) || '5seater';
  const paymentMode = (params.paymentMode as 'UPI' | 'Cash') || 'UPI';
  const passengerCount = parseInt((params.passengerCount as string) || '1');

  const tripIdParam = (params.tripId as string) || (params.id as string) || '';
  const pollIntervalRef = useRef<any>(null);
  const isNavigatedRef = useRef(false);
  const [liveDriverInfo, setLiveDriverInfo] = useState<any>(null);

  // Live / Server driver information (null by default until matched with a real driver)
  const demoDriver = {
    name: liveDriverInfo?.name || null,
    phone: liveDriverInfo?.phone || null,
    vehicleName: liveDriverInfo?.vehicleModel || null,
    vehicleNumber: liveDriverInfo?.vehicleNumber || null,
    otp: (params.otp as string) || null,
  };

  // Generate route coordinates list connecting pickup -> stops -> drop
  const [routeCoords, setRouteCoords] = useState<Coordinate[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(true);

  // Wiggling cars coords for searching phase
  const [wiggleCars, setWiggleCars] = useState<Coordinate[]>([]);
  const [searchingTimer, setSearchingTimer] = useState(45);
  const [isDriverDeclined, setIsDriverDeclined] = useState(false);
  const [isDriverTimeout, setIsDriverTimeout] = useState(false);

  // 45-second targeted searching timer countdown
  useEffect(() => {
    let interval: any = null;
    if (status === 'searching' && searchingTimer > 0 && !isDriverDeclined) {
      interval = setInterval(() => {
        setSearchingTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval!);
            setIsDriverTimeout(true);
            setIsDriverDeclined(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, searchingTimer, isDriverDeclined]);

  const handleBroadcastToAll = () => {
    setIsDriverDeclined(false);
    setIsDriverTimeout(false);
    setSearchingTimer(45);
    const broadcastObj = {
      id: tripIdParam || `trip_${Date.now()}`,
      tripId: tripIdParam || `trip_${Date.now()}`,
      tripType: tripType,
      vehicleType: vehicle,
      title: `${pickupName} ➔ ${dropName}`,
      pickup: pickupName,
      drop: dropName,
      estimatedFare: price,
      price: price,
      paymentMode: paymentMode,
      passengerCount: passengerCount,
      customerName: 'Tourist Client',
      status: 'Pending',
      bookingType: 'INSTANT',
      otp: (params.otp as string) || '8240',
      endOtp: (params.endOtp as string) || '4321',
      createdAt: new Date().toISOString(),
    };
    broadcastNewTripRequest(broadcastObj);
    Alert.alert('Broadcast Dispatched!', 'Your ride request has been broadcasted to all nearby available drivers.');
  };

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
    success: '#10B981',
    blue: '#3b82f6',
  };

  // Build simulated route coordinates between checkpoints
  useEffect(() => {
    // Collect all nodes in sequence
    const nodes = [
      { latitude: pickupLat, longitude: pickupLng },
      ...parsedStops.map(s => ({ latitude: s.latitude, longitude: s.longitude })),
      { latitude: dropLat, longitude: dropLng }
    ];

    // Generate dense polyline (10 steps per leg to make the moving marker smooth)
    const points: Coordinate[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const start = nodes[i];
      const end = nodes[i + 1];
      for (let j = 0; j < 10; j++) {
        const fraction = j / 10;
        points.push({
          latitude: start.latitude + (end.latitude - start.latitude) * fraction,
          longitude: start.longitude + (end.longitude - start.longitude) * fraction
        });
      }
    }
    points.push(nodes[nodes.length - 1]); // Add final point

    setRouteCoords(points);
    setLoadingRoute(false);

    // Set wiggle cars near the pickup coordinates
    setWiggleCars([
      { latitude: pickupLat + 0.003, longitude: pickupLng - 0.002 },
      { latitude: pickupLat - 0.002, longitude: pickupLng + 0.003 },
      { latitude: pickupLat + 0.001, longitude: pickupLng + 0.002 },
    ]);
  }, []);

  // Wiggle cars simulator during searching
  useEffect(() => {
    if (status !== 'searching') return;
    const interval = setInterval(() => {
      setWiggleCars(prev =>
        prev.map(c => ({
          latitude: c.latitude + (Math.random() - 0.5) * 0.0005,
          longitude: c.longitude + (Math.random() - 0.5) * 0.0005,
        }))
      );
    }, 800);
    return () => clearInterval(interval);
  }, [status]);

  // Fetch real matching driver/guide from API & dispatch targeted ride request ONLY if user selected a driver
  useEffect(() => {
    async function resolveSpecificDriver() {
      try {
        const selectedDriverId = (params.driverId as string) || (params.selectedDriverId as string) || '';

        if (!selectedDriverId) {
          console.log('[RideMatching] No selectedDriverId provided by user. Waiting for real driver acceptance via broadcast.');
          return;
        }

        if (tripType === 'guide') {
          const guides = await fetchGuidesApi();
          let matched = guides.find((g: any) => String(g.user_id || g.id) === String(selectedDriverId));

          if (matched) {
            const driverInfo = {
              id: matched.user_id || matched.id,
              name: matched.name || null,
              phone: matched.phone || null,
              vehicleModel: matched.experience_years ? `Certified Tour Guide (${matched.experience_years} yrs exp)` : (matched.vehicle_model || null),
              vehicleNumber: matched.languages ? `Lang: ${matched.languages}` : (matched.vehicle_number || null),
            };
            setLiveDriverInfo(driverInfo);
            dispatchTargetedRequest(driverInfo.id, driverInfo);
          }
        } else {
          const drivers = await fetchDriversApi();
          let matched = drivers.find((d: any) => String(d.user_id || d.id) === String(selectedDriverId));

          if (matched) {
            const driverInfo = {
              id: matched.user_id || matched.id,
              name: matched.name || null,
              phone: matched.phone || null,
              vehicleModel: matched.vehicle_model || matched.vehicleModel || null,
              vehicleNumber: matched.vehicle_number || matched.vehicleNumber || null,
            };
            setLiveDriverInfo(driverInfo);
            dispatchTargetedRequest(driverInfo.id, driverInfo);
          }
        }
      } catch (e) {
        console.warn('Error resolving specific driver from API:', e);
      }
    }

    function dispatchTargetedRequest(targetDriverId: string, driverObj: any) {
      const tripObj = {
        id: tripIdParam || `trip_${Date.now()}`,
        tripId: tripIdParam || `trip_${Date.now()}`,
        driverId: targetDriverId,
        driver_id: targetDriverId,
        selectedDriverId: targetDriverId,
        tripType: tripType,
        vehicleType: vehicle,
        title: `${pickupName} ➔ ${dropName}`,
        pickup: pickupName,
        pickupName: pickupName,
        pickupLat: pickupLat,
        pickupLng: pickupLng,
        drop: dropName,
        dropName: dropName,
        dropLat: dropLat,
        dropLng: dropLng,
        checkpoints: [pickupName, ...parsedStops.map(s => s.name || s.title || 'Stop'), dropName],
        estimatedFare: price,
        price: price,
        paymentMode: paymentMode,
        passengerCount: passengerCount,
        touristName: 'Tourist Client',
        customerName: 'Tourist Client',
        status: 'Pending',
        bookingType: 'INSTANT',
        otp: (params.otp as string) || '8240',
        endOtp: (params.endOtp as string) || '4321',
        createdAt: new Date().toISOString(),
      };

      console.log(`[RideMatching] 🚀 Dispatching targeted ride request to driver ${targetDriverId} (${driverObj.name})`);
      broadcastNewTripRequest(tripObj);
    }

    resolveSpecificDriver();
  }, [tripIdParam, tripType, vehicle]);

  const handleAcceptedData = (data: any) => {
    console.log('[RIDER] Event received:', data);
    if (isNavigatedRef.current) return;
    if (!data) return;

    const eventTripId = String(data.tripId || data.id || '');
    const currentTripId = String(tripIdParam || '');

    const isMatch = !currentTripId || !eventTripId || eventTripId === currentTripId;
    const isAccepted = String(data.status || '').toLowerCase() === 'accepted';

    if (isMatch && isAccepted) {
      console.log('[RIDER] ✅ Valid Acceptance Event! Navigating to /trip-status with tripId:', eventTripId || currentTripId);
      isNavigatedRef.current = true;
      setIsDriverTimeout(false);

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      if (data.driverName || data.driver_or_guide_name || data.driverId || data.driver_id) {
        setLiveDriverInfo({
          id: data.driverId || data.driver_id || null,
          name: data.driverName || data.driver_or_guide_name || null,
          phone: data.driverPhone || data.phone || null,
          vehicleModel: data.vehicleModel || data.vehicle_model || data.vehicleType || null,
          vehicleNumber: data.vehicleNumber || data.vehicle_number || null,
        });
      }

      setStatus('matched');
      const activeTripId = String(data.tripId || data.id || tripIdParam || 'active_trip_1');

      // 🔥 Use replace instead of push to prevent back navigation stack duplicate
      router.replace({
        pathname: '/trip-status',
        params: { tripId: activeTripId },
      });
    }
  };


  // Build simulated route coordinates between checkpoints
  useEffect(() => {
    // Collect all nodes in sequence
    const nodes = [
      { latitude: pickupLat, longitude: pickupLng },
      ...parsedStops.map(s => ({ latitude: s.latitude, longitude: s.longitude })),
      { latitude: dropLat, longitude: dropLng }
    ];

    // Generate dense polyline (10 steps per leg to make the moving marker smooth)
    const points: Coordinate[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const start = nodes[i];
      const end = nodes[i + 1];
      for (let j = 0; j < 10; j++) {
        const fraction = j / 10;
        points.push({
          latitude: start.latitude + (end.latitude - start.latitude) * fraction,
          longitude: start.longitude + (end.longitude - start.longitude) * fraction
        });
      }
    }
    points.push(nodes[nodes.length - 1]); // Add final point

    setRouteCoords(points);
    setLoadingRoute(false);

    // Set wiggle cars near the pickup coordinates
    setWiggleCars([
      { latitude: pickupLat + 0.003, longitude: pickupLng - 0.002 },
      { latitude: pickupLat - 0.002, longitude: pickupLng + 0.003 },
      { latitude: pickupLat + 0.001, longitude: pickupLng + 0.002 },
    ]);
  }, []);

  // Wiggle cars simulator during searching
  useEffect(() => {
    if (status !== 'searching') return;
    const interval = setInterval(() => {
      setWiggleCars(prev =>
        prev.map(c => ({
          latitude: c.latitude + (Math.random() - 0.5) * 0.0005,
          longitude: c.longitude + (Math.random() - 0.5) * 0.0005,
        }))
      );
    }, 800);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    const session = getUserSessionSync();
    const customerIdParam = session?.id || (params.customerId as string) || (params.userId as string) || 't1';
    initSocketService(customerIdParam, 'tourist');
    const socket = getSocket();

    const joinRiderRooms = () => {
      if (socket) {
        const payload = {
          userId: customerIdParam,
          tripId: tripIdParam,
          room: `user:${customerIdParam}`,
          role: 'tourist',
        };
        socket.emit('join_room', payload);
        if (customerIdParam) {
          socket.emit('join_room', { room: `user:${customerIdParam}` });
        }
        if (tripIdParam) {
          socket.emit('join_room', { room: `trip:${tripIdParam}` });
        }
        console.log(`[RIDER] Emitted join_room for user:${customerIdParam} and trip:${tripIdParam}`);
      }
    };

    joinRiderRooms();

    const handleDeclinedData = (data: any) => {
      console.log('[RideMatchingScreen] ❌ Driver declined request:', data);
      setIsDriverDeclined(true);
      setIsDriverTimeout(false);
      setSearchingTimer(0);
    };

    const handleTripStatusUpdated = (data: any) => {
      console.log('[RIDER] Received trip_status_updated event:', data);
      if (!data) return;

      const currentStatus = String(data.status || '').toLowerCase();
      if (currentStatus === 'accepted') {
        handleAcceptedData(data);
      } else if (currentStatus === 'declined' || currentStatus === 'rejected') {
        setIsDriverDeclined(true);
        setIsDriverTimeout(false);
        setSearchingTimer(0);
        handleDeclinedData(data);
      }
    };

    const handleDirectAccepted = (data: any) => {
      console.log('[RIDER] Received direct trip_accepted event:', data);
      handleAcceptedData(data);
    };

    const handleLocationStream = (data: any) => {
      if (data && (data.latitude || data.lat)) {
        setLiveDriverInfo((prev: any) => ({
          ...prev,
          latitude: parseFloat(data.latitude || data.lat),
          longitude: parseFloat(data.longitude || data.lng),
        }));
      }
    };

    // 1. Direct Socket Event Listeners
    if (socket) {
      socket.on('connect', joinRiderRooms);
      socket.on('reconnect', joinRiderRooms);
      socket.on('trip_status_updated', handleTripStatusUpdated);
      socket.on('trip_accepted', handleDirectAccepted);
      socket.on('RIDE_ACCEPTED', handleDirectAccepted);
      socket.on('trip_declined', handleDeclinedData);
      socket.on('trip_declined_by_driver', handleDeclinedData);
      socket.on('RIDE_DECLINED', handleDeclinedData);
    }

    const subStatus = DeviceEventEmitter.addListener('trip_status_updated', handleTripStatusUpdated);
    const subAccepted = DeviceEventEmitter.addListener('trip_accepted', handleAcceptedData);
    const subRideAccepted = DeviceEventEmitter.addListener('RIDE_ACCEPTED', handleAcceptedData);
    const subDeclined = DeviceEventEmitter.addListener('trip_declined', handleDeclinedData);
    const subDeclinedByDriver = DeviceEventEmitter.addListener('trip_declined_by_driver', handleDeclinedData);
    const subRideDeclined = DeviceEventEmitter.addListener('RIDE_DECLINED', handleDeclinedData);
    const subLocation = DeviceEventEmitter.addListener('driver_location_stream', handleLocationStream);

    return () => {
      if (socket) {
        socket.off('trip_status_updated', handleTripStatusUpdated);
        socket.off('trip_accepted', handleDirectAccepted);
        socket.off('RIDE_ACCEPTED', handleDirectAccepted);
        socket.off('trip_declined', handleDeclinedData);
        socket.off('trip_declined_by_driver', handleDeclinedData);
        socket.off('RIDE_DECLINED', handleDeclinedData);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      subStatus.remove();
      subAccepted.remove();
      subRideAccepted.remove();
      subDeclined.remove();
      subDeclinedByDriver.remove();
      subRideDeclined.remove();
      subLocation.remove();
    };
  }, [tripIdParam]);

  // Drive marker simulation along the points list when started
  useEffect(() => {
    if (status !== 'started') return;
    const interval = setInterval(() => {
      setProgressIndex(prev => {
        const next = prev + 1;
        if (next >= routeCoords.length) {
          clearInterval(interval);
          setStatus('completed');
          return prev;
        }
        return next;
      });
    }, 450); // Speed of vehicle marker traveling path
    return () => clearInterval(interval);
  }, [status, routeCoords]);

  // Handle saving trip to history list in adminState
  const handleCompleteTripSim = () => {
    const routeNames = [pickupName, ...parsedStops.map(s => s.name), dropName];
    const newRecord: TripRecord = {
      id: `sim_${Date.now()}`,
      type: tripType,
      vehicleType: demoDriver.vehicleName,
      title: `${pickupName} ➔ ${dropName}`,
      route: routeNames,
      driverOrGuideName: demoDriver.name,
      date: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: price,
      paymentMode: paymentMode,
      status: 'Completed',
      passengerCount: passengerCount,
    };

    // Append to global state
    adminState.userTrips.push(newRecord);
    setCompletedModalVisible(true);
  };

  // Get current active vehicle marker position
  const activeCarCoords = routeCoords.length > 0 ? routeCoords[progressIndex] : { latitude: pickupLat, longitude: pickupLng };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header Info Panel */}
      <View style={[styles.headerPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} disabled={status === 'started'}>
            <MaterialIcons name="arrow-back" size={scale(20)} color={status === 'started' ? colors.textMuted : colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {status === 'searching' && 'Locating Services...'}
            {status === 'matched' && 'Match Confirmed'}
            {status === 'started' && 'Ride in Progress'}
            {status === 'completed' && 'Trip Completed'}
          </Text>
          <View style={{ width: scale(20) }} />
        </View>

        <View style={styles.itineraryLine}>
          <MaterialIcons name="trip-origin" size={scale(12)} color={colors.amber} />
          <Text style={[styles.itineraryText, { color: colors.textPrimary }]} numberOfLines={1}>
            {pickupName} ➔ {dropName}
          </Text>
          <MaterialIcons name="location-on" size={scale(12)} color="#ef4444" />
        </View>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' || !MapView ? (
          // Web Fallback HUD
          <View style={styles.webHud}>
            <View style={styles.gridsDesign} />

            <View style={styles.hudOverlay}>
              <Text style={styles.hudMetaText}>SIMULATOR HUD ACTIVE ({status.toUpperCase()})</Text>
              <Text style={[styles.hudPoint, { color: colors.textPrimary }]}>Pickup: {pickupName}</Text>
              {parsedStops.map((s, idx) => (
                <Text key={idx} style={[styles.hudPoint, { color: colors.textPrimary }]}>Stop {idx + 1}: {s.name}</Text>
              ))}
              <Text style={[styles.hudPoint, { color: colors.textPrimary }]}>Drop: {dropName}</Text>
            </View>

            {/* Simulating vehicle traveling legs index */}
            <View style={styles.progressBarWrapper}>
              <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: colors.amber,
                      width: status === 'started' ? `${(progressIndex / (routeCoords.length - 1)) * 100}%` : status === 'completed' ? '100%' : '0%'
                    }
                  ]}
                />
              </View>
              <Text style={[styles.progressLabelText, { color: colors.textPrimary }]}>
                {status === 'started' && `Driving... Leg ${Math.min(Math.floor(progressIndex / 10) + 1, parsedStops.length + 1)}`}
                {status === 'completed' && 'Arrived at Destination'}
                {status === 'searching' && 'Scanning area nodes...'}
                {status === 'matched' && 'Waiting to start...'}
              </Text>
            </View>
          </View>
        ) : (
          // Mobile Native Maps View
          <MapView
            provider="google"
            style={StyleSheet.absoluteFillObject}
            region={{
              latitude: (pickupLat + dropLat) / 2,
              longitude: (pickupLng + dropLng) / 2,
              latitudeDelta: Math.abs(pickupLat - dropLat) * 1.8 || 0.05,
              longitudeDelta: Math.abs(pickupLng - dropLng) * 1.8 || 0.05,
            }}
          >
            {/* Draw Path Polyline */}
            {routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor={colors.amber}
                strokeWidth={scale(4)}
              />
            )}

            {/* Pickup Marker */}
            <Marker coordinate={{ latitude: pickupLat, longitude: pickupLng }} title="Pickup (Start)">
              <View style={[styles.markerRound, { backgroundColor: colors.amber }]}>
                <Text style={styles.markerLetter}>P</Text>
              </View>
            </Marker>

            {/* Intermediate Stops Markers */}
            {parsedStops.map((stop, idx) => (
              <Marker key={idx} coordinate={{ latitude: stop.latitude, longitude: stop.longitude }} title={`Stop ${idx + 1}: ${stop.name}`}>
                <View style={[styles.markerRound, { backgroundColor: '#F5C518' }]}>
                  <Text style={styles.markerLetter}>{idx + 1}</Text>
                </View>
              </Marker>
            ))}

            {/* Drop Marker */}
            <Marker coordinate={{ latitude: dropLat, longitude: dropLng }} title="Drop (End)">
              <View style={[styles.markerRound, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.markerLetter}>D</Text>
              </View>
            </Marker>

            {/* Searching Phase: Wiggling Cars */}
            {status === 'searching' &&
              wiggleCars.map((coords, idx) => (
                <Marker key={idx} coordinate={coords} opacity={0.6}>
                  <View style={styles.carMarker}>
                    <FontAwesome5 name={tripType === 'guide' ? 'compass' : (vehicle === 'auto' ? 'electric-rickshaw' : 'car')} size={scale(16)} color={colors.amber} />
                  </View>
                </Marker>
              ))}

            {/* Match Confirmed & In Progress: Active Moving Vehicle Marker */}
            {(status === 'matched' || status === 'started' || status === 'completed') && (
              <Marker coordinate={activeCarCoords} title={demoDriver.name}>
                <View style={[styles.activeVehicleMarker, { borderColor: colors.amber }]}>
                  <FontAwesome5 name={tripType === 'guide' ? 'user-ninja' : (vehicle === 'auto' ? 'motorcycle' : 'taxi')} size={scale(18)} color="#101010" />
                </View>
              </Marker>
            )}
          </MapView>
        )}
      </View>

      {/* Floating Status / Bottom Card Controls Drawer */}
      <View style={[styles.bottomCard, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>

        {/* Searching Status Panel */}
        {status === 'searching' && (
          <View style={styles.searchingCol}>
            {isDriverDeclined ? (
              <View style={{ alignItems: 'center', width: '100%' }}>
                <MaterialIcons name="cancel" size={scale(38)} color="#EF4444" style={{ marginBottom: verticalScale(6) }} />
                <Text style={[styles.searchingTitleText, { color: '#EF4444', textAlign: 'center' }]}>
                  {liveDriverInfo?.name ? `${liveDriverInfo.name} Declined Request ❌` : 'Request Declined by Driver ❌'}
                </Text>
                <Text style={[styles.searchingSubText, { color: colors.textMuted, textAlign: 'center', marginBottom: verticalScale(14) }]}>
                  {liveDriverInfo?.name ? `${liveDriverInfo.name} declined your trip request.` : 'The driver declined your trip request.'} You can select another driver on the spot or broadcast your request to all.
                </Text>

                <View style={{ flexDirection: 'row', gap: scale(8), width: '100%' }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: colors.amber, paddingVertical: verticalScale(12), borderRadius: scale(10), alignItems: 'center' }}
                    onPress={() => {
                      if (tripType === 'custom_trip') {
                        router.replace('/make-trip');
                      } else if (tripType === 'cab') {
                        router.replace('/book-cab');
                      } else {
                        try {
                          router.replace('/plan-route');
                        } catch (e) {
                          router.back();
                        }
                      }
                    }}
                  >
                    <Text style={{ color: '#101010', fontWeight: '800', fontSize: moderateFontScale(12) }}>Choose Other Driver 🚕</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: colors.surfaceCard, paddingVertical: verticalScale(12), borderRadius: scale(10), alignItems: 'center', borderWidth: 1, borderColor: colors.amber }}
                    onPress={handleBroadcastToAll}
                  >
                    <Text style={{ color: colors.amber, fontWeight: '800', fontSize: moderateFontScale(12) }}>Broadcast to All 📡</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : isDriverTimeout ? (
              <View style={{ alignItems: 'center', width: '100%' }}>
                <MaterialIcons name="person-off" size={scale(36)} color={colors.amber} style={{ marginBottom: verticalScale(6) }} />
                <Text style={[styles.searchingTitleText, { color: colors.textPrimary, textAlign: 'center' }]}>
                  Driver is busy or not responding
                </Text>
                <Text style={[styles.searchingSubText, { color: colors.textMuted, textAlign: 'center', marginBottom: verticalScale(14) }]}>
                  {liveDriverInfo?.name ? `${liveDriverInfo.name} didn't respond in time.` : 'No driver accepted within the timer window.'} Please choose another driver or broadcast to all.
                </Text>

                <View style={{ flexDirection: 'row', gap: scale(8), width: '100%' }}>
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: colors.amber, paddingVertical: verticalScale(12), borderRadius: scale(10), alignItems: 'center' }}
                    onPress={() => {
                      if (tripType === 'custom_trip') {
                        router.replace('/make-trip');
                      } else if (tripType === 'cab') {
                        router.replace('/book-cab');
                      } else {
                        try {
                          router.replace('/plan-route');
                        } catch (e) {
                          router.back();
                        }
                      }
                    }}
                  >
                    <Text style={{ color: '#101010', fontWeight: '800', fontSize: moderateFontScale(12) }}>Choose Other Driver 🚕</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: colors.surfaceCard, paddingVertical: verticalScale(12), borderRadius: scale(10), alignItems: 'center', borderWidth: 1, borderColor: colors.amber }}
                    onPress={handleBroadcastToAll}
                  >
                    <Text style={{ color: colors.amber, fontWeight: '800', fontSize: moderateFontScale(12) }}>Broadcast to All 📡</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <ActivityIndicator size="large" color={colors.amber} style={{ marginBottom: verticalScale(8) }} />
                <Text style={[styles.searchingTitleText, { color: colors.textPrimary }]}>
                  {liveDriverInfo?.name
                    ? `Waiting for ${liveDriverInfo.name} to accept... (${searchingTimer}s)`
                    : `Searching for Nearby Partners (${searchingTimer}s)`}
                </Text>
                <Text style={[styles.searchingSubText, { color: colors.textMuted }]}>
                  {liveDriverInfo?.name
                    ? `Request sent directly to ${liveDriverInfo.name} (${liveDriverInfo.vehicleModel || 'Captain'}).`
                    : (tripType === 'guide' ? 'Contacting certified local guides...' : 'Reaching out to vehicle captains...')}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Matched Confirmation Card */}
        {status === 'matched' && (
          <View>
            <View style={styles.successHeadingRow}>
              <MaterialIcons name="check-circle" size={scale(18)} color={colors.success} style={{ marginRight: scale(4) }} />
              <Text style={[styles.successConfirmTitle, { color: colors.success }]}>PARTNER ASSIGNED & CONNECTED</Text>
            </View>

            {/* Driver/Guide card */}
            <View style={[styles.partnerCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <View style={styles.partnerMain}>
                <View style={[styles.avatarRound, { backgroundColor: colors.amber }]}>
                  <Text style={styles.avatarInitials}>{(demoDriver.name || 'Captain').split(' ').map((n: string) => n[0]).join('')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pName, { color: colors.textPrimary }]}>{demoDriver.name}</Text>
                  <Text style={[styles.pSub, { color: colors.textMuted }]}>{demoDriver.vehicleName}</Text>
                  <Text style={[styles.pNumberPlate, { color: colors.amber }]}>{demoDriver.vehicleNumber}</Text>
                </View>
              </View>

              <View style={[styles.otpLine, { borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={styles.otpBox}>
                  <Text style={styles.otpLabel}>START OTP</Text>
                  <Text style={[styles.otpCode, { color: colors.amber }]}>{(params.otp as string) || demoDriver.otp || '8240'}</Text>
                </View>

                <View style={styles.otpBox}>
                  <Text style={styles.otpLabel}>END OTP</Text>
                  <Text style={[styles.otpCode, { color: '#10B981' }]}>{(params.endOtp as string) || '4321'}</Text>
                </View>

                <View style={styles.fareSummary}>
                  <Text style={[styles.fareLabel, { color: colors.textMuted }]}>TOTAL FARE</Text>
                  <Text style={[styles.fareAmount, { color: colors.amber }]}>₹{price}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Started Simulation Card */}
        {status === 'started' && (
          <View>
            <View style={styles.successHeadingRow}>
              <ActivityIndicator size="small" color={colors.amber} style={{ marginRight: scale(6) }} />
              <Text style={[styles.successConfirmTitle, { color: colors.textPrimary }]}>EN ROUTE / RIDE ACTIVE</Text>
            </View>

            <Text style={[styles.progressDescText, { color: colors.textMuted }]}>
              Demo captain is driving along your connected route. Sit back and watch the live location update.
            </Text>

            {/* Active Driver Profile */}
            <View style={[styles.partnerCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <View style={styles.partnerMain}>
                <View style={[styles.avatarRound, { backgroundColor: colors.amber }]}>
                  <Text style={styles.avatarInitials}>{(demoDriver.name || 'Captain').split(' ').map((n: string) => n[0]).join('')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pName, { color: colors.textPrimary }]}>{demoDriver.name}</Text>
                  <Text style={[styles.pSub, { color: colors.textMuted }]}>{demoDriver.vehicleNumber} · Verified Partner</Text>
                </View>
                <View style={styles.actionPills}>
                  <TouchableOpacity style={[styles.pillIcon, { backgroundColor: colors.border }]}>
                    <MaterialIcons name="call" size={scale(15)} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.pillIcon, { backgroundColor: colors.border }]}>
                    <MaterialIcons name="message" size={scale(15)} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Force End Booking early option */}
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: colors.amber }]}
              onPress={() => setStatus('completed')}
            >
              <Text style={styles.actionBtnText}>Skip and Complete Ride</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Completed Simulation Card */}
        {status === 'completed' && (
          <View>
            <View style={styles.successHeadingRow}>
              <MaterialIcons name="check-circle" size={scale(18)} color={colors.success} style={{ marginRight: scale(4) }} />
              <Text style={[styles.successConfirmTitle, { color: colors.success }]}>ARRIVED AT DESTINATION</Text>
            </View>

            <Text style={[styles.progressDescText, { color: colors.textPrimary }]}>
              You have safely completed your custom route checkpoints. Click below to confirm completion.
            </Text>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: colors.amber }]}
              onPress={handleCompleteTripSim}
            >
              <Text style={styles.actionBtnText}>Finish & Pay ₹{price}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Custom Celebration "Trip Completed!" Modal */}
      <Modal visible={completedModalVisible} transparent={true} animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: scale(18) }}>
          <View style={{ backgroundColor: isDark ? '#1C1C22' : '#FFFFFF', width: '90%', borderRadius: scale(24), padding: scale(22), alignItems: 'center', borderWidth: 1.5, borderColor: '#F5C518' }}>
            <View style={{ width: scale(64), height: scale(64), borderRadius: scale(32), backgroundColor: '#F5C518', alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(14), elevation: 6 }}>
              <MaterialIcons name="check-circle" size={scale(38)} color="#101010" />
            </View>

              <Text style={{ color: '#F5C518', fontSize: moderateFontScale(18), fontWeight: '900', marginBottom: verticalScale(4), textAlign: 'center' }}>
                🎉 Trip Completed!
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), textAlign: 'center', marginBottom: verticalScale(16) }}>
                Thank you for riding with VIBE! Your trip details have been saved to your Trips History.
              </Text>

              <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F5F5F7', borderRadius: scale(14), padding: scale(14), borderWidth: 1, borderColor: colors.border, marginBottom: verticalScale(18) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(8) }}>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), fontWeight: '600' }}>AMOUNT PAID</Text>
                  <Text style={{ color: '#F5C518', fontSize: moderateFontScale(18), fontWeight: '900' }}>
                    ₹{price}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: verticalScale(6) }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: verticalScale(4) }}>
                  <MaterialIcons name="navigation" size={scale(16)} color="#F5C518" />
                  <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {pickupName} ➔ {dropName}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: verticalScale(8) }}>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>Payment Mode:</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(11), fontWeight: '700' }}>
                    {paymentMode}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={{ width: '100%', height: verticalScale(46), borderRadius: scale(14), backgroundColor: '#F5C518', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => {
                  setCompletedModalVisible(false);
                  router.navigate('/(tabs)/trips');
                }}
              >
                <Text style={{ color: '#101010', fontWeight: '900', fontSize: moderateFontScale(13) }}>
                  View Trips History
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerPanel: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1.2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: verticalScale(34),
  },
  backBtn: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itineraryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(6),
    gap: scale(4),
    paddingHorizontal: scale(4),
  },
  itineraryText: {
    fontSize: moderateFontScale(11.5),
    fontWeight: '600',
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  webHud: {
    flex: 1,
    backgroundColor: '#101014',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  gridsDesign: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    backgroundColor: 'transparent',
    opacity: 0.25,
  },
  hudOverlay: {
    width: '100%',
    backgroundColor: 'rgba(16,16,20,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.15)',
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: verticalScale(20),
  },
  hudMetaText: {
    color: '#F5C518',
    fontSize: moderateFontScale(9),
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: verticalScale(6),
  },
  hudPoint: {
    fontSize: moderateFontScale(11),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  progressBarWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: verticalScale(6),
    borderRadius: scale(3),
    overflow: 'hidden',
    marginBottom: verticalScale(8),
  },
  progressBarFill: {
    height: '100%',
  },
  progressLabelText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
  markerRound: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  markerLetter: {
    color: '#ffffff',
    fontSize: moderateFontScale(10),
    fontWeight: '900',
  },
  carMarker: {
    backgroundColor: '#ffffff',
    borderRadius: scale(12),
    padding: scale(4),
    borderWidth: 1,
    borderColor: '#F5C518',
  },
  activeVehicleMarker: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  bottomCard: {
    borderTopWidth: 1.2,
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(20),
    borderTopLeftRadius: scale(22),
    borderTopRightRadius: scale(22),
    minHeight: verticalScale(140),
  },
  searchingCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(10),
  },
  searchingTitleText: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
    marginTop: verticalScale(12),
  },
  searchingSubText: {
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(4),
    textAlign: 'center',
  },
  successHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  successConfirmTitle: {
    fontSize: moderateFontScale(11),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  partnerCard: {
    borderWidth: 1.2,
    borderRadius: scale(16),
    padding: scale(12),
    marginBottom: verticalScale(14),
  },
  partnerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  avatarRound: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#101010',
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  pName: {
    fontSize: moderateFontScale(13.5),
    fontWeight: '800',
  },
  pSub: {
    fontSize: moderateFontScale(10),
    marginTop: verticalScale(1),
  },
  pNumberPlate: {
    fontSize: moderateFontScale(11),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  otpLine: {
    borderTopWidth: 1,
    marginTop: verticalScale(10),
    paddingTop: verticalScale(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otpBox: {
    flex: 1,
  },
  otpLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: moderateFontScale(8),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  otpCode: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  fareSummary: {
    alignItems: 'flex-end',
  },
  fareLabel: {
    fontSize: moderateFontScale(8),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fareAmount: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  primaryActionBtn: {
    height: verticalScale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#101010',
    fontSize: moderateFontScale(12.5),
    fontWeight: '800',
  },
  progressDescText: {
    fontSize: moderateFontScale(11.5),
    lineHeight: verticalScale(15),
    marginBottom: verticalScale(12),
  },
  actionPills: {
    flexDirection: 'row',
    gap: scale(6),
  },
  pillIcon: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
