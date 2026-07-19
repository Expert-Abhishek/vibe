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
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adminState } from './admin-state';

// Dynamically require maps for web safety
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
    console.warn('react-native-maps could not be loaded dynamically in book-cab:', e);
  }
}

const GOOGLE_MAPS_KEY = 'AIzaSyBDo89INLAVgmvmjCJHR9ZP66gNeE5uy7o';

interface LocationNode {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

const presetDestinations = [
  { name: 'Kempegowda International Airport (BLR)', latitude: 13.1986, longitude: 77.7066, address: 'KIAL Road, Devanahalli, Bengaluru' },
  { name: 'Majestic Railway Station', latitude: 12.9784, longitude: 77.5694, address: 'Subhash Nagar, Bengaluru' },
  { name: 'Indiranagar 100 Feet Road', latitude: 12.9629, longitude: 77.6377, address: 'Indiranagar, Bengaluru' },
  { name: 'Bannerghatta National Park', latitude: 12.7854, longitude: 77.5905, address: 'Bannerghatta, Bengaluru' },
  { name: 'Nandi Hills Peak', latitude: 13.3702, longitude: 77.6835, address: 'Chikkaballapur, Karnataka' },
];

export default function BookCabScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [pickup, setPickup] = useState<LocationNode>({
    name: 'Bengaluru Palace (Pickup)',
    latitude: 12.9982,
    longitude: 77.5920,
    address: 'Vasanth Nagar, Bengaluru, Karnataka',
  });

  const [drop, setDrop] = useState<LocationNode | null>(null);
  const [stops, setStops] = useState<LocationNode[]>([]);

