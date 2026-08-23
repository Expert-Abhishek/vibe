import { adminState } from '@/constants/admin-state';
import { bookTripApi, createTripApi, deductWalletApi, fetchDestinationsApi, fetchDriversApi, submitWalletDeductionRequestApi, validateVoucherApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { sendLocalNotification } from '@/constants/notifications';
import { PRESET_PICKUP_DROP_LOCATIONS, PresetLocation } from '@/constants/preset-locations';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { broadcastNewTripRequest } from '@/constants/tripSync';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



import MapView, { Marker, Polyline } from '@/components/react-native-maps';
import { fetchRoadRoute, LatLng } from '@/src/services/roadRoutingService';

const GOOGLE_MAPS_KEY = 'AIzaSyBDo89INLAVgmvmjCJHR9ZP66gNeE5uy7o';

interface Checkpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export default function MakeTripScreen() {
  const router = useRouter();
  const mainScrollViewRef = React.useRef<ScrollView>(null);
  const searchParams = useLocalSearchParams();
  const [selectedRide, setSelectedRide] = useState<string>((searchParams.selectedRide as string) || '5seater');
  const [selected4x4Car, setSelected4x4Car] = useState<string>('Thar');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');

  // Voucher states
  const [voucherText, setVoucherText] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);
  const [voucherDiscount, setVoucherDiscount] = useState<number>(0);
  const [voucherLoading, setVoucherLoading] = useState(false);

  // Vehicle selector modal visibility state
  const [isVehiclePickerVisible, setIsVehiclePickerVisible] = useState(false);

  const jeepCarouselData = [
    {
      id: 'Thar',
      name: 'Mahindra Thar 4x4',
      desc: 'The legendary offroader. Powerful engine, high clearance, and ultimate commanding presence.',
      image: require('@/assets/images/thar.png'),
      capacity: '4 Passengers + 1 Bag',
      rateText: '₹4200/Day (+ ₹350/hr addon)',
    },
    {
      id: 'Gurkha',
      name: 'Force Gurkha 4x4',
      desc: 'Extreme adventure machine. Snorkel intake, heavy-duty suspension, and unmatched trail capability.',
      image: require('@/assets/images/thar.png'),
      capacity: '4 Passengers + 2 Bags',
      rateText: '₹4200/Day (+ ₹350/hr addon)',
    },
    {
      id: 'Jimny',
      name: 'Maruti Jimny 4x4',
      desc: 'Compact mountain climber. Lightweight 4WD, easy maneuvering, and classic styling.',
      image: require('@/assets/images/thar.png'),
      capacity: '4 Passengers + 1 Bag',
      rateText: '₹4200/Day (+ ₹350/hr addon)',
    },
  ];

  const getTomorrowDateString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getInitialTimeParts = () => {
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const roundedM = Math.round(m / 5) * 5;
    return {
      hour: h,
      minute: roundedM >= 60 ? 55 : roundedM,
      ampm: ampm as 'AM' | 'PM'
    };
  };

  const initialTimeParts = getInitialTimeParts();
  const [bookingHour, setBookingHour] = useState<number>(initialTimeParts.hour);
  const [bookingMinute, setBookingMinute] = useState<number>(initialTimeParts.minute);
  const [bookingAmPm, setBookingAmPm] = useState<'AM' | 'PM'>(initialTimeParts.ampm);

  const [bookingDate, setBookingDate] = useState<string>(getTomorrowDateString());
  const [prebookPayOption, setPrebookPayOption] = useState<'20' | '100'>('20');
  const [bookingMode, setBookingMode] = useState<'instant' | 'prebook'>(adminState.instantBookingEnabled ? 'instant' : 'prebook');

  useEffect(() => {
    setBookingMode(adminState.instantBookingEnabled ? 'instant' : 'prebook');
  }, [adminState.instantBookingEnabled]);

  const bookingTime = `${bookingHour}:${bookingMinute < 10 ? '0' + bookingMinute : bookingMinute} ${bookingAmPm}`;

  const dateOptions = Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      monthName: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  });

  const timeOptions = [
    '08:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'
  ];

  const getRideLabel = (key: string) => {
    if (key === '5seater') return '5 Seater Premium';
    if (key === '7seater') return '7 Seater Spacious';
    if (key === '4x4jeep') return '4*4 Jeep Offroader';
    if (key === 'auto') return 'Eco Auto';
    return '';
  };
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [liveDestinations, setLiveDestinations] = useState<any[]>([]);
  const [backendDrivers, setBackendDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);

  useEffect(() => {
    async function loadBackendData() {
      const data = await fetchDestinationsApi();
      if (data && data.length > 0) {
        setLiveDestinations(data);
      }
      const drivers = await fetchDriversApi();
      if (drivers && drivers.length > 0) {
        setBackendDrivers(drivers);
      }
    }
    loadBackendData();
  }, []);

  const [stationList, setStationList] = useState<PresetLocation[]>(PRESET_PICKUP_DROP_LOCATIONS);
  const [selectedPickup, setSelectedPickup] = useState<PresetLocation>(PRESET_PICKUP_DROP_LOCATIONS[0]);
  const [selectedDrop, setSelectedDrop] = useState<PresetLocation>(PRESET_PICKUP_DROP_LOCATIONS[1]);
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);
  const [pickupSearchQuery, setPickupSearchQuery] = useState('');
  const [dropSearchQuery, setDropSearchQuery] = useState('');

  const [touristCheckpoints, setTouristCheckpoints] = useState<Checkpoint[]>([]);

  // Listen for vehicle selection returned from Fleet Showcase (/cars)
  useEffect(() => {
    if (searchParams.checkpoints) {
      try {
        const parsed = typeof searchParams.checkpoints === 'string'
          ? JSON.parse(searchParams.checkpoints)
          : searchParams.checkpoints;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTouristCheckpoints(parsed);
        }
      } catch (e) {
        console.warn('Could not parse checkpoints from searchParams:', e);
      }
    }
    if (searchParams.pickup) {
      try {
        const p = typeof searchParams.pickup === 'string' ? JSON.parse(searchParams.pickup) : searchParams.pickup;
        if (p && p.name) setSelectedPickup(p);
      } catch (e) { }
    }
    if (searchParams.drop) {
      try {
        const d = typeof searchParams.drop === 'string' ? JSON.parse(searchParams.drop) : searchParams.drop;
        if (d && d.name) setSelectedDrop(d);
      } catch (e) { }
    }
    if (searchParams.fromVehicle === 'true') {
      if (searchParams.selectedRide) {
        setSelectedRide(searchParams.selectedRide as string);
      }
      if (searchParams.selectedDriverId) {
        const driverId = searchParams.selectedDriverId as string;
        setSelectedDriver({
          id: driverId,
          user_id: driverId,
          name: (searchParams.selectedDriverName as string) || 'Verified Driver',
          vehicle_model: (searchParams.selectedCarModel as string) || 'Standard Cab',
          vehicle_number: (searchParams.selectedCarNumber as string) || '',
          car_front_url: (searchParams.selectedCarPhoto as string) || '',
          daily_rate: searchParams.selectedDriverRate ? Number(searchParams.selectedDriverRate) : 1800,
        });
      }
      router.setParams({ fromVehicle: undefined });
    }
  }, [searchParams.fromVehicle, searchParams.selectedDriverId, searchParams.checkpoints, searchParams.pickup, searchParams.drop]);

  const checkpoints = React.useMemo(() => {
    return [
      { id: selectedPickup.id, name: selectedPickup.name, latitude: selectedPickup.latitude, longitude: selectedPickup.longitude, address: selectedPickup.address, isPickup: true },
      ...touristCheckpoints,
      { id: selectedDrop.id, name: selectedDrop.name, latitude: selectedDrop.latitude, longitude: selectedDrop.longitude, address: selectedDrop.address, isDrop: true },
    ];
  }, [selectedPickup, selectedDrop, touristCheckpoints]);


  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distance, setDistance] = useState<string>('0 km');
  const [duration, setDuration] = useState<string>('0 mins');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [isDestPickerOpen, setIsDestPickerOpen] = useState(false);


  const [travelHours, setTravelHours] = useState<number>(2.9);
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [quoteStatus, setQuoteStatus] = useState<'none' | 'pending' | 'quoted'>('quoted');
  const [quotedPrice, setQuotedPrice] = useState<number>(0);
  const [tripRequestId, setTripRequestId] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState(1800);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const colors = {
    background: isDark ? '#101014' : '#F4EFE6',
    surface: isDark ? '#1E1E24' : '#FAF7F0',
    surfaceCard: isDark ? '#16161B' : '#FAF7F0',
    textPrimary: isDark ? '#ffffff' : '#1E293B',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : '#64748B',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : '#E2DCD0',
    amber: isDark ? '#F5C518' : '#D97706',
    danger: '#EF4444',
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
    const queryLower = query.toLowerCase();
    const localMatches = liveDestinations
      .filter(p => p.name.toLowerCase().includes(queryLower) || (p.location || p.description || '').toLowerCase().includes(queryLower))
      .map(p => ({
        place_id: `local_${p.id}`,
        description: `${p.name}, ${p.location || ''}`,
        isLocal: true,
        presetData: {
          id: p.id,
          name: p.name,
          latitude: Number(p.latitude) || 12.9716,
          longitude: Number(p.longitude) || 77.5946,
          address: p.location || p.description || '',
        },
      }));
    setSuggestions(localMatches);
    setLoadingSearch(false);
  };

  const triggerSearchAndAddFirst = async (query: string) => {
    setLoadingSearch(true);
    const queryLower = query.toLowerCase();
    const localMatch = liveDestinations.find(
      p => p.name.toLowerCase().includes(queryLower) || (p.location || p.description || '').toLowerCase().includes(queryLower)
    );

    if (localMatch) {
      handleSelectPreset({
        id: localMatch.id,
        name: localMatch.name,
        latitude: Number(localMatch.latitude) || 12.9716,
        longitude: Number(localMatch.longitude) || 77.5946,
        address: localMatch.location || localMatch.description || '',
      });
    } else {
      Alert.alert(
        'Location Restricted',
        `"${query}" is not in our approved tourist places list. Please select one of our curated destinations.`
      );
    }
    setLoadingSearch(false);
  };

  // Select place from Google Suggestions & fetch Lat/Lng
  const handleSelectSuggestion = async (placeId: string, description: string) => {
    if (touristCheckpoints.length >= 4) {
      Alert.alert('Limit Reached ⚠️', 'You can only add up to 4 tourist places in a customer trip.');
      return;
    }
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
        setTouristCheckpoints(prev => [...prev, newPoint]);
      }
    } catch (e) {
      console.error('Error fetching place details:', e);
      Alert.alert('Search Error', 'Failed to fetch details for this location.');
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleSelectPreset = (preset: Checkpoint) => {
    if (touristCheckpoints.length >= 4) {
      Alert.alert('Limit Reached ⚠️', 'You can only add up to 4 tourist places in a customer trip.');
      return;
    }
    // Prevent duplicate entries of the same preset
    if (touristCheckpoints.find(c => c.name === preset.name)) {
      Alert.alert('Checkpoint Exists', `${preset.name} is already in your itinerary.`);
      return;
    }
    const newPoint: Checkpoint = {
      ...preset,
      id: Math.random().toString(),
    };
    setTouristCheckpoints(prev => [...prev, newPoint]);
    setSearchText('');
    setSuggestions([]);
  };

  const handleToggleLiveDestination = (dest: any) => {
    const destName = (dest.name || '').toLowerCase().trim();
    const isAlreadyAdded = touristCheckpoints.some(
      c => (c.name || '').toLowerCase().trim() === destName || String(c.id) === String(dest.id)
    );

    if (isAlreadyAdded) {
      setTouristCheckpoints(prev =>
        prev.filter(c => (c.name || '').toLowerCase().trim() !== destName && String(c.id) !== String(dest.id))
      );
    } else {
      if (touristCheckpoints.length >= 4) {
        Alert.alert('Limit Reached ⚠️', 'You can only add up to 4 tourist places in a customer trip.');
        return;
      }
      const newPoint: Checkpoint = {
        id: dest.id ? String(dest.id) : Math.random().toString(),
        name: dest.name,
        latitude: parseFloat(dest.latitude) || 15.3350,
        longitude: parseFloat(dest.longitude) || 76.4600,
        address: dest.location || 'Verified Tourist Place',
      };
      setTouristCheckpoints(prev => [...prev, newPoint]);
    }
  };


  // Checkpoint Reordering and Deleting for Tourist Places (Pickup & Drop positions are fixed)
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const nextList = [...touristCheckpoints];
    const temp = nextList[index];
    nextList[index] = nextList[index - 1];
    nextList[index - 1] = temp;
    setTouristCheckpoints(nextList);
  };

  const handleMoveDown = (index: number) => {
    if (index === touristCheckpoints.length - 1) return;
    const nextList = [...touristCheckpoints];
    const temp = nextList[index];
    nextList[index] = nextList[index + 1];
    nextList[index + 1] = temp;
    setTouristCheckpoints(nextList);
  };

  const handleDelete = (id: string) => {
    setTouristCheckpoints(prev => prev.filter(c => c.id !== id));
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
      setTravelHours(estDurationMinutes / 60);
    };

    const fetchRoute = async () => {
      setLoadingRoute(true);
      try {
        const roadResult = await fetchRoadRoute(checkpoints);
        if (roadResult && roadResult.coordinates && roadResult.coordinates.length >= 2) {
          setRouteCoords(roadResult.coordinates);
          setDistance(`${roadResult.distanceKm.toFixed(1)} km`);
          const h = Math.floor(roadResult.durationMinutes / 60);
          const m = Math.floor(roadResult.durationMinutes % 60);
          setDuration(`${h > 0 ? `${h}h ` : ''}${m}m`);
          setTravelHours(roadResult.durationMinutes / 60);
        } else {
          calculateHaversineFallback();
        }
      } catch (e) {
        console.error('fetchRoadRoute error in make-trip:', e);
        calculateHaversineFallback();
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [checkpoints]);

  const mapRef = useRef<any>(null);

  // Dynamic Map Camera framing as destinations/checkpoints are added or removed
  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => {
      const allCoords = routeCoords.length > 0
        ? routeCoords
        : checkpoints.map(c => ({ latitude: c.latitude, longitude: c.longitude })).filter(c => c && !isNaN(c.latitude) && !isNaN(c.longitude));

      if (allCoords.length >= 2 && mapRef.current.fitToCoordinates) {
        try {
          mapRef.current.fitToCoordinates(allCoords, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        } catch (e) {}
      } else if (allCoords.length === 1 && mapRef.current.animateToRegion) {
        try {
          mapRef.current.animateToRegion({
            latitude: allCoords[0].latitude,
            longitude: allCoords[0].longitude,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }, 800);
        } catch (e) {}
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [checkpoints, routeCoords]);

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

  const vehicleRatesPerDay = {
    '5seater': 1800,
    '7seater': 2600,
    '4x4jeep': 4200,
    'auto': 1200,
  };

  const selectedVehicleKey = selectedRide === '5seater' || selectedRide === '7seater' || selectedRide === '4x4jeep' || selectedRide === 'auto' ? selectedRide : '5seater';
  const defaultDayRate = vehicleRatesPerDay[selectedVehicleKey] || 1800;
  const defaultHourlyRate = adminState.vehicleRatesPerHour[selectedVehicleKey] || 150;

  const baseDayRate = selectedDriver?.daily_rate ? Number(selectedDriver.daily_rate) : defaultDayRate;
  const vehicleHourlyRate = selectedDriver?.hourly_addon_rate ? Number(selectedDriver.hourly_addon_rate) : defaultHourlyRate;

  const totalTripHours = travelHours + checkpoints.length;

  const getStartHourDec = () => {
    let h = bookingHour;
    if (bookingAmPm === 'PM' && bookingHour !== 12) {
      h += 12;
    } else if (bookingAmPm === 'AM' && bookingHour === 12) {
      h = 0;
    }
    return h + (bookingMinute / 60);
  };

  const startHourDec = getStartHourDec();
  const endHourDec = startHourDec + totalTripHours;

  let extraHours = 0;
  if (startHourDec < 6) {
    extraHours += (6 - startHourDec);
  }
  if (endHourDec > 18) {
    extraHours += (endHourDec - 18);
  }
  if (totalTripHours > 12 && extraHours < (totalTripHours - 12)) {
    extraHours = totalTripHours - 12;
  }

  const extraHoursRounded = Math.max(0, Math.ceil(extraHours));
  const extraAddonCharge = extraHoursRounded * vehicleHourlyRate;
  const baseComputedTripPrice = baseDayRate;
  const computedTripPrice = Math.max(0, baseComputedTripPrice - voucherDiscount);

  const handleApplyVoucher = async () => {
    const code = voucherText.trim().toUpperCase();
    if (!code) {
      Alert.alert('Empty Voucher', 'Please enter a voucher code first.');
      return;
    }
    setVoucherLoading(true);
    try {
      const res = await validateVoucherApi(code, 'custom_trip', baseComputedTripPrice);
      if (res.success && res.data) {
        setAppliedVoucher(res.data.code);
        setVoucherDiscount(res.data.discountAmount);
        Alert.alert('Voucher Applied! 🎉', res.message || `Saved ₹${res.data.discountAmount} on your custom trip!`);
      } else {
        Alert.alert('Voucher Error', res.message || 'Invalid or expired voucher code');
      }
    } catch (e: any) {
      Alert.alert('Voucher Error', e.message || 'Could not validate voucher');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherDiscount(0);
    setVoucherText('');
  };


  const handleConfirmTrip = () => {
    if (checkpoints.length < 2) {
      Alert.alert('Error', 'Please add at least 2 checkpoints to plan a trip.');
      return;
    }
    setQuotedPrice(computedTripPrice);
    setQuoteStatus('quoted');
  };

  const handleBookCustomRide = async () => {
    if (checkpoints.length < 2) {
      Alert.alert('Error', 'Please add at least 2 checkpoints to plan a trip.');
      return;
    }

    if (!adminState.instantBookingEnabled) {
      if (!bookingDate) {
        Alert.alert('Error', 'Please select a booking date.');
        return;
      }
      const selectedTime = new Date(bookingDate).getTime();
      const nowTime = new Date().getTime();
      const maxTime = nowTime + 15 * 24 * 60 * 60 * 1000;
      if (selectedTime < nowTime - 24 * 60 * 60 * 1000) {
        Alert.alert('Error', 'Cannot select a date in the past.');
        return;
      }
      if (selectedTime > maxTime) {
        Alert.alert('Booking Restricted', 'Pre-bookings can only be made up to 15 days in advance.');
        return;
      }
    }

    const pickup = checkpoints[0];
    const drop = checkpoints[checkpoints.length - 1];
    const stops = checkpoints.slice(1, -1);

    const isPreBooking = !adminState.instantBookingEnabled;
    const isInstant = adminState.instantBookingEnabled;
    const totalPrice = computedTripPrice;
    const driverName = selectedDriver?.name || 'Anil Gowda (Captain)';
    const driverId = selectedDriver?.id || 'd1';

    const session = getUserSessionSync();
    const customerId = session?.id || 't1';
    const customerName = session?.name || 'Tourist Client';

    const finalDate = isPreBooking ? bookingDate : 'Today (Instant)';
    const finalTime = isPreBooking ? `${bookingHour}:${bookingMinute.toString().padStart(2, '0')} ${bookingAmPm}` : 'Immediate';

    const tripReqId = `req_${Date.now()}`;
    const pickupName = checkpoints[0]?.name || 'Bengaluru Start';
    const dropName = checkpoints[checkpoints.length - 1]?.name || 'Destination';

    let calculatedScheduledTime = new Date().toISOString();
    if (isPreBooking && bookingDate) {
      try {
        let hours24 = bookingHour;
        if (bookingAmPm === 'PM' && hours24 < 12) {
          hours24 += 12;
        } else if (bookingAmPm === 'AM' && hours24 === 12) {
          hours24 = 0;
        }
        const dateParts = bookingDate.split('-');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1;
          const day = parseInt(dateParts[2], 10);
          const localDate = new Date(year, month, day, hours24, bookingMinute, 0);
          calculatedScheduledTime = localDate.toISOString();
        }
      } catch (e) {
        console.warn('Error parsing booking date:', e);
      }
    }

    const tripObject = {
      id: tripReqId,
      tripId: tripReqId,
      checkpoints: checkpoints.map(c => ({ name: c.name, latitude: c.latitude, longitude: c.longitude })),
      pickup: pickupName,
      pickupName: pickupName,
      drop: dropName,
      dropName: dropName,
      title: `Custom Trip: ${pickupName} → ${dropName}`,
      status: 'Pending',
      vehicle: selectedRide || '5seater',
      estimatedFare: totalPrice,
      amount: totalPrice,
      price: totalPrice,
      touristName: customerName,
      customerName: customerName,
      bookingType: isInstant ? 'INSTANT' : 'PRE_BOOKED',
      date: finalDate,
      time: finalTime,
      paymentMode: isPreBooking ? `Wallet Deposit (${prebookPayOption}%): ₹${prebookPayOption === '20' ? Math.round(totalPrice * 0.20) : totalPrice}` : (paymentMethod === 'cash' ? 'Cash' : 'UPI'),
      otp: '8240',
      endOtp: '4321',
    };

    if (isPreBooking) {
      // PRE-BOOKING MODE: Automatic Tourist Wallet Deposit (20% or 100%)
      const paymentAmount = prebookPayOption === '20' ? Math.round(totalPrice * 0.20) : totalPrice;
      const remainingAmount = totalPrice - paymentAmount;

      if (paymentAmount > 0) {
        const deductRes = await deductWalletApi({
          userId: customerId,
          amount: paymentAmount,
          description: `Pre-Booking Deposit (${prebookPayOption}%) for Custom Trip: ${pickupName} ➔ ${dropName}`,
        });

        if (!deductRes || !deductRes.success) {
          const errorMsg = deductRes?.message || 'Insufficient wallet balance. Please top up first.';
          Alert.alert('Payment Failed', errorMsg);
          return;
        }

        await submitWalletDeductionRequestApi({
          userId: customerId,
          userName: customerName,
          role: 'tourist',
          amount: paymentAmount,
          description: `Custom Trip Pre-Booking Deposit (${prebookPayOption}%) for ${pickupName} ➔ ${dropName}`,
        });
      }

      let isServerCreated = false;
      try {
        const destId = checkpoints.find((c: any) => c.id || c.destinationId || c.placeId)?.id || (checkpoints.find((c: any) => c.id || c.destinationId || c.placeId) as any)?.destinationId || null;
        const allDestIds = checkpoints.map((c: any) => String(c.id || c.destinationId || c.placeId || c.name)).filter(Boolean);

        const tripRes = await createTripApi({
          tripType: 'custom_trip',
          title: `Trip: ${pickupName} → ${dropName}`,
          customerId: customerId,
          customerName: customerName,
          driverOrGuideName: driverName,
          driverId: driverId,
          destinationId: destId || undefined,
          destinationIds: allDestIds,
          amount: totalPrice,
          paymentMode: `Wallet Deposit (${prebookPayOption}%): ₹${paymentAmount} (Bal ₹${remainingAmount})`,
          status: 'Pending',
          durationHours: totalTripHours,
          extraHours: 0,
          addonCharge: 0,
          bookingType: 'PRE_BOOKED',
          scheduledTime: calculatedScheduledTime,
          pickupName: pickupName,
          dropName: dropName,
          advanceDepositPaid: paymentAmount,
          remainingCashBalance: remainingAmount,
          voucherCode: appliedVoucher || undefined,
          voucherDiscount: voucherDiscount || 0,
        });

        if (tripRes?.data?.id || tripRes?.id) {
          const sId = String(tripRes?.data?.id || tripRes?.id);
          tripObject.id = sId;
          (tripObject as any).tripId = sId;
        }
        if (tripRes?.success) {
          isServerCreated = true;
        }
      } catch (e) {
        console.warn('Postgres DB creation error (using memory fallback):', e);
      }

      broadcastNewTripRequest(tripObject, isServerCreated);

      adminState.advanceBookings.unshift(tripObject as any);

      sendLocalNotification(
        '🗺️ Custom Trip Pre-Booking Confirmed!',
        `Your pre-booking from ${pickupName} to ${dropName} is confirmed with ₹${paymentAmount} wallet deposit. Assigned driver: ${driverName}.`
      );

      Alert.alert(
        '🎉 Pre-Booking Confirmed!',
        `Automatic Tourist Wallet Payment Successful!\nDeposit Amount: ₹${paymentAmount} (${prebookPayOption}% Deposit)\nRemaining Balance: ₹${remainingAmount}\nDriver: ${driverName}\nDate: ${finalDate} at ${finalTime}`,
        [{ text: 'View Trips', onPress: () => router.navigate('/(tabs)/trips') }]
      );
      return;
    }

    // INSTANT BOOKING MODE (Cash or UPI)
    const paymentLabel = paymentMethod === 'cash' ? `Cash (Full Payment ₹${totalPrice})` : `UPI (Full Payment ₹${totalPrice})`;

    let serverTripId = tripReqId;
    let generatedOtp = '8240';
    let generatedEndOtp = '4321';

    try {
      const bookRes = await bookTripApi({
        tripType: 'custom_trip',
        title: `Trip: ${pickupName} → ${dropName}`,
        customerId: customerId,
        customerName: customerName,
        pickupName: pickupName,
        dropName: dropName,
        amount: totalPrice,
        paymentMode: paymentLabel,
        bookingType: 'INSTANT',
        scheduledTime: calculatedScheduledTime,
        checkpoints: checkpoints.map(c => c.name || (c as any).checkpoint_name || (c as any).destinationId || c),
        destinationIds: checkpoints.map(c => String((c as any).destinationId || (c as any).id || c.name)).filter(Boolean),
        voucherCode: appliedVoucher || undefined,
        voucherDiscount: voucherDiscount || 0,
      } as any);

      if (bookRes && (bookRes.success || bookRes.data)) {
        serverTripId = bookRes.data?.id || bookRes.id || tripReqId;
        generatedOtp = bookRes.data?.otp || '8240';
        generatedEndOtp = bookRes.data?.end_otp || bookRes.data?.endOtp || '4321';
      }
    } catch (e) {
      console.warn('Postgres DB creation error (using memory fallback):', e);
    }

    const checkpointPlaceNames = checkpoints.map(c => (typeof c === 'string' ? c : (c.name || (c as any).checkpoint_name || 'Checkpoint'))).filter(Boolean);
    const destinationIdArray = checkpoints.map(c => (typeof c === 'object' && c !== null ? String((c as any).destinationId || (c as any).destination_id || (c as any).id || c.name) : String(c))).filter(Boolean);

    const instantTripObject = {
      id: serverTripId,
      tripId: serverTripId,
      checkpoints: checkpointPlaceNames,
      destination_ids: destinationIdArray,
      destinationIds: destinationIdArray,
      route: checkpointPlaceNames,
      pickup: pickupName,
      pickupName: pickupName,
      drop: dropName,
      dropName: dropName,
      title: `Custom Trip: ${pickupName} → ${dropName}`,
      status: 'Pending',
      vehicle: selectedRide || '5seater',
      estimatedFare: totalPrice,
      amount: totalPrice,
      price: totalPrice,
      touristName: customerName,
      customerName: customerName,
      bookingType: 'INSTANT',
      date: finalDate,
      time: finalTime,
      paymentMode: paymentLabel,
      otp: generatedOtp,
      endOtp: generatedEndOtp,
    };

    broadcastNewTripRequest(instantTripObject, true);

    if (!Array.isArray(adminState.userTrips)) {
      adminState.userTrips = [];
    }
    adminState.userTrips.unshift(instantTripObject as any);

    sendLocalNotification(
      '🚕 Instant Ride Requested!',
      `Searching for nearby driver for ${pickupName} ➔ ${dropName}...`
    );

    router.replace({
      pathname: '/ride-matching' as any,
      params: {
        tripId: serverTripId,
        pickupName: pickupName,
        pickupLat: checkpoints[0]?.latitude.toString() || '12.9716',
        pickupLng: checkpoints[0]?.longitude.toString() || '77.5946',
        dropName: dropName,
        dropLat: checkpoints[checkpoints.length - 1]?.latitude.toString() || '12.3053',
        dropLng: checkpoints[checkpoints.length - 1]?.longitude.toString() || '76.6394',
        stops: JSON.stringify(checkpoints.slice(1, -1).map(s => ({ name: s.name, latitude: s.latitude, longitude: s.longitude }))),
        price: totalPrice.toString(),
        paymentId: 'PAY_' + Date.now(),
        type: 'custom_trip',
        vehicle: selectedRide || '5seater',
        paymentMode: paymentLabel,
        passengerCount: passengerCount.toString(),
        customerName: customerName,
        touristName: customerName,
        date: finalDate,
        time: finalTime,
        driverId: selectedDriver?.id || '',
        otp: generatedOtp,
        endOtp: generatedEndOtp,
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          setTouristCheckpoints([
            { id: 'dest-1', name: 'Virupaksha Temple', latitude: 15.3350, longitude: 76.4600, address: 'Hampi, Karnataka' },
            { id: 'dest-2', name: 'Vittala Temple Stone Chariot', latitude: 15.3370, longitude: 76.4760, address: 'Hampi, Karnataka' },
          ]);
          setSelectedPickup(PRESET_PICKUP_DROP_LOCATIONS[0]);
          setSelectedDrop(PRESET_PICKUP_DROP_LOCATIONS[1]);
          setSelectedDriver(null);
          if (router.canGoBack()) {
            router.back();
          } else {
            router.navigate('/(tabs)');
          }
        }}>
          <MaterialIcons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Custom Trip Builder</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        ref={mainScrollViewRef}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: verticalScale(140) }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        showsVerticalScrollIndicator={false}
      >
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
          <MapView
            ref={mapRef}
            provider="google"
            style={StyleSheet.absoluteFillObject}
            customMapStyle={isDark ? [] : darkMapStyle}
            initialRegion={{
              latitude: checkpoints[0]?.latitude || 12.9716,
              longitude: checkpoints[0]?.longitude || 77.5946,
              latitudeDelta: 0.8,
              longitudeDelta: 0.8,
            }}
          >
            {/* Dynamic Checkpoint Markers */}
            {checkpoints.map((c, index) => {
              let pinColor = '#3B82F6'; // Middle Stop (Blue)
              let stopLetter = String.fromCharCode(65 + index);
              if (index === 0) pinColor = '#10B981'; // Start / Pickup (Green)
              if (index === checkpoints.length - 1 && checkpoints.length > 1) pinColor = '#EF4444'; // End / Drop (Red)

              return (
                <Marker
                  key={`marker_${c.id || index}_${c.latitude}_${c.longitude}`}
                  coordinate={{ latitude: c.latitude, longitude: c.longitude }}
                  title={`${stopLetter}. ${c.name}`}
                  description={c.address || `Stop ${stopLetter}`}
                  pinColor={pinColor}
                />
              );
            })}

            {/* Dynamic Real-World Road Polyline */}
            {routeCoords.length > 0 && (
              <>
                <Polyline
                  coordinates={routeCoords}
                  strokeColor="rgba(0, 0, 0, 0.45)"
                  strokeWidth={scale(6.5)}
                />
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={colors.amber}
                  strokeWidth={scale(3.5)}
                />
              </>
            )}
          </MapView>

          {loadingRoute && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="small" color={colors.amber} />
              <Text style={styles.loadingRouteText}>Updating Road Route...</Text>
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

        {/* Select Admin Tourist Places Master Button & Search Bar */}
        <View style={{ marginBottom: verticalScale(14), gap: verticalScale(8) }}>
          {/* <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.amber,
              borderRadius: scale(14),
              paddingVertical: verticalScale(10),
              gap: scale(6),
            }}
            onPress={() => setIsDestPickerOpen(true)}
          >
            <MaterialIcons name="stars" size={scale(20)} color="#101010" />
            <Text style={{ color: '#101010', fontSize: moderateFontScale(13), fontWeight: '900' }}>
              Select Admin Tourist Places ({liveDestinations.length})
            </Text>
          </TouchableOpacity> */}

          <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, width: '100%', flex: undefined }]}>
            <MaterialIcons name="search" size={scale(20)} color={colors.amber} style={styles.searchIcon} />
            <TextInput
              placeholder="Search Admin Tourist Places..."
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={searchText}
              onChangeText={setSearchText}
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => {
                const matched = liveDestinations.filter(d =>
                  d.name.toLowerCase().includes(searchText.toLowerCase()) ||
                  (d.location && d.location.toLowerCase().includes(searchText.toLowerCase()))
                );
                if (matched.length > 0) {
                  handleToggleLiveDestination(matched[0]);
                } else {
                  Alert.alert(
                    'Restricted Location',
                    'Only Tourist Places created by Admin in Destination Master can be added to your Custom Trip. Outside locations cannot be added.'
                  );
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


        {/* Admin Panel Verified Tourist Places Dropdown & Google Places Suggestions */}
        {(liveDestinations.length > 0 || suggestions.length > 0) && searchText.length > 0 && (
          <View style={[styles.suggestionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Live Admin Master Destinations */}
            {liveDestinations
              .filter(d =>
                d.name.toLowerCase().includes(searchText.toLowerCase()) ||
                (d.location && d.location.toLowerCase().includes(searchText.toLowerCase()))
              )
              .map((dest) => {
                const isAdded = touristCheckpoints.some(
                  c => (c.name || '').toLowerCase().trim() === (dest.name || '').toLowerCase().trim() || String(c.id) === String(dest.id)
                );
                return (
                  <TouchableOpacity
                    key={`admin-${dest.id}`}
                    style={[
                      styles.suggestionItem,
                      {
                        borderBottomColor: colors.border,
                        backgroundColor: isAdded ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                      }
                    ]}
                    onPress={() => handleToggleLiveDestination(dest)}
                  >
                    <View style={styles.suggestionLeft}>
                      <MaterialIcons name="stars" size={scale(18)} color={isAdded ? '#EF4444' : colors.amber} style={{ marginRight: scale(10) }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.suggestionText, { color: isAdded ? '#EF4444' : colors.textPrimary, fontWeight: 'bold' }]} numberOfLines={1}>
                          {dest.name}
                        </Text>
                        <Text style={{ color: isAdded ? '#EF4444' : colors.textMuted, fontSize: moderateFontScale(10) }} numberOfLines={1}>
                          {isAdded ? '✓ ADDED TO ITINERARY (TAP TO REMOVE)' : `📍 ${dest.location || 'Verified Tourist Place'}`}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons
                      name={isAdded ? "remove-circle" : "add-circle"}
                      size={scale(22)}
                      color={isAdded ? "#EF4444" : colors.amber}
                    />
                  </TouchableOpacity>
                );
              })}

            {/* Google Places Autocomplete Suggestions */}
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


        {/* PICKUP & DROP LOCATION SELECTOR FOR CUSTOM TRIP BUILDER */}
        <View style={{ marginVertical: verticalScale(12), backgroundColor: colors.surface, padding: scale(14), borderRadius: scale(16), borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.amber, fontSize: moderateFontScale(13), fontWeight: '800', marginBottom: verticalScale(10) }}>
            📍 Select Pickup & Drop Locations (Stations / Hotels)
          </Text>

          {/* Pickup Location Dropdown Button */}
          <View style={{ marginBottom: verticalScale(12) }}>
            <Text style={{ color: colors.amber, fontSize: moderateFontScale(11), fontWeight: '800', letterSpacing: 0.5, marginBottom: verticalScale(6) }}>
              PICKUP LOCATION (START POINT)
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                paddingHorizontal: scale(14),
                paddingVertical: verticalScale(12),
                borderRadius: scale(12),
                borderWidth: 1.5,
                borderColor: colors.amber,
              }}
              onPress={() => {
                setIsPickupModalOpen(!isPickupModalOpen);
                setIsDropModalOpen(false);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10), flex: 1 }}>
                <MaterialIcons name="trip-origin" size={scale(20)} color={colors.amber} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(13), fontWeight: '800' }}>
                    {selectedPickup.name}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10.5) }} numberOfLines={1}>
                    {selectedPickup.address}
                  </Text>
                </View>
              </View>
              <MaterialIcons name={isPickupModalOpen ? "arrow-drop-up" : "arrow-drop-down"} size={scale(24)} color={colors.amber} />
            </TouchableOpacity>

            {/* Inline Select Dropdown List */}
            {isPickupModalOpen && (
              <View style={{
                marginTop: verticalScale(6),
                backgroundColor: isDark ? '#1C1C22' : '#FFFFFF',
                borderRadius: scale(12),
                borderWidth: 1.5,
                borderColor: colors.amber,
                padding: scale(10),
                maxHeight: verticalScale(220),
                elevation: 5,
              }}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, marginTop: 0, marginBottom: verticalScale(8), height: scale(38) }]}>
                  <MaterialIcons name="search" size={scale(18)} color={colors.amber} style={styles.searchIcon} />
                  <TextInput
                    placeholder="Search pickup location..."
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'}
                    style={[styles.searchInput, { color: colors.textPrimary, fontSize: moderateFontScale(12) }]}
                    value={pickupSearchQuery}
                    onChangeText={setPickupSearchQuery}
                  />
                </View>

                <ScrollView nestedScrollEnabled style={{ maxHeight: verticalScale(160) }} showsVerticalScrollIndicator={true}>
                  {stationList
                    .filter(loc => !pickupSearchQuery.trim() || loc.name.toLowerCase().includes(pickupSearchQuery.toLowerCase()) || loc.address.toLowerCase().includes(pickupSearchQuery.toLowerCase()))
                    .map((loc, idx) => {
                      const isSelected = selectedPickup.id === loc.id;
                      return (
                        <TouchableOpacity
                          key={`p_drop_${loc.id}_${idx}`}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: verticalScale(10),
                            paddingHorizontal: scale(10),
                            borderRadius: scale(8),
                            backgroundColor: isSelected ? 'rgba(245, 197, 24, 0.15)' : 'transparent',
                            marginBottom: 2,
                          }}
                          onPress={() => {
                            setSelectedPickup(loc);
                            setIsPickupModalOpen(false);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), flex: 1 }}>
                            <MaterialIcons name="trip-origin" size={scale(16)} color={isSelected ? colors.amber : colors.textMuted} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: isSelected ? colors.amber : colors.textPrimary, fontWeight: isSelected ? '800' : '600', fontSize: moderateFontScale(12.5) }}>
                                {loc.name}
                              </Text>
                              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10) }} numberOfLines={1}>
                                {loc.address}
                              </Text>
                            </View>
                          </View>
                          {isSelected && <MaterialIcons name="check" size={scale(18)} color={colors.amber} />}
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Drop Location Dropdown Button */}
          <View style={{ marginBottom: verticalScale(4) }}>
            <Text style={{ color: colors.amber, fontSize: moderateFontScale(11), fontWeight: '800', letterSpacing: 0.5, marginBottom: verticalScale(6) }}>
              DROP LOCATION (END POINT)
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                paddingHorizontal: scale(14),
                paddingVertical: verticalScale(12),
                borderRadius: scale(12),
                borderWidth: 1.5,
                borderColor: '#EF4444',
              }}
              onPress={() => {
                setIsDropModalOpen(!isDropModalOpen);
                setIsPickupModalOpen(false);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10), flex: 1 }}>
                <MaterialIcons name="location-on" size={scale(20)} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(13), fontWeight: '800' }}>
                    {selectedDrop.name}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10.5) }} numberOfLines={1}>
                    {selectedDrop.address}
                  </Text>
                </View>
              </View>
              <MaterialIcons name={isDropModalOpen ? "arrow-drop-up" : "arrow-drop-down"} size={scale(24)} color="#EF4444" />
            </TouchableOpacity>

            {/* Inline Select Dropdown List */}
            {isDropModalOpen && (
              <View style={{
                marginTop: verticalScale(6),
                backgroundColor: isDark ? '#1C1C22' : '#FFFFFF',
                borderRadius: scale(12),
                borderWidth: 1.5,
                borderColor: '#EF4444',
                padding: scale(10),
                maxHeight: verticalScale(220),
                elevation: 5,
              }}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border, marginTop: 0, marginBottom: verticalScale(8), height: scale(38) }]}>
                  <MaterialIcons name="search" size={scale(18)} color="#EF4444" style={styles.searchIcon} />
                  <TextInput
                    placeholder="Search drop location..."
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'}
                    style={[styles.searchInput, { color: colors.textPrimary, fontSize: moderateFontScale(12) }]}
                    value={dropSearchQuery}
                    onChangeText={setDropSearchQuery}
                  />
                </View>

                <ScrollView nestedScrollEnabled style={{ maxHeight: verticalScale(160) }} showsVerticalScrollIndicator={true}>
                  {stationList
                    .filter(loc => !dropSearchQuery.trim() || loc.name.toLowerCase().includes(dropSearchQuery.toLowerCase()) || loc.address.toLowerCase().includes(dropSearchQuery.toLowerCase()))
                    .map((loc, idx) => {
                      const isSelected = selectedDrop.id === loc.id;
                      return (
                        <TouchableOpacity
                          key={`d_drop_${loc.id}_${idx}`}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: verticalScale(10),
                            paddingHorizontal: scale(10),
                            borderRadius: scale(8),
                            backgroundColor: isSelected ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                            marginBottom: 2,
                          }}
                          onPress={() => {
                            setSelectedDrop(loc);
                            setIsDropModalOpen(false);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), flex: 1 }}>
                            <MaterialIcons name="location-on" size={scale(16)} color={isSelected ? '#EF4444' : colors.textMuted} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: isSelected ? '#EF4444' : colors.textPrimary, fontWeight: isSelected ? '800' : '600', fontSize: moderateFontScale(12.5) }}>
                                {loc.name}
                              </Text>
                              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10) }} numberOfLines={1}>
                                {loc.address}
                              </Text>
                            </View>
                          </View>
                          {isSelected && <MaterialIcons name="check" size={scale(18)} color="#EF4444" />}
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Side-by-Side Content Container */}
        <View style={styles.sideBySideRow}>
          {/* Left Column: Route Checklist */}
          <View style={styles.leftColumn}>
            <View style={styles.columnHeader}>
              <MaterialIcons name="playlist-add-check" size={scale(18)} color={colors.amber} style={{ marginRight: scale(4) }} />
              <Text style={[styles.columnTitle, { color: colors.amber }]} numberOfLines={1}>Route Itinerary</Text>
            </View>
            <Text style={[styles.columnSub, { color: colors.textMuted }]} numberOfLines={1}>Reorder tourist places</Text>

            <View style={styles.itineraryWrapper}>
              {/* FIXED PICKUP NODE AT START */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineNode, { backgroundColor: colors.amber }]}>
                    <MaterialIcons name="trip-origin" size={scale(12)} color="#101014" />
                  </View>
                  <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                </View>

                <View style={[styles.stopCardCompact, { backgroundColor: colors.surface, borderColor: colors.amber, borderWidth: 1.5 }]}>
                  <View style={styles.stopInfo}>
                    <Text style={[styles.stopName, { color: colors.amber, fontWeight: '800' }]} numberOfLines={1}>
                      {selectedPickup.name}
                    </Text>
                    <Text style={[styles.stopRoleText, { color: colors.amber }]}>
                      PICKUP (START)
                    </Text>
                  </View>
                </View>
              </View>

              {/* MIDDLE TOURIST PLACES (CHECKPOINTS) */}
              {touristCheckpoints.map((checkpoint, index) => {
                const isFirstTourist = index === 0;
                const isLastTourist = index === touristCheckpoints.length - 1;

                return (
                  <View key={`tourist_${checkpoint.id || index}_${index}`} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineNode, { backgroundColor: '#3b82f6' }]}>
                        <Text style={styles.nodeChar}>{String.fromCharCode(65 + index)}</Text>
                      </View>
                      <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                    </View>

                    <View style={[styles.stopCardCompact, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.stopInfo}>
                        <Text style={[styles.stopName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {checkpoint.name}
                        </Text>

                      </View>

                      {/* Reorder and Delete controls for Tourist Places */}
                      <View style={styles.controlsCol}>
                        <View style={styles.arrowRow}>
                          <TouchableOpacity
                            style={[styles.controlBtnCompact, isFirstTourist && styles.controlBtnDisabled, { borderColor: colors.border }]}
                            onPress={() => handleMoveUp(index)}
                            disabled={isFirstTourist}
                          >
                            <MaterialIcons name="arrow-upward" size={scale(12)} color={isFirstTourist ? colors.border : colors.textPrimary} />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.controlBtnCompact, isLastTourist && styles.controlBtnDisabled, { borderColor: colors.border }]}
                            onPress={() => handleMoveDown(index)}
                            disabled={isLastTourist}
                          >
                            <MaterialIcons name="arrow-downward" size={scale(12)} color={isLastTourist ? colors.border : colors.textPrimary} />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={styles.deleteBtnCompact}
                          onPress={() => handleDelete(checkpoint.id)}
                        >
                          <MaterialIcons name="delete" size={scale(14)} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* ADD TOURIST PLACES BUTTON CARD */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: scale(8),
                  backgroundColor: 'rgba(245,197,24,0.12)',
                  borderColor: colors.amber,
                  borderWidth: 1.5,
                  borderStyle: 'dashed',
                  paddingVertical: verticalScale(12),
                  paddingHorizontal: scale(14),
                  borderRadius: scale(14),
                  marginVertical: verticalScale(8),
                }}
                onPress={() => setIsDestPickerOpen(true)}
              >
                <MaterialIcons name="add-circle-outline" size={scale(20)} color={colors.amber} />
                <Text style={{ color: colors.amber, fontWeight: '800', fontSize: moderateFontScale(13) }}>
                  Add Places to Visit {touristCheckpoints.length > 0 ? `(${touristCheckpoints.length}/4)` : ''}
                </Text>
              </TouchableOpacity>

              {/* FIXED DROP NODE AT END */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineNode, { backgroundColor: '#ef4444' }]}>
                    <MaterialIcons name="location-on" size={scale(12)} color="#FFFFFF" />
                  </View>
                </View>

                <View style={[styles.stopCardCompact, { backgroundColor: colors.surface, borderColor: '#ef4444', borderWidth: 1.5 }]}>
                  <View style={styles.stopInfo}>
                    <Text style={[styles.stopName, { color: '#ef4444', fontWeight: '800' }]} numberOfLines={1}>
                      {selectedDrop.name}
                    </Text>
                    <Text style={[styles.stopRoleText, { color: '#ef4444' }]}>
                      DROP (END)
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Step 2: Select Vehicle & Driver from Fleet Showcase */}
        {selectedDriver === null ? (
          <View style={[styles.pendingQuoteCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border, padding: scale(16), borderRadius: scale(20), marginTop: verticalScale(16) }]}>
            <Text style={{ color: colors.amber, fontWeight: '800', fontSize: moderateFontScale(14), marginBottom: verticalScale(6) }}>
              2. Select Vehicle for Trip
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), marginBottom: verticalScale(14) }}>
              Choose a car from our Fleet Showcase to view fare breakdown and complete pre-booking.
            </Text>

            <TouchableOpacity
              style={{
                backgroundColor: colors.amber,
                borderRadius: scale(14),
                paddingVertical: verticalScale(14),
                paddingHorizontal: scale(16),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: scale(10),
              }}
              onPress={() => {
                router.push({
                  pathname: '/cars',
                  params: {
                    mode: 'custom_trip',
                    checkpoints: JSON.stringify(touristCheckpoints),
                    pickup: JSON.stringify(selectedPickup),
                    drop: JSON.stringify(selectedDrop),
                  }
                });
              }}
            >
              <MaterialIcons name="directions-car" size={scale(22)} color="#101014" />
              <Text style={{ color: '#101014', fontWeight: '900', fontSize: moderateFontScale(14) }}>
                Choose Car / Select Vehicle
              </Text>
              <MaterialIcons name="arrow-forward" size={scale(20)} color="#101014" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.pendingQuoteCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border, padding: scale(16), borderRadius: scale(20), marginTop: verticalScale(16) }]}>
            <Text style={{ color: colors.amber, fontWeight: '800', fontSize: moderateFontScale(14), marginBottom: verticalScale(10) }}>
              2. Selected Vehicle
            </Text>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(245, 197, 24, 0.08)',
              borderWidth: 1.5,
              borderColor: colors.amber,
              borderRadius: scale(14),
              padding: scale(12),
            }}>
              <View style={{ width: scale(60), height: scale(60), borderRadius: scale(10), backgroundColor: '#212129', overflow: 'hidden', marginRight: scale(12), borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                {selectedDriver.car_front_url || selectedDriver.photo_url ? (
                  <Image source={{ uri: selectedDriver.car_front_url || selectedDriver.photo_url }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                ) : (
                  <MaterialIcons name="directions-car" size={scale(32)} color={colors.amber} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(14), fontWeight: '800' }} numberOfLines={1}>
                  {selectedDriver.vehicle_model || 'Standard AC Cab'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), marginTop: 2 }}>
                  Driver: {selectedDriver.name} ({selectedDriver.vehicle_number || 'KA-01-EX-0000'})
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: verticalScale(4) }}>
                  <Text style={{ color: colors.amber, fontSize: moderateFontScale(13), fontWeight: '900' }}>
                    ₹{baseDayRate}/Day
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10.5) }}>
                    (+ ₹{vehicleHourlyRate}/hr addon)
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(245, 197, 24, 0.2)',
                  paddingVertical: scale(6),
                  paddingHorizontal: scale(10),
                  borderRadius: scale(8),
                  borderWidth: 1,
                  borderColor: colors.amber,
                }}
                onPress={() => {
                  router.push({
                    pathname: '/cars',
                    params: { mode: 'custom_trip', selectedRide: selectedDriver.vehicle_type || '5seater', checkpoints: JSON.stringify(checkpoints) }
                  });
                }}
              >
                <Text style={{ color: colors.amber, fontSize: moderateFontScale(10.5), fontWeight: '800' }}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Fare Breakdown & Booking Section (Rendered ONLY after car selection) */}
        {selectedDriver && (
          <View style={[styles.pendingQuoteCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border, padding: scale(16), borderRadius: scale(20), marginTop: verticalScale(16) }]}>
            <Text style={{ color: colors.amber, fontWeight: '800', fontSize: moderateFontScale(14), marginBottom: verticalScale(10) }}>
              3. Custom Trip Fare & Booking
            </Text>

            {/* Prebooking Date Time Pickers (Active when adminState.instantBookingEnabled is false) */}
            {!adminState.instantBookingEnabled && (
              <View style={{ marginBottom: verticalScale(12) }}>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700', marginBottom: verticalScale(6) }}>Select Pre-Booking Date</Text>

                {/* Horizontal Date Picker */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: verticalScale(10) }}>
                  {dateOptions.map((opt) => {
                    const isSelected = bookingDate === opt.dateStr;
                    return (
                      <TouchableOpacity
                        key={opt.dateStr}
                        style={{
                          width: scale(52),
                          height: verticalScale(54),
                          borderRadius: scale(10),
                          borderWidth: 1.5,
                          borderColor: isSelected ? colors.amber : colors.border,
                          backgroundColor: isSelected ? colors.amber : 'rgba(255,255,255,0.03)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: scale(8),
                        }}
                        onPress={() => setBookingDate(opt.dateStr)}
                      >
                        <Text style={{ fontSize: moderateFontScale(8), fontWeight: '800', color: isSelected ? '#101014' : colors.textMuted }}>{opt.dayName.toUpperCase()}</Text>
                        <Text style={{ fontSize: moderateFontScale(13), fontWeight: '900', color: isSelected ? '#101014' : colors.textPrimary, marginVertical: verticalScale(2) }}>{opt.dayNum}</Text>
                        <Text style={{ fontSize: moderateFontScale(8), fontWeight: '800', color: isSelected ? '#101014' : colors.textMuted }}>{opt.monthName.toUpperCase()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700', marginBottom: verticalScale(8) }}>Select Booking Time</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', padding: scale(8), borderRadius: scale(12), borderWidth: 1.5, borderColor: colors.border }}>
                  {/* Hour Selection */}
                  <View style={{ alignItems: 'center', flex: 1.2 }}>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(9), fontWeight: '800', marginBottom: verticalScale(4) }}>HOUR</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                      <TouchableOpacity
                        style={{ width: scale(26), height: scale(26), borderRadius: scale(6), backgroundColor: '#3A3A40', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setBookingHour(prev => prev === 1 ? 12 : prev - 1)}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: moderateFontScale(14) }}>-</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: moderateFontScale(15), fontWeight: '900', color: colors.textPrimary, width: scale(22), textAlign: 'center' }}>
                        {bookingHour < 10 ? '0' + bookingHour : bookingHour}
                      </Text>
                      <TouchableOpacity
                        style={{ width: scale(26), height: scale(26), borderRadius: scale(6), backgroundColor: '#3A3A40', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setBookingHour(prev => prev === 12 ? 1 : prev + 1)}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: moderateFontScale(14) }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(18), fontWeight: '900' }}>:</Text>

                  {/* Minute Selection */}
                  <View style={{ alignItems: 'center', flex: 1.2 }}>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(9), fontWeight: '800', marginBottom: verticalScale(4) }}>MINUTE</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                      <TouchableOpacity
                        style={{ width: scale(26), height: scale(26), borderRadius: scale(6), backgroundColor: '#3A3A40', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setBookingMinute(prev => prev === 0 ? 55 : prev - 5)}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: moderateFontScale(14) }}>-</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: moderateFontScale(15), fontWeight: '900', color: colors.textPrimary, width: scale(22), textAlign: 'center' }}>
                        {bookingMinute < 10 ? '0' + bookingMinute : bookingMinute}
                      </Text>
                      <TouchableOpacity
                        style={{ width: scale(26), height: scale(26), borderRadius: scale(6), backgroundColor: '#3A3A40', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setBookingMinute(prev => prev === 55 ? 0 : prev + 5)}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: moderateFontScale(14) }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* AM/PM Switch */}
                  <View style={{ flexDirection: 'row', gap: scale(4), marginLeft: scale(10), flex: 1.3 }}>
                    {(['AM', 'PM'] as const).map((period) => {
                      const isSelected = bookingAmPm === period;
                      return (
                        <TouchableOpacity
                          key={period}
                          style={{
                            flex: 1,
                            height: scale(28),
                            borderRadius: scale(6),
                            borderWidth: 1.5,
                            borderColor: isSelected ? colors.amber : colors.border,
                            backgroundColor: isSelected ? 'rgba(245, 197, 24, 0.1)' : 'transparent',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                          onPress={() => setBookingAmPm(period)}
                        >
                          <Text style={{ color: isSelected ? colors.amber : colors.textPrimary, fontSize: moderateFontScale(11), fontWeight: '900' }}>
                            {period}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {/* Passenger counter */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(12) }}>
              <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700' }}>Passenger Count</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12) }}>
                <TouchableOpacity
                  style={{ width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor: '#3A3A40', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                >
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>-</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: moderateFontScale(14), fontWeight: '800', color: colors.textPrimary }}>{passengerCount}</Text>
                <TouchableOpacity
                  style={{ width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor: '#3A3A40', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setPassengerCount(Math.min(10, passengerCount + 1))}
                >
                  <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: verticalScale(8) }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6) }}>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Base Travel Duration</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{travelHours.toFixed(1)} hours</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6) }}>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Checkpoints Addon ({checkpoints.length} stops)</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>+{checkpoints.length} hours</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6) }}>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Total Trip Duration</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{totalTripHours.toFixed(1)} hours</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6) }}>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Base Vehicle Rate</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>₹{baseDayRate}/Day</Text>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: verticalScale(8) }} />

            {/* Voucher Promo Code Input Row */}
            <View style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: scale(12),
              padding: scale(10),
              marginVertical: verticalScale(6),
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                <MaterialIcons name="local-offer" size={scale(18)} color={colors.amber} />
                <TextInput
                  style={{
                    flex: 1,
                    height: verticalScale(36),
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F7',
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: scale(8),
                    paddingHorizontal: scale(10),
                    color: colors.textPrimary,
                    fontSize: moderateFontScale(12),
                    fontWeight: '700',
                  }}
                  placeholder="PROMO / VOUCHER CODE"
                  placeholderTextColor={colors.textMuted}
                  value={voucherText}
                  onChangeText={setVoucherText}
                  autoCapitalize="characters"
                  editable={!appliedVoucher}
                  onFocus={() => {
                    setTimeout(() => {
                      mainScrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 250);
                  }}
                />
                {appliedVoucher ? (
                  <TouchableOpacity
                    onPress={handleRemoveVoucher}
                    style={{
                      paddingHorizontal: scale(12),
                      height: verticalScale(36),
                      backgroundColor: '#EF4444',
                      borderRadius: scale(8),
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: moderateFontScale(11) }}>Remove</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleApplyVoucher}
                    disabled={voucherLoading}
                    style={{
                      paddingHorizontal: scale(14),
                      height: verticalScale(36),
                      backgroundColor: colors.amber,
                      borderRadius: scale(8),
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {voucherLoading ? (
                      <ActivityIndicator size="small" color="#101010" />
                    ) : (
                      <Text style={{ color: '#101010', fontWeight: '900', fontSize: moderateFontScale(11) }}>Apply</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
              {appliedVoucher && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: verticalScale(6), gap: scale(4) }}>
                  <MaterialIcons name="check-circle" size={scale(14)} color="#10B981" />
                  <Text style={{ color: '#10B981', fontSize: moderateFontScale(11), fontWeight: '700' }}>
                    Voucher {appliedVoucher} applied! Saved ₹{voucherDiscount}
                  </Text>
                </View>
              )}
            </View>

            {/* 30% Pre-booking Advance Breakdown Card */}
            <View style={{
              backgroundColor: isDark ? 'rgba(245, 197, 24, 0.08)' : 'rgba(245, 197, 24, 0.1)',
              borderWidth: 1.5,
              borderColor: colors.amber,
              borderRadius: scale(12),
              padding: scale(12),
              marginTop: verticalScale(6),
              marginBottom: verticalScale(8),
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6) }}>
                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>Total Estimated Fare</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                  {voucherDiscount > 0 && (
                    <Text style={{ color: colors.textMuted, textDecorationLine: 'line-through', fontSize: moderateFontScale(11) }}>₹{baseComputedTripPrice}</Text>
                  )}
                  <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: moderateFontScale(12) }}>₹{computedTripPrice}</Text>
                </View>
              </View>

              {!adminState.instantBookingEnabled ? (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6) }}>
                    <Text style={{ color: colors.amber, fontSize: moderateFontScale(12), fontWeight: '800' }}>Pre-Booking Fees</Text>
                    <Text style={{ color: colors.amber, fontWeight: '900', fontSize: moderateFontScale(15) }}>₹{Math.round(computedTripPrice * 0.20)}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>Remaining Balance at Trip</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: moderateFontScale(11) }}>₹{computedTripPrice - Math.round(computedTripPrice * 0.20)}</Text>
                  </View>
                </>
              ) : (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.amber, fontSize: moderateFontScale(12), fontWeight: '800' }}>Full Payment (Pay Now)</Text>
                  <Text style={{ color: colors.amber, fontWeight: '900', fontSize: moderateFontScale(15) }}>₹{computedTripPrice}</Text>
                </View>
              )}
            </View>

            {/* Note about 6 AM - 6 PM policy */}
            <View style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9F9FB',
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: scale(10),
              padding: scale(10),
              marginTop: verticalScale(4),
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: scale(6)
            }}>
              <MaterialIcons name="info" size={scale(16)} color={colors.amber} style={{ marginTop: 2 }} />
              <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(11), flex: 1, lineHeight: moderateFontScale(15), fontWeight: '500' }}>
                Note: Standard vehicle booking package is valid from <Text style={{ fontWeight: '700', color: colors.amber }}>6:00 AM to 6:00 PM</Text>. Bookings starting before 6:00 AM or ending after 6:00 PM will incur an extra charge of <Text style={{ fontWeight: '700' }}>₹{vehicleHourlyRate}/hr</Text>.
              </Text>
            </View>

            {/* Payment & Deposit Options */}
            {bookingMode === 'prebook' ? (
              <View style={{ marginTop: verticalScale(10), marginBottom: verticalScale(12) }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: moderateFontScale(12), marginBottom: verticalScale(6) }}>
                  Pre-Booking Wallet Deposit Option:
                </Text>
                <View style={{ flexDirection: 'row', gap: scale(10), marginBottom: verticalScale(8) }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: verticalScale(10),
                      borderRadius: scale(10),
                      borderWidth: 1.5,
                      borderColor: prebookPayOption === '20' ? colors.amber : colors.border,
                      backgroundColor: prebookPayOption === '20' ? 'rgba(245, 197, 24, 0.15)' : 'transparent',
                      alignItems: 'center',
                    }}
                    onPress={() => setPrebookPayOption('20')}
                  >
                    <Text style={{ fontSize: moderateFontScale(11), fontWeight: '900', color: prebookPayOption === '20' ? colors.amber : colors.textPrimary }}>
                      20% Minimum Deposit
                    </Text>
                    <Text style={{ fontSize: moderateFontScale(9), color: colors.textMuted, marginTop: 2 }}>
                      ₹{Math.round(computedTripPrice * 0.20)} Now
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: verticalScale(10),
                      borderRadius: scale(10),
                      borderWidth: 1.5,
                      borderColor: prebookPayOption === '100' ? colors.amber : colors.border,
                      backgroundColor: prebookPayOption === '100' ? 'rgba(245, 197, 24, 0.15)' : 'transparent',
                      alignItems: 'center',
                    }}
                    onPress={() => setPrebookPayOption('100')}
                  >
                    <Text style={{ fontSize: moderateFontScale(11), fontWeight: '900', color: prebookPayOption === '100' ? colors.amber : colors.textPrimary }}>
                      100% Full Payment
                    </Text>
                    <Text style={{ fontSize: moderateFontScale(9), color: colors.textMuted, marginTop: 2 }}>
                      ₹{computedTripPrice} Now
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={{ color: colors.amber, fontSize: moderateFontScale(10), fontWeight: '700' }}>
                  💳 Pre-booking automatically deducts deposit from your Tourist Wallet.
                </Text>
              </View>
            ) : (
              <View style={{ marginTop: verticalScale(10), marginBottom: verticalScale(12) }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: moderateFontScale(12), marginBottom: verticalScale(6) }}>
                  Select Instant Payment Method
                </Text>
                <View style={{ flexDirection: 'row', gap: scale(8) }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: scale(6),
                      paddingVertical: verticalScale(10),
                      borderRadius: scale(10),
                      borderWidth: 1.5,
                      borderColor: paymentMethod === 'cash' ? colors.amber : colors.border,
                      backgroundColor: paymentMethod === 'cash' ? 'rgba(245, 197, 24, 0.15)' : 'transparent',
                    }}
                    onPress={() => setPaymentMethod('cash')}
                  >
                    <MaterialIcons name="payments" size={scale(18)} color={paymentMethod === 'cash' ? colors.amber : colors.textMuted} />
                    <Text style={{ color: paymentMethod === 'cash' ? colors.amber : colors.textPrimary, fontWeight: '800', fontSize: moderateFontScale(12) }}>
                      Cash Payment
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: scale(6),
                      paddingVertical: verticalScale(10),
                      borderRadius: scale(10),
                      borderWidth: 1.5,
                      borderColor: paymentMethod === 'upi' ? colors.amber : colors.border,
                      backgroundColor: paymentMethod === 'upi' ? 'rgba(245, 197, 24, 0.15)' : 'transparent',
                    }}
                    onPress={() => setPaymentMethod('upi')}
                  >
                    <MaterialIcons name="account-balance-wallet" size={scale(18)} color={paymentMethod === 'upi' ? colors.amber : colors.textMuted} />
                    <Text style={{ color: paymentMethod === 'upi' ? colors.amber : colors.textPrimary, fontWeight: '800', fontSize: moderateFontScale(12) }}>
                      Wallet
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.confirmButton, { marginTop: verticalScale(4) }]}
              activeOpacity={0.8}
              onPress={handleBookCustomRide}
            >
              <MaterialIcons name="payment" size={scale(20)} color="#101014" />
              <Text style={styles.confirmBtnText}>
                {bookingMode === 'prebook'
                  ? `Confirm Pre-Booking (Wallet Deposit ₹${prebookPayOption === '20' ? Math.round(computedTripPrice * 0.20) : computedTripPrice})`
                  : `Confirm & Pay Instant Ride (₹${computedTripPrice})`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Extra spacing */}
        <View style={{ height: verticalScale(30) }} />
      </ScrollView>

      {/* VEHICLE PICKER DRAWER MODAL */}
      <Modal visible={isVehiclePickerVisible} transparent animationType="slide">
        <View style={styles.overlayModal}>
          <View style={[styles.mapContainerBox, { backgroundColor: colors.surface, padding: scale(20) }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: moderateFontScale(15) }]}>Choose 4x4 Jeep Model</Text>
                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10.5), marginTop: 2 }}>Swipe left or right to explore models</Text>
              </View>
              <TouchableOpacity onPress={() => setIsVehiclePickerVisible(false)}>
                <MaterialIcons name="close" size={scale(20)} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              contentContainerStyle={{ paddingVertical: verticalScale(14) }}
            >
              {jeepCarouselData.map((car) => {
                const isSelected = selectedRide === '4x4jeep' && selected4x4Car === car.id;
                return (
                  <View
                    key={car.id}
                    style={{
                      width: scale(280),
                      marginHorizontal: scale(10),
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F9F9FB',
                      borderRadius: scale(20),
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.amber : colors.border,
                      padding: scale(16),
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ width: '100%', alignItems: 'center' }}>
                      <Image source={car.image} style={{ width: '80%', height: verticalScale(90), resizeMode: 'contain', marginBottom: verticalScale(10) }} />
                      <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(15), fontWeight: '900', textAlign: 'center' }}>{car.name}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10.5), textAlign: 'center', marginTop: verticalScale(4), height: verticalScale(44) }} numberOfLines={3}>
                        {car.desc}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: verticalScale(8), backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(8) }}>
                        <MaterialIcons name="people" size={scale(13)} color={colors.textMuted} />
                        <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10), fontWeight: '700' }}>{car.capacity}</Text>
                      </View>
                    </View>

                    <View style={{ width: '100%', marginTop: verticalScale(14) }}>
                      <Text style={{ color: colors.amber, fontSize: moderateFontScale(13), fontWeight: '900', textAlign: 'center', marginBottom: verticalScale(10) }}>
                        {car.rateText}
                      </Text>
                      <TouchableOpacity
                        style={{
                          backgroundColor: isSelected ? colors.amber : 'transparent',
                          borderWidth: isSelected ? 0 : 1.5,
                          borderColor: colors.amber,
                          borderRadius: scale(12),
                          paddingVertical: verticalScale(8),
                          alignItems: 'center',
                        }}
                        onPress={() => {
                          setSelectedRide('4x4jeep');
                          setSelected4x4Car(car.id);
                          setIsVehiclePickerVisible(false);
                        }}
                      >
                        <Text style={{ color: isSelected ? '#101014' : colors.amber, fontWeight: '800', fontSize: moderateFontScale(12) }}>
                          {isSelected ? '✓ Selected' : 'Choose Model'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Admin Destination Master Picker Modal */}
      <Modal visible={isDestPickerOpen} animationType="slide" transparent>
        <View style={styles.overlayModal}>
          <View style={[styles.mapContainerBox, { backgroundColor: colors.surface, padding: scale(16), maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                <MaterialIcons name="stars" size={scale(22)} color={colors.amber} />
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Verified Tourist Places</Text>
              </View>
              <TouchableOpacity onPress={() => setIsDestPickerOpen(false)}>
                <MaterialIcons name="close" size={scale(24)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), marginVertical: verticalScale(8) }}>
              Tap items to add (+) or remove (-). You can pick multiple tourist spots at once!
            </Text>

            <ScrollView style={{ maxHeight: verticalScale(380) }} showsVerticalScrollIndicator={true}>
              {liveDestinations.length > 0 ? (
                liveDestinations.map((dest) => {
                  const isAdded = touristCheckpoints.some(
                    c => (c.name || '').toLowerCase().trim() === (dest.name || '').toLowerCase().trim() || String(c.id) === String(dest.id)
                  );
                  return (
                    <TouchableOpacity
                      key={`modal-dest-${dest.id}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: verticalScale(12),
                        paddingHorizontal: scale(12),
                        borderRadius: scale(12),
                        borderWidth: 1.5,
                        borderColor: isAdded ? '#EF4444' : colors.border,
                        marginBottom: verticalScale(8),
                        backgroundColor: isAdded ? 'rgba(239, 68, 68, 0.12)' : (isDark ? 'rgba(255,255,255,0.03)' : '#FAF9F6'),
                      }}
                      onPress={() => handleToggleLiveDestination(dest)}
                    >
                      <MaterialIcons name="place" size={scale(24)} color={isAdded ? '#EF4444' : colors.amber} style={{ marginRight: scale(10) }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: isAdded ? '#EF4444' : colors.textPrimary, fontWeight: '800', fontSize: moderateFontScale(14) }}>
                          {dest.name}
                        </Text>
                        <Text style={{ color: isAdded ? '#EF4444' : colors.textMuted, fontSize: moderateFontScale(11), marginTop: verticalScale(2) }}>
                          {isAdded ? '✓ ADDED TO ITINERARY (TAP TO REMOVE)' : `📍 ${dest.location || 'Official Tourist Destination'}`}
                        </Text>
                      </View>
                      <MaterialIcons
                        name={isAdded ? "remove-circle" : "add-circle"}
                        size={scale(26)}
                        color={isAdded ? "#EF4444" : colors.amber}
                      />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ padding: scale(20), alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(13) }}>
                    Loading verified destinations...
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={{
                backgroundColor: colors.amber,
                borderRadius: scale(12),
                paddingVertical: verticalScale(12),
                alignItems: 'center',
                marginTop: verticalScale(12),
              }}
              onPress={() => setIsDestPickerOpen(false)}
            >
              <Text style={{ color: '#101014', fontWeight: '800', fontSize: moderateFontScale(14) }}>
                Done Selecting Places ({touristCheckpoints.length} Added)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}



// Dark styled maps theme variables
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#101014' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#101014' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181b17' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2C2C34' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1b1b22' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#F5C518', opacity: 0.8 }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
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
    flex: 1,
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
  overlayModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  mapContainerBox: {
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingBottom: verticalScale(30),
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalTitle: {
    fontSize: moderateFontScale(15),
    fontWeight: '800',
  },
});
