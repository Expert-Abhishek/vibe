import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adminState } from './admin-state';

// Dynamically require react-native-maps to prevent compilation or runtime crashes on Web
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
    console.warn('react-native-maps could not be loaded dynamically:', e);
  }
}

const GOOGLE_MAPS_KEY = 'AIzaSyBDo89INLAVgmvmjCJHR9ZP66gNeE5uy7o';

interface Checkpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

// Preset popular destinations in Karnataka for quick selection/offline fallback
const presetDestinations: Checkpoint[] = [
  { id: 'p1', name: 'Bengaluru Palace', latitude: 12.9982, longitude: 77.5920, address: 'Bengaluru, Karnataka' },
  { id: 'p2', name: 'Mysuru Palace', latitude: 12.3053, longitude: 76.6552, address: 'Mysuru, Karnataka' },
  { id: 'p3', name: 'Hampi Virupaksha', latitude: 15.3350, longitude: 76.4600, address: 'Hampi, Bellary, Karnataka' },
  { id: 'p4', name: 'Abbey Falls Coorg', latitude: 12.4385, longitude: 75.7214, address: 'Madikeri, Coorg, Karnataka' },
  { id: 'p5', name: 'Gokarna Om Beach', latitude: 14.5262, longitude: 74.3168, address: 'Gokarna, Uttara Kannada, Karnataka' },
  { id: 'p6', name: 'Bandipur Tiger Safari', latitude: 11.6667, longitude: 76.6333, address: 'Bandipur National Park, Chamarajanagar' },
  { id: 'p7', name: 'Jog Falls', latitude: 14.2272, longitude: 74.8114, address: 'Sagara, Shivamogga, Karnataka' },
  { id: 'p8', name: 'Chikmagalur Peak', latitude: 13.4216, longitude: 75.7645, address: 'Mullayanagiri, Chikmagalur, Karnataka' },
];