  // Search autocomplete overlay states
  const [searchField, setSearchField] = useState<'pickup' | 'drop' | number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [selectedRide, setSelectedRide] = useState<string>('5seater');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMode, setBookingMode] = useState<'now' | 'advance'>('now');
  const [advanceDate, setAdvanceDate] = useState('2026-07-20');
  const [advanceTime, setAdvanceTime] = useState('10:00 AM');

  // Voucher discount states
  const [voucherText, setVoucherText] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountFlat, setDiscountFlat] = useState(0);

  // Route telemetry details
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(15.0); // Default simulated
  const [durationMins, setDurationMins] = useState<number>(30); // Default simulated
  const [loadingRoute, setLoadingRoute] = useState(false);

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  const rides = [
    { key: '5seater', name: '5 Seater', ratePerKm: 15, minsAway: 2, icon: 'car', desc: 'Sleek & spacious sedan' },
    { key: '7seater', name: '7 Seater', ratePerKm: 20, minsAway: 4, icon: 'users', desc: 'Perfect family ride' },
    { key: 'auto', name: 'Auto', ratePerKm: 8, minsAway: 1, icon: 'electric-rickshaw', desc: 'Quick local commuter' },
    { key: '4x4jeep', name: '4*4 Jeep', ratePerKm: 25, minsAway: 5, icon: 'truck-monster', desc: 'Offroad explorer' },
  ];

  // Preload Destination from router params
  useEffect(() => {
    if (searchParams.dropName) {
      setDrop({
        name: searchParams.dropName as string,
        latitude: parseFloat(searchParams.dropLat as string),
        longitude: parseFloat(searchParams.dropLng as string),
        address: searchParams.dropAddress as string || '',
      });
    }
  }, [searchParams]);



  // Autocomplete Suggestions
  useEffect(() => {
    if (searchText.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetchGoogleSuggestions(searchText);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchGoogleSuggestions = async (query: string) => {
    setLoadingSuggestions(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${GOOGLE_MAPS_KEY}&location=12.9716,77.5946&radius=100000`;
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.predictions) {
        setSuggestions(data.predictions);
      }
    } catch (e) {
      console.error('Autocomplete API error:', e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

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
        const selectedNode: LocationNode = {
          name: data.result.name || description.split(',')[0],
          latitude: lat,
          longitude: lng,
          address: description,
        };

        if (searchField === 'pickup') {
          setPickup(selectedNode);
        } else if (searchField === 'drop') {
          setDrop(selectedNode);
        } else if (typeof searchField === 'number') {
          // Modify specific stop
          const updatedStops = [...stops];
          updatedStops[searchField] = selectedNode;
          setStops(updatedStops);
        } else if (searchField === 'newstop') {
          setStops([...stops, selectedNode]);
        }
        setSearchField(null);
      }
    } catch (e) {
      console.error('Details API error:', e);
      Alert.alert('Location Error', 'Could not retrieve coordinates.');
    } finally {
      setLoadingRoute(false);
    }
  };

  // Google Directions API to fetch exact road route with waypoints support
  useEffect(() => {
    if (!pickup || !drop) return;

    const fetchRoute = async () => {
      setLoadingRoute(true);
      try {
        const origin = `${pickup.latitude},${pickup.longitude}`;
        const destination = `${drop.latitude},${drop.longitude}`;

        let waypointsQuery = '';
        if (stops.length > 0) {
          const coords = stops.map(s => `${s.latitude},${s.longitude}`).join('|');
          waypointsQuery = `&waypoints=${coords}`;
        }

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypointsQuery}&key=${GOOGLE_MAPS_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.routes && data.routes[0]) {
          const route = data.routes[0];
          // Polyline decoding
          if (route.overview_polyline && route.overview_polyline.points) {
            const points = decodePolyline(route.overview_polyline.points);
            setRouteCoords(points);
          }

          let metersSum = 0;
          let secondsSum = 0;
          route.legs.forEach((leg: any) => {
            metersSum += leg.distance.value;
            secondsSum += leg.duration.value;
          });

          setDistanceKm(metersSum / 1000);
          setDurationMins(Math.ceil(secondsSum / 60));
        } else {
          calculateStraightLineFallback();
        }
      } catch (e) {
        console.error('Directions route error:', e);
        calculateStraightLineFallback();
      } finally {
        setLoadingRoute(false);
      }
    };

    const calculateStraightLineFallback = () => {
      const fullPath = [pickup, ...stops, drop];
      const coords = fullPath.map(node => ({ latitude: node.latitude, longitude: node.longitude }));
      setRouteCoords(coords);

      // Symmetrical rough calculation
      let totalDistance = 0;
      for (let i = 0; i < fullPath.length - 1; i++) {
        const nodeA = fullPath[i];
        const nodeB = fullPath[i+1];
        const R = 6371;
        const dLat = ((nodeB.latitude - nodeA.latitude) * Math.PI) / 180;
        const dLon = ((nodeB.longitude - nodeA.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((nodeA.latitude * Math.PI) / 180) *
            Math.cos((nodeB.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDistance += R * c;
      }
      const estDistance = totalDistance * 1.25;
      setDistanceKm(estDistance);
      setDurationMins(Math.ceil((estDistance / 45) * 60));
    };

    fetchRoute();
  }, [pickup, drop, stops]);

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

  const getBasePrice = (ratePerKm: number) => {
    let fare = distanceKm * ratePerKm;
    return Math.round(fare);
  };

  const getDiscountedPrice = (basePrice: number) => {
    let final = basePrice;
    if (discountFlat > 0) {
      final = Math.max(0, final - discountFlat);
    }
    if (discountPercent > 0) {
      final = Math.round(final * (1 - discountPercent / 100));
    }
    return final;
  };

  const getDropOffTime = () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + durationMins);
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins} ${ampm}`;
  };

  const handleApplyVoucher = () => {
    const code = voucherText.trim().toUpperCase();
    if (!code) {
      Alert.alert('Empty Voucher', 'Please enter a voucher code first.');
      return;
    }
    if (code === 'VIBE15') {
      setAppliedVoucher('VIBE15');
      setDiscountPercent(15);
      setDiscountFlat(0);
      Alert.alert('Coupon Applied!', '15% discount has been applied to your fare.');
    } else if (code === 'SAVE100') {
      setAppliedVoucher('SAVE100');
      setDiscountPercent(0);
      setDiscountFlat(100);
      Alert.alert('Coupon Applied!', 'Flat ₹100 discount has been applied.');
    } else {
      Alert.alert('Invalid Coupon', 'Code not found. Try VIBE15 or SAVE100.');
    }
  };

  const handleBookCab = () => {
    if (!drop) {
      Alert.alert('Error', 'Please search and select a drop location first.');
      return;
    }
    const chosenRide = rides.find(r => r.key === selectedRide);
    const base = getBasePrice(chosenRide ? chosenRide.ratePerKm : 15);
    const final = getDiscountedPrice(base);

    if (bookingMode === 'advance') {
      const newAdv = {
        id: `adv_${Date.now()}`,
        type: 'cab' as const,
        title: `${pickup.name} ➔ ${drop.name}`,
        route: [pickup.name, ...stops.map(s => s.name), drop.name],
        date: advanceDate,
        time: advanceTime,
        price: final,
        touristName: 'Abhishek (Tourist)',
        bookingDate: new Date().toISOString().split('T')[0], // e.g. '2026-07-16'
        status: 'Pending' as const,
      };
      adminState.advanceBookings.push(newAdv);
      Alert.alert(
        'Advance Booking Scheduled!',
        `Your ride has been successfully booked for ${advanceDate} at ${advanceTime}.\n\nRefund Rules:\n- Same day of booking: 0% fee (100% refund)\n- 1 day before trip: 30% fee deducted\n- More than 1 day before: 15% fee deducted\n- Day of trip: 100% fee deducted`,
        [{ text: 'View Trips', onPress: () => router.replace('/(tabs)/trips') }]
      );
      return;
    }

    // Redirect to the live simulator matching page
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
        price: final.toString(),
        type: 'cab',
        vehicle: selectedRide,
        paymentMode: paymentMethod === 'cash' ? 'Cash' : 'UPI',
      }
    });
  };

  // Reordering/removing stops
  const handleRemoveStop = (index: number) => {
    const updated = [...stops];
    updated.splice(index, 1);
    setStops(updated);
  };

  const handleMoveStopUp = (index: number) => {
    if (index === 0) return;
    const updated = [...stops];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setStops(updated);
  };

  const handleMoveStopDown = (index: number) => {
    if (index === stops.length - 1) return;
    const updated = [...stops];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setStops(updated);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Routing Address Inputs Panel */}
      <View style={[styles.addressPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.addressHeader}>
          <TouchableOpacity style={styles.iconBack} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={scale(22)} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Cab Despatch Center</Text>
          <View style={{ width: scale(40) }} />
        </View>

        {/* Inputs Column */}
        <ScrollView style={{ maxHeight: verticalScale(160) }} showsVerticalScrollIndicator={true}>
          <View style={styles.inputsColumn}>
            {/* Pickup Node */}
            <View style={styles.nodeItemRow}>
              <TouchableOpacity 
                style={[styles.addressNodeTap, { flex: 1 }]}
                onPress={() => {
                  setSearchField('pickup');
                  setSearchText('');
                }}
              >
                <View style={styles.bulletRow}>
                  <View style={[styles.pointDot, { backgroundColor: colors.amber }]} />
                  <Text style={[styles.addressTextVal, { color: colors.textPrimary }]} numberOfLines={1}>
                    {pickup.name}
                  </Text>
                </View>
                <MaterialIcons name="edit" size={scale(15)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Stops list with Reorder and Delete controls */}
            {stops.map((stop, index) => (
              <View key={index}>
                <View style={[styles.nodeLinkLine, { backgroundColor: colors.border }]} />
                <View style={styles.nodeItemRow}>
                  <TouchableOpacity 
                    style={[styles.addressNodeTap, { flex: 1, borderColor: colors.amber }]}
                    onPress={() => {
                      setSearchField(index);
                      setSearchText('');
                    }}
                  >
                    <View style={styles.bulletRow}>
                      <View style={[styles.pointDot, { backgroundColor: '#F5C518' }]} />
                      <Text style={[styles.addressTextVal, { color: colors.textPrimary }]} numberOfLines={1}>
                        {stop.name}
                      </Text>
                    </View>
                    <MaterialIcons name="edit" size={scale(15)} color={colors.textMuted} />
                  </TouchableOpacity>
                  
                  {/* Reorder and Delete controls */}
                  <View style={styles.stopActionControls}>
                    <TouchableOpacity onPress={() => handleMoveStopUp(index)} disabled={index === 0} style={styles.reorderBtn}>
                      <MaterialIcons name="keyboard-arrow-up" size={scale(18)} color={index === 0 ? colors.border : colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleMoveStopDown(index)} disabled={index === stops.length - 1} style={styles.reorderBtn}>
                      <MaterialIcons name="keyboard-arrow-down" size={scale(18)} color={index === stops.length - 1 ? colors.border : colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRemoveStop(index)} style={styles.deleteStopBtn}>
                      <MaterialIcons name="delete" size={scale(16)} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            <View style={[styles.nodeLinkLine, { backgroundColor: colors.border }]} />

            {/* Drop Node */}
            <View style={styles.nodeItemRow}>
              <TouchableOpacity 
                style={[styles.addressNodeTap, { flex: 1 }]}
                onPress={() => {
                  setSearchField('drop');
                  setSearchText('');
                }}
              >
                <View style={styles.bulletRow}>
                  <View style={[styles.pointDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={[styles.addressTextVal, drop ? { color: colors.textPrimary } : { color: colors.textMuted }]} numberOfLines={1}>
                    {drop ? drop.name : 'Enter destination (drop location)...'}
                  </Text>
                </View>
                <MaterialIcons name="search" size={scale(15)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Conditional Active Search Overlay suggestions */}
      {searchField !== null && (
        <View style={[styles.searchOverlayContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.searchBarHeader, { borderBottomColor: colors.border }]}>
            <MaterialIcons name="edit-location" size={scale(20)} color={colors.amber} style={{ marginRight: scale(8) }} />
            <TextInput
              autoFocus
              placeholder="Search stop/address location..."
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'}
              style={[styles.textInputStyle, { color: colors.textPrimary }]}
              value={searchText}
              onChangeText={setSearchText}
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setSearchField(null)}>
              <Text style={{ color: colors.amber, fontWeight: '700', fontSize: moderateFontScale(13) }}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {loadingSuggestions && <ActivityIndicator color={colors.amber} style={{ margin: scale(15) }} />}
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={[styles.suggestionItemCard, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectSuggestion(item.place_id, item.description)}
              >
                <MaterialIcons name="location-on" size={scale(18)} color={colors.textMuted} style={{ marginRight: scale(10) }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.suggestionTextName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.structured_formatting?.main_text || item.description.split(',')[0]}
                  </Text>
                  <Text style={[styles.suggestionTextSub, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.structured_formatting?.secondary_text || item.description}
                  </Text>
                </View>
                <MaterialIcons name="add" size={scale(20)} color={colors.amber} />
              </TouchableOpacity>
            ))}

            {/* Presets list */}
            {suggestions.length === 0 && (
              <View style={styles.presetsListContainer}>
                <Text style={[styles.presetsTitle, { color: colors.amber }]}>Famous destinations near Bengaluru:</Text>
                {presetDestinations.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetRowItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      if (searchField === 'pickup') {
                        setPickup(preset);
                      } else if (searchField === 'drop') {
                        setDrop(preset);
                      } else if (typeof searchField === 'number') {
                        const updated = [...stops];
                        updated[searchField] = preset;
                        setStops(updated);
                      } else if (searchField === 'newstop') {
                        setStops([...stops, preset]);
                      }
                      setSearchField(null);
                    }}
                  >
                    <MaterialIcons name="history" size={scale(18)} color={colors.textMuted} style={{ marginRight: scale(10) }} />
                    <View>
                      <Text style={[styles.presetRowName, { color: colors.textPrimary }]}>{preset.name}</Text>
                      <Text style={[styles.presetRowAddress, { color: colors.textMuted }]}>{preset.address}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Main Map Content Panel */}
      <View style={styles.mapCanvasBlock}>
        {Platform.OS === 'web' || !MapView ? (
          // Symmetrical HUD Web Telemetry View
          <View style={styles.webMapTelemetry}>
            <View style={styles.gridsDesign} />
            <View style={styles.hudOverlayBox}>
              <Text style={styles.hudTextTitle}>GPS MULTI-STOP LINK ACTIVE</Text>
              <Text style={styles.hudAddressLine}>Start: {pickup.name}</Text>
              {stops.map((st, sidx) => (
                <Text key={sidx} style={styles.hudAddressLine}>Stop {sidx + 1}: {st.name}</Text>
              ))}
              {drop && <Text style={styles.hudAddressLine}>End: {drop.name}</Text>}
              <Text style={styles.hudRouteMeta}>Distance: {distanceKm.toFixed(1)} km | Waypoints: {stops.length} | Travel: {durationMins} mins</Text>
            </View>
            {/* Visual connected pins */}
            <View style={styles.nodesVisualRow}>
              <View style={[styles.mapNodeVisual, { backgroundColor: colors.amber }]}>
                <Text style={styles.nodeTextChar}>P</Text>
                <Text style={styles.nodeSubLabel}>Pickup</Text>
              </View>
              {stops.map((_, sidx) => (
                <React.Fragment key={sidx}>
                  <View style={[styles.lineConnectRoad, { backgroundColor: colors.amber }]} />
                  <View style={[styles.mapNodeVisual, { backgroundColor: '#F5C518' }]}>
                    <Text style={styles.nodeTextChar}>{sidx + 1}</Text>
                    <Text style={styles.nodeSubLabel}>Stop {sidx + 1}</Text>
                  </View>
                </React.Fragment>
              ))}
              <View style={[styles.lineConnectRoad, { backgroundColor: colors.amber }]} />
              <View style={[styles.mapNodeVisual, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.nodeTextChar}>D</Text>
                <Text style={styles.nodeSubLabel}>Drop</Text>
              </View>
            </View>
          </View>
        ) : (
          // Mobile Native Map View
          <MapView
            provider="google"
            style={StyleSheet.absoluteFillObject}
            initialRegion={{
              latitude: 12.9716,
              longitude: 77.5946,
              latitudeDelta: 0.15,
              longitudeDelta: 0.15,
            }}
          >
            {/* Pickup Marker */}
            <Marker
              coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}
              title={pickup.name}
              description={pickup.address}
              pinColor={colors.amber}
            />
            {/* Stops Markers */}
            {stops.map((stop, idx) => (
              <Marker
                key={idx}
                coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                title={`Stop ${idx + 1}: ${stop.name}`}
                description={stop.address}
                pinColor="#F5C518"
              />
            ))}
            {/* Drop Marker */}
            {drop && (
              <Marker
                coordinate={{ latitude: drop.latitude, longitude: drop.longitude }}
                title={drop.name}
                description={drop.address}
                pinColor="#ef4444"
              />
            )}
            {/* Directions Polyline */}
            {routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor={colors.amber}
                strokeWidth={scale(4)}
              />
            )}
          </MapView>
        )}

        {/* Floating Add Stop Button (Bottom Right of map) */}
        <TouchableOpacity
          style={styles.floatingAddStopBtn}
          activeOpacity={0.85}
          onPress={() => {
            setSearchField('newstop');
            setSearchText('');
          }}
        >
          <MaterialIcons name="add-location" size={scale(18)} color="#101010" />
          <Text style={styles.floatingAddStopText}>Add Stop</Text>
        </TouchableOpacity>

        {loadingRoute && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color={colors.amber} />
            <Text style={styles.loadingRouteText}>Processing Trip Path...</Text>
          </View>
        )}
      </View>

      {/* Open Bottom Drawer Sheet */}
      <View style={[styles.bookingDrawer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.dragHandleBar} />

        {/* Dynamic Route details */}
        <View style={styles.routeStatsSummary}>
          <Text style={[styles.statsSummaryText, { color: colors.textPrimary }]}>
            {distanceKm.toFixed(1)} km · {durationMins} mins · Dropoff: <Text style={{ color: colors.amber, fontWeight: '700' }}>{getDropOffTime()}</Text>
          </Text>
        </View>

        {/* Rides Horizontal Slider */}
        <View style={styles.rideSliderWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rideListContent}>
            {rides.map((ride) => {
              const isSelected = selectedRide === ride.key;
              const base = getBasePrice(ride.ratePerKm);
              const discounted = getDiscountedPrice(base);
              const showDiscount = discounted !== base;
              
              return (
                <TouchableOpacity
                  key={ride.key}
                  style={[
                    styles.rideOptionItem,
                    {
                      backgroundColor: colors.surfaceCard,
                      borderColor: isSelected ? colors.amber : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedRide(ride.key)}
                  activeOpacity={0.9}
                >
                  <View style={[styles.optionIconBox, { backgroundColor: isSelected ? 'rgba(245,197,24,0.1)' : 'rgba(255,255,255,0.04)' }]}>
                    {ride.icon === 'electric-rickshaw' ? (
                      <MaterialIcons name="electric-rickshaw" size={scale(18)} color={isSelected ? colors.amber : colors.textPrimary} />
                    ) : (
                      <FontAwesome5 name={ride.icon} size={scale(16)} color={isSelected ? colors.amber : colors.textPrimary} />
                    )}
                  </View>
                  <Text style={[styles.optionName, { color: colors.textPrimary }]}>{ride.name}</Text>
                  
                  {/* Highlight Slashed price if coupon active */}
                  <View style={styles.priceColumn}>
                    {showDiscount && (
                      <Text style={styles.slashedPrice}>₹{base}</Text>
                    )}
                    <Text style={[styles.optionFare, { color: colors.amber }]}>₹{discounted}</Text>
                  </View>
                  <Text style={[styles.optionTime, { color: colors.textMuted }]}>{ride.minsAway} min away</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Voucher Discount Code complete Row */}
        <View style={[styles.voucherInputRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <MaterialIcons name="card-giftcard" size={scale(18)} color={colors.amber} style={{ marginRight: scale(8) }} />
          <TextInput
            placeholder="Enter promo coupon (e.g. VIBE15, SAVE100)"
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'}
            style={[styles.voucherTextInput, { color: colors.textPrimary }]}
            value={voucherText}
            onChangeText={setVoucherText}
            autoCapitalize="characters"
          />
          <TouchableOpacity 
            style={[styles.voucherApplyBtn, { backgroundColor: colors.amber }]} 
            onPress={handleApplyVoucher}
          >
            <Text style={styles.voucherApplyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {appliedVoucher !== '' && (
          <View style={{ paddingHorizontal: scale(18), paddingTop: verticalScale(6) }}>
            <Text style={{ color: colors.amber, fontSize: moderateFontScale(11), fontWeight: '700' }}>
              ✓ Coupon code {appliedVoucher} applied successfully!
            </Text>
          </View>
        )}

        {/* Payment Settings Row */}
        <View style={[styles.bookingModeContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.settingLabel, { color: colors.textPrimary, marginBottom: verticalScale(6) }]}>
            Payment Mode
          </Text>
          <View style={styles.paymentSelectorRow}>
            <TouchableOpacity
              style={[styles.payMethodBtn, paymentMethod === 'cash' && styles.payMethodBtnActive]}
              onPress={() => setPaymentMethod('cash')}
            >
              <MaterialIcons name="attach-money" size={scale(14)} color={paymentMethod === 'cash' ? '#101010' : colors.textPrimary} />
              <Text style={[styles.payMethodText, { color: paymentMethod === 'cash' ? '#101010' : colors.textPrimary }]}>Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.payMethodBtn, paymentMethod === 'upi' && styles.payMethodBtnActive]}
              onPress={() => setPaymentMethod('upi')}
            >
              <FontAwesome5 name="qrcode" size={scale(11)} color={paymentMethod === 'upi' ? '#101010' : colors.textPrimary} />
              <Text style={[styles.payMethodText, { color: paymentMethod === 'upi' ? '#101010' : colors.textPrimary }]}>UPI</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Advance Booking Selector */}
        <View style={[styles.bookingModeContainer, { borderBottomColor: colors.border }]}>
          <Text style={[styles.settingLabel, { color: colors.textPrimary, marginBottom: verticalScale(6) }]}>
            Booking Schedule
          </Text>
          <View style={styles.bookingModeSelector}>
            <TouchableOpacity
              style={[styles.modeBtn, bookingMode === 'now' && styles.modeBtnActive, { borderColor: colors.border }]}
              onPress={() => setBookingMode('now')}
            >
              <MaterialIcons name="bolt" size={scale(14)} color={bookingMode === 'now' ? '#101010' : colors.textPrimary} />
              <Text style={[styles.modeBtnText, { color: bookingMode === 'now' ? '#101010' : colors.textPrimary }]}>Book Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, bookingMode === 'advance' && styles.modeBtnActive, { borderColor: colors.border }]}
              onPress={() => setBookingMode('advance')}
            >
              <MaterialIcons name="schedule" size={scale(14)} color={bookingMode === 'advance' ? '#101010' : colors.textPrimary} />
              <Text style={[styles.modeBtnText, { color: bookingMode === 'advance' ? '#101010' : colors.textPrimary }]}>Book in Advance</Text>
            </TouchableOpacity>
          </View>

          {bookingMode === 'advance' && (
            <View style={styles.datePickerInputRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputMicroLabel, { color: colors.textMuted }]}>TRAVEL DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.dateInput, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={advanceDate}
                  onChangeText={setAdvanceDate}
                  placeholder="e.g. 2026-07-20"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputMicroLabel, { color: colors.textMuted }]}>TRAVEL TIME</Text>
                <TextInput
                  style={[styles.dateInput, { color: colors.textPrimary, borderColor: colors.border }]}
                  value={advanceTime}
                  onChangeText={setAdvanceTime}
                  placeholder="e.g. 10:00 AM"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>
            </View>
          )}
        </View>

        {/* Book Button */}
        <View style={styles.confirmActionArea}>
          <TouchableOpacity
            style={styles.bookCabButton}
            onPress={handleBookCab}
            disabled={bookingLoading}
            activeOpacity={0.8}
          >
            {bookingLoading ? (
              <ActivityIndicator color="#101010" />
            ) : (
              <>
                <Text style={styles.bookCabText}>Confirm & Book Ride</Text>
                <MaterialIcons name="local-taxi" size={scale(20)} color="#101010" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addressPanel: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(14),
    borderBottomWidth: 1.2,
    zIndex: 10,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(12),
  },
  iconBack: {
    padding: scale(4),
  },
  panelTitle: {
    fontSize: moderateFontScale(15),
    fontWeight: '800',
  },
  floatingAddStopBtn: {
    position: 'absolute',
    bottom: scale(16),
    right: scale(16),
    backgroundColor: '#F5C518',
    borderRadius: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 5,
  },
  floatingAddStopText: {
    color: '#101010',
    fontWeight: '800',
    fontSize: moderateFontScale(11),
    marginLeft: scale(4),
  },
  inputsColumn: {
    position: 'relative',
  },
  nodeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  addressNodeTap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    height: verticalScale(36),
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: scale(10),
  },
  pointDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginRight: scale(10),
  },
  addressTextVal: {
    fontSize: moderateFontScale(12),
    fontWeight: '600',
    flex: 1,
  },
  stopActionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: scale(8),
    gap: scale(3),
  },
  reorderBtn: {
    padding: scale(3),
  },
  deleteStopBtn: {
    padding: scale(4),
    marginLeft: scale(2),
  },
  nodeLinkLine: {
    width: scale(2),
    height: verticalScale(10),
    marginLeft: scale(15),
    marginVertical: verticalScale(1),
  },
  mapCanvasBlock: {
    flex: 1,
    position: 'relative',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 16, 20, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  loadingRouteText: {
    color: '#ffffff',
    fontSize: moderateFontScale(12),
    fontWeight: '600',
    marginTop: verticalScale(8),
  },
  webMapTelemetry: {
    flex: 1,
    backgroundColor: '#101014',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridsDesign: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    backgroundColor: 'transparent',
    opacity: 0.35,
  },
  hudOverlayBox: {
    position: 'absolute',
    top: scale(14),
    left: scale(14),
    right: scale(14),
    backgroundColor: 'rgba(16, 16, 20, 0.85)',
    borderRadius: scale(14),
    padding: scale(12),
    borderWidth: 1.2,
    borderColor: 'rgba(245, 197, 24, 0.15)',
  },
  hudTextTitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(9),
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: verticalScale(6),
  },
  hudAddressLine: {
    color: '#ffffff',
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  hudRouteMeta: {
    color: '#F5C518',
    fontSize: moderateFontScale(10),
    fontWeight: '700',
    marginTop: verticalScale(6),
  },
  nodesVisualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(80),
    width: '90%',
  },
  mapNodeVisual: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nodeTextChar: {
    color: '#101010',
    fontSize: moderateFontScale(12),
    fontWeight: '900',
  },
  nodeSubLabel: {
    color: '#8D8D97',
    fontSize: moderateFontScale(8),
    fontWeight: '600',
    position: 'absolute',
    top: scale(34),
    width: scale(60),
    textAlign: 'center',
  },
  lineConnectRoad: {
    height: verticalScale(3),
    flex: 1,
    marginHorizontal: scale(2),
  },
  bookingDrawer: {
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(20),
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  dragHandleBar: {
    width: scale(40),
    height: verticalScale(4),
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: scale(2),
    alignSelf: 'center',
    marginBottom: verticalScale(10),
  },
  routeStatsSummary: {
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  statsSummaryText: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  rideSliderWrapper: {
    marginBottom: verticalScale(12),
  },
  rideListContent: {
    paddingHorizontal: scale(18),
    gap: scale(10),
  },
  rideOptionItem: {
    width: scale(115),
    borderRadius: scale(18),
    borderWidth: 1.5,
    padding: scale(12),
    alignItems: 'center',
  },
  optionIconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(6),
  },
  optionName: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  priceColumn: {
    alignItems: 'center',
    marginVertical: verticalScale(2),
  },
  slashedPrice: {
    fontSize: moderateFontScale(10),
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.3)',
  },
  optionFare: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  optionTime: {
    fontSize: moderateFontScale(9),
    fontWeight: '600',
  },
  voucherInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(18),
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    justifyContent: 'space-between',
  },
  voucherTextInput: {
    flex: 1,
    fontSize: moderateFontScale(12),
    padding: 0,
    height: verticalScale(30),
    marginHorizontal: scale(6),
  },
  voucherApplyBtn: {
    borderRadius: scale(8),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherApplyBtnText: {
    color: '#101010',
    fontSize: moderateFontScale(11),
    fontWeight: '800',
  },
  settingLabel: {
    fontSize: moderateFontScale(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(6),
  },
  paymentSelectorRow: {
    flexDirection: 'row',
    gap: scale(6),
  },
  payMethodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(3),
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: scale(10),
    paddingVertical: verticalScale(6),
  },
  payMethodBtnActive: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },
  payMethodText: {
    fontSize: moderateFontScale(9),
    fontWeight: '800',
  },
  confirmActionArea: {
    paddingHorizontal: scale(18),
    marginTop: verticalScale(12),
  },
  bookCabButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(14),
    height: scale(46),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
  },
  bookCabText: {
    color: '#101010',
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  searchOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  searchBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1.2,
  },
  textInputStyle: {
    flex: 1,
    fontSize: moderateFontScale(14),
    padding: 0,
    height: verticalScale(30),
  },
  suggestionItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(18),
    paddingVertical: scale(14),
    borderBottomWidth: 1.2,
  },
  suggestionTextName: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  suggestionTextSub: {
    fontSize: moderateFontScale(10),
    marginTop: verticalScale(2),
  },
  presetsListContainer: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(16),
  },
  presetsTitle: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    marginBottom: verticalScale(8),
  },
  presetRowItem: {
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  presetRowName: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  presetRowAddress: {
    fontSize: moderateFontScale(10),
    marginTop: verticalScale(2),
  },
  bookingModeContainer: {
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1.2,
    marginTop: verticalScale(6),
  },
  bookingModeSelector: {
    flexDirection: 'row',
    gap: scale(10),
  },
  modeBtn: {
    flex: 1,
    height: verticalScale(32),
    borderWidth: 1.2,
    borderRadius: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
  },
  modeBtnActive: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },
  modeBtnText: {
    fontSize: moderateFontScale(11),
    fontWeight: '800',
  },
  datePickerInputRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(10),
  },
  inputMicroLabel: {
    fontSize: moderateFontScale(8),
    fontWeight: '700',
    marginBottom: verticalScale(3),
  },
  dateInput: {
    height: verticalScale(30),
    borderWidth: 1.2,
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
});
