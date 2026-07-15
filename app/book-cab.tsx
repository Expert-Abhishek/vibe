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
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

const presetDropLocations = [
  { name: 'Kempegowda International Airport (BLR)', latitude: 13.1986, longitude: 77.7066, address: 'KIAL Road, Devanahalli, Bengaluru' },
  { name: 'Majestic Railway Station', latitude: 12.9784, longitude: 77.5694, address: 'Subhash Nagar, Bengaluru' },
  { name: 'Indiranagar 100 Feet Road', latitude: 12.9629, longitude: 77.6377, address: 'Indiranagar, Bengaluru' },
  { name: 'Bannerghatta National Park', latitude: 12.7854, longitude: 77.5905, address: 'Bannerghatta, Bengaluru' },
  { name: 'Nandi Hills Peak', latitude: 13.3702, longitude: 77.6835, address: 'Chikkaballapur, Karnataka' },
];

export default function BookCabScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [pickup, setPickup] = useState<LocationNode>({
    name: 'Bengaluru Palace (Pickup)',
    latitude: 12.9982,
    longitude: 77.5920,
    address: 'Vasanth Nagar, Bengaluru, Karnataka',
  });

  const [drop, setDrop] = useState<LocationNode | null>({
    name: 'Kempegowda Airport (Drop)',
    latitude: 13.1986,
    longitude: 77.7066,
    address: 'KIAL Road, Devanahalli, Bengaluru, Karnataka',
  });

  const [searchField, setSearchField] = useState<'pickup' | 'drop' | null>(null);
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [selectedRide, setSelectedRide] = useState<string>('5seater');
  const [isAc, setIsAc] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'voucher'>('cash');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Route telemetry details
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(32.5); // Default simulated
  const [durationMins, setDurationMins] = useState<number>(45); // Default simulated
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
    { key: 'auto', name: 'Auto', ratePerKm: 8, minsAway: 1, icon: 'motorcycle', desc: 'Quick local commuter' },
    { key: '4x4jeep', name: '4*4 Jeep', ratePerKm: 25, minsAway: 5, icon: 'truck-monster', desc: 'Offroad explorer' },
  ];

  // Set AC to false if Auto is selected
  useEffect(() => {
    if (selectedRide === 'auto') {
      setIsAc(false);
    }
  }, [selectedRide]);

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

  // Google Directions API to fetch exact road route
  useEffect(() => {
    if (!pickup || !drop) return;

    const calculateStraightLineFallback = () => {
      setRouteCoords([
        { latitude: pickup.latitude, longitude: pickup.longitude },
        { latitude: drop.latitude, longitude: drop.longitude },
      ]);

      const R = 6371; // Earth radius in km
      const dLat = ((drop.latitude - pickup.latitude) * Math.PI) / 180;
      const dLon = ((drop.longitude - pickup.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((pickup.latitude * Math.PI) / 180) *
          Math.cos((drop.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const straightDist = R * c;

      const estDistance = straightDist * 1.25; // Winding factor
      setDistanceKm(estDistance);
      setDurationMins(Math.ceil((estDistance / 45) * 60)); // Avg 45km/h speed
    };

    const fetchRoute = async () => {
      setLoadingRoute(true);
      try {
        const origin = `${pickup.latitude},${pickup.longitude}`;
        const destination = `${drop.latitude},${drop.longitude}`;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_KEY}`;
        
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
          // Haversine straight line fallback
          calculateStraightLineFallback();
        }
      } catch (e) {
        console.error('Directions route error:', e);
        calculateStraightLineFallback();
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [pickup, drop]);

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

  const getPrice = (ratePerKm: number) => {
    let fare = distanceKm * ratePerKm;
    if (isAc && selectedRide !== 'auto') {
      fare += distanceKm * 2; // AC surcharge ₹2/km
    }
    return Math.round(fare);
  };

  const getDropOffTime = () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() + durationMins);
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 hour should be 12
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins} ${ampm}`;
  };

  const handleBookCab = () => {
    if (!drop) {
      Alert.alert('Error', 'Please search and select a drop location first.');
      return;
    }
    setBookingLoading(true);
    setTimeout(() => {
      setBookingLoading(false);
      const chosenRide = rides.find(r => r.key === selectedRide);
      const fare = getPrice(chosenRide ? chosenRide.ratePerKm : 15);
      
      Alert.alert(
        'Cab Booked Successfully!',
        `Your driver is arriving in ${chosenRide?.minsAway} mins!\n\nDetails:\nVehicle: ${chosenRide?.name}\nPayment: ${paymentMethod.toUpperCase()}\nAC: ${isAc ? 'ON' : 'OFF'}\nEstimated Price: ₹${fare.toLocaleString('en-IN')}`,
        [{ text: 'View Trip Status', onPress: () => router.replace('/(tabs)/trips') }]
      );
    }, 2000);
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
          <View style={{ width: scale(30) }} />
        </View>

        {/* Input Rows */}
        <View style={styles.inputsColumn}>
          {/* Pickup Input */}
          <TouchableOpacity 
            style={[styles.addressNodeTap, { borderColor: searchField === 'pickup' ? colors.amber : colors.border }]}
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
            <MaterialIcons name="edit" size={scale(16)} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Line separator connector */}
          <View style={[styles.nodeLinkLine, { backgroundColor: colors.border }]} />

          {/* Drop Input */}
          <TouchableOpacity 
            style={[styles.addressNodeTap, { borderColor: searchField === 'drop' ? colors.amber : colors.border }]}
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
            <MaterialIcons name="search" size={scale(16)} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conditional Active Search Overlay suggestions */}
      {searchField !== null && (
        <View style={[styles.searchOverlayContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.searchBarHeader, { borderBottomColor: colors.border }]}>
            <MaterialIcons name="edit-location" size={scale(20)} color={colors.amber} style={{ marginRight: scale(8) }} />
            <TextInput
              autoFocus
              placeholder={`Search ${searchField} address...`}
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
                {presetDropLocations.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetRowItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      if (searchField === 'pickup') {
                        setPickup(preset);
                      } else {
                        setDrop(preset);
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
              <Text style={styles.hudTextTitle}>GPS ROUTE LINK ACTIVE</Text>
              <Text style={styles.hudAddressLine}>Start: {pickup.name}</Text>
              {drop && <Text style={styles.hudAddressLine}>End: {drop.name}</Text>}
              <Text style={styles.hudRouteMeta}>Route Distance: {distanceKm.toFixed(1)} km | Travel Time: {durationMins} mins</Text>
            </View>
            {/* Visual connected pins */}
            <View style={styles.nodesVisualRow}>
              <View style={[styles.mapNodeVisual, { backgroundColor: colors.amber }]}>
                <Text style={styles.nodeTextChar}>A</Text>
                <Text style={styles.nodeSubLabel}>Pickup</Text>
              </View>
              <View style={[styles.lineConnectRoad, { backgroundColor: colors.amber }]} />
              <View style={[styles.mapNodeVisual, { backgroundColor: '#ef4444' }]}>
                <Text style={styles.nodeTextChar}>B</Text>
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
              const farePrice = getPrice(ride.ratePerKm);
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
                    <FontAwesome5 name={ride.icon} size={scale(16)} color={isSelected ? colors.amber : colors.textPrimary} />
                  </View>
                  <Text style={[styles.optionName, { color: colors.textPrimary }]}>{ride.name}</Text>
                  <Text style={[styles.optionFare, { color: colors.amber }]}>₹{farePrice}</Text>
                  <Text style={[styles.optionTime, { color: colors.textMuted }]}>{ride.minsAway} min away</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* AC and Payment Settings Row */}
        <View style={[styles.optionsSettingGrid, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          {/* AC Toggle - HIDDEN FOR AUTO */}
          {selectedRide !== 'auto' ? (
            <View style={styles.settingCell}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>AC Cabin Comfort</Text>
              <View style={styles.togglePillRow}>
                <TouchableOpacity
                  style={[styles.togglePillCell, isAc && styles.togglePillCellActive]}
                  onPress={() => setIsAc(true)}
                >
                  <Text style={[styles.togglePillText, { color: isAc ? '#101010' : colors.textPrimary }]}>ON</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.togglePillCell, !isAc && styles.togglePillCellActive]}
                  onPress={() => setIsAc(false)}
                >
                  <Text style={[styles.togglePillText, { color: !isAc ? '#101010' : colors.textPrimary }]}>OFF</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.settingCell}>
              <Text style={[styles.settingLabel, { color: colors.textMuted }]}>AC Cabin Comfort</Text>
              <Text style={[styles.noAcAutoDisclaimer, { color: colors.textMuted }]}>Auto (No AC)</Text>
            </View>
          )}

          <View style={[styles.gridSeparatorLine, { backgroundColor: colors.border }]} />

          {/* Payment Method Option */}
          <View style={styles.settingCell}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Payment Mode</Text>
            <View style={styles.paymentSelectorRow}>
              <TouchableOpacity
                style={[styles.payMethodBtn, paymentMethod === 'cash' && styles.payMethodBtnActive]}
                onPress={() => setPaymentMethod('cash')}
              >
                <MaterialIcons name="attach-money" size={scale(14)} color={paymentMethod === 'cash' ? '#101010' : colors.textPrimary} />
                <Text style={[styles.payMethodText, { color: paymentMethod === 'cash' ? '#101010' : colors.textPrimary }]}>Cash</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.payMethodBtn, paymentMethod === 'voucher' && styles.payMethodBtnActive]}
                onPress={() => setPaymentMethod('voucher')}
              >
                <MaterialIcons name="card-membership" size={scale(14)} color={paymentMethod === 'voucher' ? '#101010' : colors.textPrimary} />
                <Text style={[styles.payMethodText, { color: paymentMethod === 'voucher' ? '#101010' : colors.textPrimary }]}>Voucher</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingBottom: verticalScale(16),
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
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  inputsColumn: {
    position: 'relative',
  },
  addressNodeTap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(14),
    paddingHorizontal: scale(14),
    height: verticalScale(40),
    backgroundColor: 'rgba(255,255,255,0.03)',
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
    fontSize: moderateFontScale(13),
    fontWeight: '600',
    flex: 1,
  },
  nodeLinkLine: {
    width: scale(2),
    height: verticalScale(12),
    marginLeft: scale(17),
    marginVertical: verticalScale(2),
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
    fontSize: moderateFontScale(11),
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
    marginTop: verticalScale(60),
    width: '75%',
  },
  mapNodeVisual: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  nodeTextChar: {
    color: '#101010',
    fontSize: moderateFontScale(14),
    fontWeight: '900',
  },
  nodeSubLabel: {
    color: '#8D8D97',
    fontSize: moderateFontScale(9),
    fontWeight: '600',
    position: 'absolute',
    top: scale(40),
    width: scale(70),
    textAlign: 'center',
  },
  lineConnectRoad: {
    height: verticalScale(3),
    flex: 1,
    marginHorizontal: scale(4),
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
    marginBottom: verticalScale(12),
  },
  statsSummaryText: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  rideSliderWrapper: {
    marginBottom: verticalScale(14),
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
  optionFare: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
    marginVertical: verticalScale(2),
  },
  optionTime: {
    fontSize: moderateFontScale(9),
    fontWeight: '600',
  },
  optionsSettingGrid: {
    flexDirection: 'row',
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(18),
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingCell: {
    flex: 0.47,
  },
  settingLabel: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(6),
  },
  noAcAutoDisclaimer: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
    fontStyle: 'italic',
  },
  togglePillRow: {
    flexDirection: 'row',
    borderRadius: scale(10),
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: scale(3),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  togglePillCell: {
    flex: 1,
    paddingVertical: verticalScale(5),
    borderRadius: scale(7),
    alignItems: 'center',
  },
  togglePillCellActive: {
    backgroundColor: '#F5C518',
  },
  togglePillText: {
    fontSize: moderateFontScale(10),
    fontWeight: '800',
  },
  gridSeparatorLine: {
    width: 1.2,
    height: '80%',
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
    gap: scale(2),
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
    marginTop: verticalScale(14),
  },
  bookCabButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(14),
    height: scale(48),
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
});