export default function MakeTripScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const selectedRide = searchParams.selectedRide as string || '';

  const getRideLabel = (key: string) => {
    if (key === '5seater') return '5 Seater Premium';
    if (key === '7seater') return '7 Seater Spacious';
    if (key === '4x4jeep') return '4*4 Jeep Offroader';
    if (key === 'auto') return 'Eco Auto';
    return '';
  };
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([
    { id: 'start', name: 'Bengaluru (Start)', latitude: 12.9716, longitude: 77.5946, address: 'Bengaluru City Center' },
    { id: 'stop-1', name: 'Mysuru Palace', latitude: 12.3053, longitude: 76.6552, address: 'Mysuru, Karnataka' },
  ]);

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distance, setDistance] = useState<string>('0 km');
  const [duration, setDuration] = useState<string>('0 mins');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const [quoteStatus, setQuoteStatus] = useState<'none' | 'pending' | 'quoted'>('none');
  const [quotedPrice, setQuotedPrice] = useState<number>(0);
  const [tripRequestId, setTripRequestId] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState(1800);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  // Google Places Autocomplete API Search
  useEffect(() => {
    if (searchText.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchGooglePlaces(searchText);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  const searchGooglePlaces = async (query: string) => {
    setLoadingSearch(true);
    try {
      const queryLower = query.toLowerCase();
      const localMatches = presetDestinations
        .filter(p => p.name.toLowerCase().includes(queryLower) || (p.address || '').toLowerCase().includes(queryLower))
        .map(p => ({
          place_id: `local_${p.id}`,
          description: `${p.name}, ${p.address || ''}`,
          isLocal: true,
          presetData: p,
        }));

      // Focus location biased on Karnataka (Bangalore coordinates)
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${GOOGLE_MAPS_KEY}&location=12.9716,77.5946&radius=300000`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      let googleSuggestions = [];
      if (data.predictions) {
        googleSuggestions = data.predictions;
      }
      setSuggestions([...localMatches, ...googleSuggestions]);
    } catch (e) {
      console.warn('Error fetching autocomplete suggestions, using local backup:', e);
      const queryLower = query.toLowerCase();
      const localMatches = presetDestinations
        .filter(p => p.name.toLowerCase().includes(queryLower) || (p.address || '').toLowerCase().includes(queryLower))
        .map(p => ({
          place_id: `local_${p.id}`,
          description: `${p.name}, ${p.address || ''}`,
          isLocal: true,
          presetData: p,
        }));
      setSuggestions(localMatches);
    } finally {
      setLoadingSearch(false);
    }
  };

  const triggerSearchAndAddFirst = async (query: string) => {
    setLoadingSearch(true);
    try {
      const queryLower = query.toLowerCase();
      const localMatch = presetDestinations.find(
        p => p.name.toLowerCase().includes(queryLower) || (p.address || '').toLowerCase().includes(queryLower)
      );

      if (localMatch) {
        handleSelectPreset(localMatch);
        setLoadingSearch(false);
        return;
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${GOOGLE_MAPS_KEY}&location=12.9716,77.5946&radius=300000`;
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.predictions && data.predictions.length > 0) {
        const first = data.predictions[0];
        handleSelectSuggestion(first.place_id, first.description);
      } else {
        Alert.alert('No Results', `Could not find any location matching "${query}".`);
      }
    } catch (e) {
      console.error('Error in search and add first:', e);
      const queryLower = query.toLowerCase();
      const localMatch = presetDestinations.find(
        p => p.name.toLowerCase().includes(queryLower) || (p.address || '').toLowerCase().includes(queryLower)
      );

      if (localMatch) {
        handleSelectPreset(localMatch);
      } else {
        Alert.alert('No Results', `Could not find any location matching "${query}".`);
      }
    } finally {
      setLoadingSearch(false);
    }
  };

  // Select place from Google Suggestions & fetch Lat/Lng
  const handleSelectSuggestion = async (placeId: string, description: string) => {
    setSearchText('');
    setSuggestions([]);
    setLoadingRoute(true);

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.result && data.result.geometry) {
        const { lat, lng } = data.result.geometry.location;
        const newPoint: Checkpoint = {
          id: Math.random().toString(),
          name: data.result.name || description.split(',')[0],
          latitude: lat,
          longitude: lng,
          address: description,
        };
        setCheckpoints(prev => [...prev, newPoint]);
      }
    } catch (e) {
      console.error('Error fetching place details:', e);
      Alert.alert('Search Error', 'Failed to fetch details for this location.');
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleSelectPreset = (preset: Checkpoint) => {
    // Prevent duplicate entries of the same preset
    if (checkpoints.find(c => c.name === preset.name)) {
      Alert.alert('Checkpoint Exists', `${preset.name} is already in your itinerary.`);
      return;
    }
    const newPoint: Checkpoint = {
      ...preset,
      id: Math.random().toString(),
    };
    setCheckpoints(prev => [...prev, newPoint]);
  };

  // Checkpoint Reordering and Deleting
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const nextList = [...checkpoints];
    const temp = nextList[index];
    nextList[index] = nextList[index - 1];
    nextList[index - 1] = temp;
    setCheckpoints(nextList);
  };

  const handleMoveDown = (index: number) => {
    if (index === checkpoints.length - 1) return;
    const nextList = [...checkpoints];
    const temp = nextList[index];
    nextList[index] = nextList[index + 1];
    nextList[index + 1] = temp;
    setCheckpoints(nextList);
  };

  const handleDelete = (id: string) => {
    if (checkpoints.length <= 2) {
      Alert.alert('Failed', 'A planned trip must have at least 2 checkpoints (Start and End).');
      return;
    }
    setCheckpoints(prev => prev.filter(c => c.id !== id));
  };

  // Decode Polyline from Google Directions
  const decodePolyline = (encoded: string) => {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  // Fetch Google Directions
  useEffect(() => {
    if (checkpoints.length < 2) return;

    // Haversine fallback to calculate straight lines and estimate road distance
    const calculateHaversineFallback = () => {
      let totalMeters = 0;
      const straightPoints = checkpoints.map(c => ({ latitude: c.latitude, longitude: c.longitude }));
      setRouteCoords(straightPoints);

      for (let i = 0; i < checkpoints.length - 1; i++) {
        const p1 = checkpoints[i];
        const p2 = checkpoints[i + 1];
        const R = 6371e3; // Earth radius in meters
        const φ1 = (p1.latitude * Math.PI) / 180;
        const φ2 = (p2.latitude * Math.PI) / 180;
        const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
        const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalMeters += R * c;
      }

      // Multiply straight-line distance by ~1.28 to estimate winding roads
      const estRoadDistanceKm = (totalMeters * 1.28) / 1000;
      // Assume average road speed of 50 km/h
      const estDurationMinutes = (estRoadDistanceKm / 50) * 60;

      setDistance(`${estRoadDistanceKm.toFixed(1)} km (est.)`);
      
      const h = Math.floor(estDurationMinutes / 60);
      const m = Math.floor(estDurationMinutes % 60);
      setDuration(`${h > 0 ? `${h}h ` : ''}${m}m (est.)`);
    };

    const fetchRoute = async () => {
      setLoadingRoute(true);
      try {
        const origin = `${checkpoints[0].latitude},${checkpoints[0].longitude}`;
        const destination = `${checkpoints[checkpoints.length - 1].latitude},${checkpoints[checkpoints.length - 1].longitude}`;
        
        let waypoints = '';
        if (checkpoints.length > 2) {
          const middlePoints = checkpoints.slice(1, -1);
          waypoints = `&waypoints=optimize:false|${middlePoints.map(c => `${c.latitude},${c.longitude}`).join('|')}`;
        }

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypoints}&key=${GOOGLE_MAPS_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.routes && data.routes[0]) {
          const route = data.routes[0];
          // Set Decoded Polyline
          if (route.overview_polyline && route.overview_polyline.points) {
            const decoded = decodePolyline(route.overview_polyline.points);
            setRouteCoords(decoded);
          }

          // Calculate total distance & duration
          let metersSum = 0;
          let secondsSum = 0;
          route.legs.forEach((leg: any) => {
            metersSum += leg.distance.value;
            secondsSum += leg.duration.value;
          });

          setDistance(`${(metersSum / 1000).toFixed(1)} km`);
          const h = Math.floor(secondsSum / 3600);
          const m = Math.floor((secondsSum % 3600) / 60);
          setDuration(`${h > 0 ? `${h}h ` : ''}${m}m`);
        } else {
          // If directions fail, fall back to straight line paths
          console.warn('Google Directions failed with status:', data.status);
          calculateHaversineFallback();
        }
      } catch (e) {
        console.error('Directions API error:', e);
        calculateHaversineFallback();
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [checkpoints]);

  // Quote polling effect
  useEffect(() => {
    let interval: any;
    if (quoteStatus === 'pending' && tripRequestId) {
      interval = setInterval(() => {
        const req = adminState.customTripRequests.find(r => r.id === tripRequestId);
        if (req && req.status === 'Quoted' && req.quotedPrice) {
          setQuotedPrice(req.quotedPrice);
          setQuoteStatus('quoted');
          Alert.alert('Quote Received!', `Admin has manually quoted ₹${req.quotedPrice} for this custom route.`);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [quoteStatus, tripRequestId]);

  // Countdown timer effect
  useEffect(() => {
    let timer: any;
    if (quoteStatus === 'pending' && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quoteStatus, secondsLeft]);

  const handleSimulateQuote = () => {
    adminState.customTripRequests.forEach(r => {
      if (r.id === tripRequestId) {
        r.status = 'Quoted';
        r.quotedPrice = 2750;
      }
    });
    setQuotedPrice(2750);
    setQuoteStatus('quoted');
    Alert.alert('Simulation Success', 'Manual price quote of ₹2,750 applied successfully.');
  };

  const handleConfirmTrip = () => {
    if (checkpoints.length < 2) {
      Alert.alert('Error', 'Please add at least 2 checkpoints to plan a trip.');
      return;
    }

    const requestId = `req_${Date.now()}`;
    const newReq = {
      id: requestId,
      checkpoints: checkpoints.map(c => ({ name: c.name, latitude: c.latitude, longitude: c.longitude })),
      status: 'Pending' as const,
      vehicle: selectedRide || '5seater',
      touristName: 'Abhishek (Tourist)',
    };

    adminState.customTripRequests.push(newReq);
    setTripRequestId(requestId);
    setQuoteStatus('pending');
    Alert.alert(
      'Route Request Sent!',
      'Your custom route has been submitted to the Admin. Please wait up to 30 minutes for a manual price quotation.',
      [{ text: 'OK' }]
    );
  };

  const handleBookCustomRide = () => {
    const pickup = checkpoints[0];
    const drop = checkpoints[checkpoints.length - 1];
    const stops = checkpoints.slice(1, -1);

    adminState.customTripRequests.forEach(r => {
      if (r.id === tripRequestId) r.status = 'Booked';
    });

    router.replace({
      pathname: '/ride-matching' as any,
      params: {
        pickupName: pickup.name,
        pickupLat: pickup.latitude.toString(),
        pickupLng: pickup.longitude.toString(),
        dropName: drop.name,
        dropLat: drop.latitude.toString(),
        dropLng: drop.longitude.toString(),
        stops: JSON.stringify(stops.map(s => ({ name: s.name, latitude: s.latitude, longitude: s.longitude }))),
        price: quotedPrice.toString(),
        type: 'custom_trip',
        vehicle: selectedRide || '5seater',
        paymentMode: 'UPI',
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Custom Trip Builder</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Selected Vehicle Indicator */}
        {selectedRide !== '' && (
          <View style={[styles.selectedRideBadge, { backgroundColor: 'rgba(245,197,24,0.08)', borderColor: colors.border }]}>
            <MaterialIcons name="local-taxi" size={scale(16)} color={colors.amber} style={{ marginRight: scale(6) }} />
            <Text style={[styles.selectedRideText, { color: colors.textPrimary }]}>
              Selected Vehicle: <Text style={{ color: colors.amber, fontWeight: '800' }}>{getRideLabel(selectedRide)}</Text>
            </Text>
          </View>
        )}

        {/* Map Container */}
        <View style={[styles.mapContainer, { borderColor: colors.border }]}>
          {Platform.OS === 'web' || !MapView ? (
            // Premium Web / Fallback visual map panel
            <View style={styles.webMapPlaceholder}>
              <View style={styles.mapGridLines} />
              
              {/* Draw connected checkpoints in a visual panel */}
              <View style={styles.hudTelemetry}>
                <Text style={styles.hudTitle}>GPS LINK ACTIVE</Text>
                <View style={styles.telemetryRow}>
                  <Text style={styles.telemetryLabel}>Stops:</Text>
                  <Text style={styles.telemetryVal}>{checkpoints.length}</Text>
                </View>
                <View style={styles.telemetryRow}>
                  <Text style={styles.telemetryLabel}>Dist:</Text>
                  <Text style={styles.telemetryVal}>{distance}</Text>
                </View>
                <View style={styles.telemetryRow}>
                  <Text style={styles.telemetryLabel}>Time:</Text>
                  <Text style={styles.telemetryVal}>{duration}</Text>
                </View>
              </View>

              {/* Central Map Canvas Nodes */}
              <View style={styles.nodesCanvas}>
                {checkpoints.map((c, i) => (
                  <View 
                    key={c.id} 
                    style={[
                      styles.canvasNodeCircle, 
                      { 
                        backgroundColor: i === 0 ? colors.amber : i === checkpoints.length - 1 ? '#E63946' : '#2a2a35',
                        left: scale(40 + (i * 25) % 180),
                        top: verticalScale(30 + (i * 45) % 110),
                      }
                    ]}
                  >
                    <Text style={styles.canvasNodeText}>{String.fromCharCode(65 + i)}</Text>
                    <Text style={styles.canvasNodeLabel} numberOfLines={1}>{c.name}</Text>
                  </View>
                ))}
              </View>
              
              <Text style={styles.webFallbackFootnote}>
                Interactive Map renders on Android & iOS device screens
              </Text>
            </View>
          ) : (
            // Native Map View
            <MapView
              provider="google"
              style={StyleSheet.absoluteFillObject}
              customMapStyle={isDark ? darkMapStyle : []}
              initialRegion={{
                latitude: 12.9716,
                longitude: 77.5946,
                latitudeDelta: 1.5,
                longitudeDelta: 1.5,
              }}
            >
              {/* Checkpoint Markers */}
              {checkpoints.map((c, index) => {
                let pinColor = '#3b82f6'; // Middle
                if (index === 0) pinColor = colors.amber; // Start
                if (index === checkpoints.length - 1) pinColor = '#ef4444'; // End

                return (
                  <Marker
                    key={c.id}
                    coordinate={{ latitude: c.latitude, longitude: c.longitude }}
                    title={c.name}
                    description={c.address || `Stop ${String.fromCharCode(65 + index)}`}
                    pinColor={pinColor}
                  />
                );
              })}

              {/* Encoded Path Polyline */}
              {routeCoords.length > 0 && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={colors.amber}
                  strokeWidth={scale(4)}
                  lineDashPattern={Platform.OS === 'android' ? [10, 10] : undefined}
                />
              )}
            </MapView>
          )}
          {loadingRoute && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="large" color={colors.amber} />
              <Text style={styles.loadingRouteText}>Updating Map Route...</Text>
            </View>
          )}
        </View>

        {/* Telemetry Stats Bar */}
        <View style={[styles.statsBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>DISTANCE</Text>
            <Text style={[styles.statValue, { color: colors.amber }]}>{distance}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>EST. TRAVEL</Text>
            <Text style={[styles.statValue, { color: colors.amber }]}>{duration}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>STOPS</Text>
            <Text style={[styles.statValue, { color: colors.amber }]}>{checkpoints.length}</Text>
          </View>
        </View>

        {/* Search Bar / Input for Adding Checkpoint - Full Width */}
        <View style={{ marginBottom: verticalScale(14) }}>
          <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, width: '100%', flex: undefined }]}>
            <MaterialIcons name="add-location" size={scale(20)} color={colors.amber} style={styles.searchIcon} />
            <TextInput
              placeholder="Search & Add checkpoint..."
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={searchText}
              onChangeText={setSearchText}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (suggestions.length > 0) {
                  if (suggestions[0].isLocal) {
                    handleSelectPreset(suggestions[0].presetData);
                  } else {
                    handleSelectSuggestion(suggestions[0].place_id, suggestions[0].description);
                  }
                } else if (searchText.trim().length > 0) {
                  triggerSearchAndAddFirst(searchText);
                }
              }}
            />
            {loadingSearch && <ActivityIndicator size="small" color={colors.amber} style={{ marginRight: scale(8) }} />}
            {searchText !== '' && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <MaterialIcons name="close" size={scale(18)} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Google Places Autocomplete Suggestions */}
        {suggestions.length > 0 && (
          <View style={[styles.suggestionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  if (item.isLocal) {
                    handleSelectPreset(item.presetData);
                  } else {
                    handleSelectSuggestion(item.place_id, item.description);
                  }
                }}
              >
                <View style={styles.suggestionLeft}>
                  <MaterialIcons name="location-on" size={scale(18)} color={colors.textMuted} style={{ marginRight: scale(10) }} />
                  <Text style={[styles.suggestionText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
                <MaterialIcons name="add" size={scale(20)} color={colors.amber} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Side-by-Side Content Container */}
        <View style={styles.sideBySideRow}>
          {/* Left Column: Route Checklist */}
          <View style={styles.leftColumn}>
            <View style={styles.columnHeader}>
              <MaterialIcons name="playlist-add-check" size={scale(18)} color={colors.amber} style={{ marginRight: scale(4) }} />
              <Text style={[styles.columnTitle, { color: colors.amber }]} numberOfLines={1}>Route Checklist</Text>
            </View>
            <Text style={[styles.columnSub, { color: colors.textMuted }]} numberOfLines={1}>Drag/reorder stops</Text>

            <View style={styles.itineraryWrapper}>
              {checkpoints.map((checkpoint, index) => {
                const isFirst = index === 0;
                const isLast = index === checkpoints.length - 1;
                
                let bulletColor = '#3b82f6';
                if (isFirst) bulletColor = colors.amber;
                if (isLast) bulletColor = '#ef4444';

                return (
                  <View key={checkpoint.id} style={styles.timelineItem}>
                    {/* Timeline connector visual line */}
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineNode, { backgroundColor: bulletColor }]}>
                        <Text style={styles.nodeChar}>{String.fromCharCode(65 + index)}</Text>
                      </View>
                      {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
                    </View>

                    {/* Stop Card */}
                    <View style={[styles.stopCardCompact, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.stopInfo}>
                        <Text style={[styles.stopName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {checkpoint.name}
                        </Text>
                        <Text style={[styles.stopRoleText, { color: isFirst ? colors.amber : isLast ? '#ef4444' : colors.textMuted }]}>
                          {isFirst ? 'Start' : isLast ? 'End' : `Stop ${index}`}
                        </Text>
                      </View>

                      {/* Reorder and Delete controls stacked vertically */}
                      <View style={styles.controlsCol}>
                        <View style={styles.arrowRow}>
                          <TouchableOpacity
                            style={[styles.controlBtnCompact, isFirst && styles.controlBtnDisabled, { borderColor: colors.border }]}
                            onPress={() => handleMoveUp(index)}
                            disabled={isFirst}
                          >
                            <MaterialIcons name="arrow-upward" size={scale(12)} color={isFirst ? colors.border : colors.textPrimary} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.controlBtnCompact, isLast && styles.controlBtnDisabled, { borderColor: colors.border }]}
                            onPress={() => handleMoveDown(index)}
                            disabled={isLast}
                          >
                            <MaterialIcons name="arrow-downward" size={scale(12)} color={isLast ? colors.border : colors.textPrimary} />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={[styles.deleteBtnCompact, checkpoints.length <= 2 && styles.controlBtnDisabled]}
                          onPress={() => handleDelete(checkpoint.id)}
                          disabled={checkpoints.length <= 2}
                        >
                          <MaterialIcons name="delete" size={scale(14)} color={checkpoints.length <= 2 ? colors.border : '#ef4444'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Right Column: Top Places presets */}
          <View style={styles.rightColumn}>
            <View style={styles.columnHeader}>
              <MaterialIcons name="star" size={scale(18)} color={colors.amber} style={{ marginRight: scale(4) }} />
              <Text style={[styles.columnTitle, { color: colors.amber }]} numberOfLines={1}>Top Places</Text>
            </View>
            <Text style={[styles.columnSub, { color: colors.textMuted }]} numberOfLines={1}>Tap stops to add</Text>

            <ScrollView 
              style={styles.presetsVerticalScroll} 
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {presetDestinations.map(p => {
                const isAdded = checkpoints.some(c => c.name === p.name);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.presetCardVertical, 
                      { 
                        borderColor: isAdded ? colors.amber : colors.border, 
                        backgroundColor: isDark ? '#16161B' : '#F5F5F7',
                        opacity: isAdded ? 0.6 : 1
                      }
                    ]}
                    onPress={() => handleSelectPreset(p)}
                    disabled={isAdded}
                  >
                    <View style={styles.presetCardHeaderRow}>
                      <Text style={[styles.presetCardName, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>{p.name}</Text>
                      {isAdded && <MaterialIcons name="check-circle" size={scale(12)} color={colors.amber} />}
                    </View>
                    <Text style={[styles.presetCardDesc, { color: colors.textMuted }]} numberOfLines={1}>{(p.address || '').split(',')[0]}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Action Button States */}
        {quoteStatus === 'none' && (
          <TouchableOpacity
            style={styles.confirmButton}
            activeOpacity={0.8}
            onPress={handleConfirmTrip}
          >
            <Text style={styles.confirmBtnText}>Lock Route & Request Ride</Text>
            <MaterialIcons name="check" size={scale(18)} color="#101010" />
          </TouchableOpacity>
        )}

        {quoteStatus === 'pending' && (
          <View style={[styles.pendingQuoteCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.pendingHeaderRow}>
              <ActivityIndicator color={colors.amber} size="small" style={{ marginRight: scale(8) }} />
              <Text style={[styles.pendingTitle, { color: colors.textPrimary }]}>Awaiting Admin Price Quote</Text>
            </View>
            <Text style={[styles.pendingSub, { color: colors.textMuted }]}>
              Admin is manually calculating the price for this route. Est. Wait: {formatTimer(secondsLeft)} mins
            </Text>

            <TouchableOpacity
              style={[styles.simulateQuoteBtn, { borderColor: colors.amber }]}
              onPress={handleSimulateQuote}
            >
              <Text style={[styles.simulateQuoteBtnText, { color: colors.amber }]}>
                Simulate Admin Response (₹2750)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {quoteStatus === 'quoted' && (
          <View style={[styles.pendingQuoteCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.priceQuotedRow}>
              <View>
                <Text style={[styles.approvedQuoteLabel, { color: colors.textMuted }]}>APPROVED MANUAL FARE</Text>
                <Text style={[styles.approvedPriceVal, { color: colors.amber }]}>₹{quotedPrice}</Text>
              </View>
              <View style={[styles.statusBadgeCompact, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Text style={{ fontSize: moderateFontScale(10), color: '#10B981', fontWeight: '800' }}>Admin Approved</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, { marginTop: verticalScale(12) }]}
              activeOpacity={0.8}
              onPress={handleBookCustomRide}
            >
              <Text style={styles.confirmBtnText}>Confirm & Book Custom Ride</Text>
              <MaterialIcons name="credit-card" size={scale(18)} color="#101010" />
            </TouchableOpacity>
          </View>
        )}

        {/* Extra spacing */}
        <View style={{ height: verticalScale(30) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Dark styled maps theme variables
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#101014' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#101014' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  {featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  {featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181b17' }] },
  {featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  {featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2C2C34' }] },
  {featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1b1b22' }] },
  {featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  {featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#F5C518', opacity: 0.8 }] },
  {featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  {featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  {featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(12),
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: moderateFontScale(18),
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: scale(18),
  },
  mapContainer: {
    height: verticalScale(260),
    width: '100%',
    borderRadius: scale(22),
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    marginTop: verticalScale(6),
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 16, 20, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingRouteText: {
    color: '#ffffff',
    fontSize: moderateFontScale(12),
    fontWeight: '600',
    marginTop: verticalScale(8),
  },
  webMapPlaceholder: {
    flex: 1,
    backgroundColor: '#101014',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mapGridLines: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    backgroundColor: 'transparent',
    opacity: 0.4,
  },
  hudTelemetry: {
    position: 'absolute',
    top: scale(10),
    left: scale(10),
    backgroundColor: 'rgba(16, 16, 20, 0.85)',
    borderRadius: scale(10),
    padding: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.2)',
  },
  hudTitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(8),
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: verticalScale(4),
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: scale(90),
  },
  telemetryLabel: {
    color: '#8D8D97',
    fontSize: moderateFontScale(9),
    fontWeight: '600',
  },
  telemetryVal: {
    color: '#ffffff',
    fontSize: moderateFontScale(9),
    fontWeight: '700',
  },
  nodesCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  canvasNodeCircle: {
    position: 'absolute',
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  canvasNodeText: {
    color: '#ffffff',
    fontSize: moderateFontScale(10),
    fontWeight: '800',
  },
  canvasNodeLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: moderateFontScale(8),
    fontWeight: '600',
    position: 'absolute',
    top: verticalScale(24),
    width: scale(90),
    textAlign: 'center',
    left: scale(-34),
  },
  webFallbackFootnote: {
    position: 'absolute',
    bottom: scale(10),
    color: 'rgba(255,255,255,0.35)',
    fontSize: moderateFontScale(9),
    fontWeight: '600',
    textAlign: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    borderRadius: scale(18),
    borderWidth: 1.2,
    marginVertical: verticalScale(14),
    paddingVertical: verticalScale(10),
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
    marginTop: verticalScale(3),
  },
  statDivider: {
    width: 1.2,
    height: '60%',
    alignSelf: 'center',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(10),
    marginBottom: verticalScale(14),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(25),
    paddingHorizontal: scale(14),
    height: verticalScale(42),
    flex: 1,
  },
  searchIcon: {
    marginRight: scale(6),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateFontScale(13),
    height: '100%',
    padding: 0,
  },
  presetsToggle: {
    height: verticalScale(40),
    borderRadius: scale(20),
    borderWidth: 1.2,
    paddingHorizontal: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsToggleText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
  suggestionBox: {
    borderWidth: 1.2,
    borderRadius: scale(16),
    marginBottom: verticalScale(14),
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(12),
    borderBottomWidth: 1,
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: scale(10),
  },
  suggestionText: {
    fontSize: moderateFontScale(13),
    flex: 1,
  },
  presetContainer: {
    borderWidth: 1.2,
    borderRadius: scale(18),
    padding: scale(12),
    marginBottom: verticalScale(14),
  },
  presetTitle: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    marginBottom: verticalScale(8),
  },
  presetScroll: {
    gap: scale(10),
  },
  presetCard: {
    padding: scale(10),
    borderWidth: 1,
    borderRadius: scale(12),
    width: scale(130),
  },
  presetCardName: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  presetCardDesc: {
    fontSize: moderateFontScale(10),
    marginTop: verticalScale(2),
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: verticalScale(6),
  },
  leftColumn: {
    flex: 1.1,
  },
  rightColumn: {
    flex: 0.9,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(2),
  },
  columnTitle: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
  columnSub: {
    fontSize: moderateFontScale(10),
    marginBottom: verticalScale(10),
  },
  presetsVerticalScroll: {
    maxHeight: verticalScale(380),
  },
  presetCardVertical: {
    padding: scale(8),
    borderWidth: 1,
    borderRadius: scale(10),
    marginBottom: verticalScale(8),
  },
  presetCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itineraryWrapper: {
    paddingLeft: scale(2),
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: verticalScale(10),
  },
  timelineLeft: {
    alignItems: 'center',
    width: scale(22),
    marginRight: scale(6),
  },
  timelineNode: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeChar: {
    color: '#101010',
    fontSize: moderateFontScale(9),
    fontWeight: '800',
  },
  timelineLine: {
    width: scale(1.5),
    flex: 1,
    position: 'absolute',
    top: scale(20),
    bottom: scale(-12),
    zIndex: 1,
  },
  stopCardCompact: {
    flex: 1,
    borderRadius: scale(12),
    borderWidth: 1.1,
    padding: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stopInfo: {
    flex: 1,
    marginRight: scale(6),
  },
  stopName: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  stopRoleText: {
    fontSize: moderateFontScale(9),
    fontWeight: '700',
    marginTop: verticalScale(1),
  },
  controlsCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
  },
  arrowRow: {
    flexDirection: 'row',
    gap: scale(4),
  },
  controlBtnCompact: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(6),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnDisabled: {
    opacity: 0.3,
  },
  deleteBtnCompact: {
    width: scale(22),
    height: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    marginTop: verticalScale(16),
    gap: scale(6),
  },
  confirmBtnText: {
    color: '#101010',
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  selectedRideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(12),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(14),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(6),
  },
  selectedRideText: {
    fontSize: moderateFontScale(13),
    fontWeight: '600',
  },
  pendingQuoteCard: {
    borderWidth: 1.2,
    borderRadius: scale(14),
    padding: scale(14),
    marginTop: verticalScale(16),
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingTitle: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
  pendingSub: {
    fontSize: moderateFontScale(11),
    lineHeight: moderateFontScale(15),
    marginTop: verticalScale(6),
  },
  simulateQuoteBtn: {
    borderWidth: 1.2,
    borderRadius: scale(10),
    paddingVertical: verticalScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(12),
  },
  simulateQuoteBtnText: {
    fontSize: moderateFontScale(11.5),
    fontWeight: '800',
  },
  priceQuotedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  approvedQuoteLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '700',
  },
  approvedPriceVal: {
    fontSize: moderateFontScale(24),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  statusBadgeCompact: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(6),
  },
});
