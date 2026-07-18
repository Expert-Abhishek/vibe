import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adminState, TripRecord } from './admin-state';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
  } catch (e) {
    console.warn('react-native-maps could not be loaded dynamically in ride-matching:', e);
  }
}

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

  // Demo driver information
  const demoDriver = {
    name: tripType === 'guide' ? 'Ramesh Gowda' : (vehicle === 'auto' ? 'Raju Auto' : 'Suresh Kumar'),
    rating: '4.8 ★',
    phone: '+91 98765 43210',
    vehicleName: tripType === 'guide' ? 'Government Certified Guide' : (vehicle === 'auto' ? 'Bajaj RE Auto' : 'Maruti Swift Premium'),
    vehicleNumber: tripType === 'guide' ? 'GUIDE-ID-8240' : (vehicle === 'auto' ? 'KA-02-AU-9912' : 'KA-03-MY-7788'),
    otp: '4892',
  };

  // Generate route coordinates list connecting pickup -> stops -> drop
  const [routeCoords, setRouteCoords] = useState<Coordinate[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(true);

  // Wiggling cars coords for searching phase
  const [wiggleCars, setWiggleCars] = useState<Coordinate[]>([]);

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

  // Transition searching -> matched after 3.5 seconds automatically
  useEffect(() => {
    if (status === 'searching') {
      const timer = setTimeout(() => {
        setStatus('matched');
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [status]);

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
      rating: 5.0,
      passengerCount: passengerCount,
    };

    // Append to global state
    adminState.userTrips.push(newRecord);
    Alert.alert('Trip Completed!', 'Thank you for riding with Vibe. Your trip details have been saved to your Trips History.', [
      { text: 'Okay', onPress: () => router.replace('/(tabs)/trips') }
    ]);
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
                <Text key={idx} style={[styles.hudPoint, { color: colors.textPrimary }]}>Stop {idx+1}: {s.name}</Text>
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
              <Marker key={idx} coordinate={{ latitude: stop.latitude, longitude: stop.longitude }} title={`Stop ${idx+1}: ${stop.name}`}>
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
            <ActivityIndicator size="large" color={colors.amber} />
            <Text style={[styles.searchingTitleText, { color: colors.textPrimary }]}>Searching for Nearby Partners</Text>
            <Text style={[styles.searchingSubText, { color: colors.textMuted }]}>
              {tripType === 'guide' ? 'Contacting certified local guides...' : 'Reaching out to vehicle captains...'}
            </Text>
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
                  <Text style={styles.avatarInitials}>{demoDriver.name.split(' ').map(n=>n[0]).join('')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pName, { color: colors.textPrimary }]}>{demoDriver.name}</Text>
                  <Text style={[styles.pSub, { color: colors.textMuted }]}>{demoDriver.vehicleName}</Text>
                  <Text style={[styles.pNumberPlate, { color: colors.amber }]}>{demoDriver.vehicleNumber}</Text>
                </View>
              </View>

              <View style={[styles.otpLine, { borderTopColor: colors.border }]}>
                <View style={styles.otpBox}>
                  <Text style={styles.otpLabel}>SHARE OTP TO START RIDE</Text>
                  <Text style={[styles.otpCode, { color: colors.textPrimary }]}>{demoDriver.otp}</Text>
                </View>
                <View style={styles.fareSummary}>
                  <Text style={[styles.fareLabel, { color: colors.textMuted }]}>EST. CHARGE</Text>
                  <Text style={[styles.fareAmount, { color: colors.amber }]}>₹{price}</Text>
                </View>
              </View>
            </View>

            {/* Start button */}
            <TouchableOpacity 
              style={[styles.primaryActionBtn, { backgroundColor: colors.amber }]}
              onPress={() => setStatus('started')}
            >
              <Text style={styles.actionBtnText}>Start Ride (OTP: {demoDriver.otp})</Text>
            </TouchableOpacity>
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
                  <Text style={styles.avatarInitials}>{demoDriver.name.split(' ').map(n=>n[0]).join('')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pName, { color: colors.textPrimary }]}>{demoDriver.name}</Text>
                  <Text style={[styles.pSub, { color: colors.textMuted }]}>{demoDriver.vehicleNumber} · {demoDriver.rating}</Text>
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
