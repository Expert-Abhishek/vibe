import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adminState } from '../admin-state';

// Presets for the Custom Itinerary Planner
const presetDestinations = [
  { name: 'Bengaluru City Center', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Bengaluru Palace', latitude: 12.9982, longitude: 77.5920 },
  { name: 'Mysuru Palace', latitude: 12.3053, longitude: 76.6552 },
  { name: 'Hampi Virupaksha Temple', latitude: 15.3350, longitude: 76.4600 },
  { name: 'Abbey Falls Coorg', latitude: 12.4385, longitude: 75.7214 },
  { name: 'Gokarna Om Beach', latitude: 14.5262, longitude: 74.3168 },
  { name: 'Bandipur Tiger Safari', latitude: 11.6667, longitude: 76.6333 },
  { name: 'Jog Falls Sagara', latitude: 14.2272, longitude: 74.8114 },
  { name: 'Chikmagalur Peak', latitude: 13.4216, longitude: 75.7645 },
];

const initialPlans = [
  {
    id: 'p1',
    name: 'Mysuru Royal Heritage Tour',
    checkpoints: ['Bengaluru Palace', 'Srirangapatna Fort', 'Mysuru Palace', 'Chamundi Hills'],
    duration: '10 Hours',
    basePrice: 2800,
  },
  {
    id: 'p2',
    name: 'Hampi Ruins Explorer',
    checkpoints: ['Hampi Virupaksha Temple', 'Vitthala Stone Chariot', 'Lotus Mahal', 'Anjanadri Hill'],
    duration: '12 Hours',
    basePrice: 3500,
  },
  {
    id: 'p3',
    name: 'Coorg Coffee & Mist Escape',
    checkpoints: ['Abbey Falls Coorg', 'Mandalpatti Peak View', 'Golden Temple Bylakuppe'],
    duration: '8 Hours',
    basePrice: 2400,
  },
];

const rides = [
  { key: '5seater', name: '5 Seater', desc: 'Comfort Sedan', image: require('@/assets/images/sedan.png') },
  { key: '7seater', name: '7 Seater', desc: 'Family SUV', image: require('@/assets/images/hatch.png') },
  { key: '4x4jeep', name: '4*4 Jeep', desc: 'Rugged Offroad', image: require('@/assets/images/thar.png') },
  { key: 'auto', name: 'Eco Auto', desc: 'Local Explorer', image: require('@/assets/images/auto.png') },
];

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Section Toggle: 'trip' | 'plan'
  const [activeSection, setActiveSection] = useState<'trip' | 'plan'>('trip');

  // Search Query & Instant Booking Switch
  const [searchQuery, setSearchQuery] = useState('');
  const [isInstantBooking, setIsInstantBooking] = useState(false);

  // Cabs selected category (for showcase)
  const [selectedRide, setSelectedRide] = useState<string>('4x4jeep');

  // Passenger counts for Trip and Plan
  const [tripPassengers, setTripPassengers] = useState<number>(1);
  const [planPassengers, setPlanPassengers] = useState<Record<string, number>>({
    p1: 1,
    p2: 1,
    p3: 1,
  });

  // Custom Trip Maker State
  const [tripCheckpoints, setTripCheckpoints] = useState<typeof presetDestinations>([
    presetDestinations[0], // Start: Bengaluru
    presetDestinations[2], // Mysuru Palace
  ]);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<'5seater' | '7seater' | '4x4jeep' | 'auto'>('5seater');

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  // Distance helper (Haversine)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Custom Trip calculations
  const calculateTripDuration = () => {
    if (tripCheckpoints.length < 2) return 0;
    let distSum = 0;
    for (let i = 0; i < tripCheckpoints.length - 1; i++) {
      distSum += getDistance(
        tripCheckpoints[i].latitude,
        tripCheckpoints[i].longitude,
        tripCheckpoints[i + 1].latitude,
        tripCheckpoints[i + 1].longitude
      );
    }
    // Estimated travel duration (assume average speed of 50 km/h)
    const travelHrs = distSum / 50;
    return parseFloat(travelHrs.toFixed(1));
  };

  const travelDuration = calculateTripDuration();
  // 1 hour addon per checkpoint (including start/stops)
  const checkpointHoursAddon = tripCheckpoints.length;
  const totalTripHours = travelDuration + checkpointHoursAddon;

  const vehicleHourlyRate = adminState.vehicleRatesPerHour[selectedVehicle] || 150;
  const computedTripPrice = Math.round(totalTripHours * vehicleHourlyRate);

  // Add a checkpoint to custom trip
  const addCheckpoint = (preset: (typeof presetDestinations)[0]) => {
    if (tripCheckpoints.find((c) => c.name === preset.name)) {
      Alert.alert('Exists', `${preset.name} is already in your checkpoints.`);
      return;
    }
    setTripCheckpoints([...tripCheckpoints, preset]);
    setShowPresetDropdown(false);
  };

  const removeCheckpoint = (index: number) => {
    if (tripCheckpoints.length <= 2) {
      Alert.alert('Failed', 'A trip must have at least 2 checkpoints (Start and End).');
      return;
    }
    setTripCheckpoints(tripCheckpoints.filter((_, idx) => idx !== index));
  };

  const handleBookCustomTrip = () => {
    const bookingMode = isInstantBooking ? 'Instant Match' : 'Pending Quote Review';
    const routeNames = tripCheckpoints.map(c => c.name);

    adminState.userTrips.push({
      id: `trip_c_${Date.now()}`,
      type: 'custom_trip',
      title: `${routeNames[0]} ➔ ${routeNames[routeNames.length - 1]}`,
      route: routeNames,
      driverOrGuideName: 'Assigned Driver',
      date: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: computedTripPrice,
      paymentMode: 'UPI',
      status: 'Upcoming',
      passengerCount: tripPassengers,
    });

    Alert.alert(
      'Custom Itinerary Confirmed!',
      `Details:\n- Travel Time: ${travelDuration} hrs\n- Checkpoints Addon: ${checkpointHoursAddon} hrs\n- Total Duration: ${totalTripHours.toFixed(1)} hrs\n- Vehicle: ${selectedVehicle === '5seater' ? '5 Seater' : selectedVehicle === '7seater' ? '7 Seater' : selectedVehicle === '4x4jeep' ? '4*4 Jeep' : 'Eco Auto'}\n- Passengers: ${tripPassengers}\n- Total Fare: ₹${computedTripPrice}\n\nMode: ${bookingMode}`
    );
  };

  const handleBookPlan = (plan: typeof initialPlans[0]) => {
    const bookingMode = isInstantBooking ? 'Instant Match' : 'Standard Confirmation';
    const pax = planPassengers[plan.id] || 1;
    const finalPrice = plan.basePrice;

    adminState.userTrips.push({
      id: `trip_p_${Date.now()}`,
      type: 'plan' as any,
      title: `${plan.name} (${plan.duration})`,
      route: plan.checkpoints,
      driverOrGuideName: 'Vibzz Tour Captain',
      date: 'Tomorrow',
      time: '09:00 AM',
      price: finalPrice,
      paymentMode: 'UPI',
      status: 'Upcoming',
      passengerCount: pax,
    });

    Alert.alert(
      'Package Itinerary Booked!',
      `Plan: ${plan.name}\n- Checkpoints: ${plan.checkpoints.length}\n- Passengers: ${pax}\n- Total Price: ₹${finalPrice}\n\nMode: ${bookingMode}`
    );
  };

  // Filter Package Plans by name/checkpoints
  const filteredPlans = initialPlans.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.checkpoints.some((cp) => cp.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <Text style={styles.brandTitle}>VIBZZ</Text>
        <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>Explore Karnataka</Text>
      </View>

      {/* TOP SEARCH BAR (90% width) & INSTANT BOOKING SWITCH (10% width) */}
      <View style={styles.topActionRow}>
        <View style={[styles.searchBar, { flex: 0.88, borderColor: colors.border }]}>
          <MaterialIcons name="search" size={scale(20)} color={colors.amber} style={styles.searchIcon} />
          <TextInput
            placeholder={
              activeSection === 'trip'
                ? 'Search checkpoints to add...'
                : 'Search plans/packages...'
            }
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={scale(18)} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.switchCol}>
          <Text style={[styles.switchLabel, { color: isInstantBooking ? colors.amber : colors.textMuted }]}>
            {isInstantBooking ? '⚡Instant' : 'Standard'}
          </Text>
          <Switch
            value={isInstantBooking}
            onValueChange={setIsInstantBooking}
            trackColor={{ false: 'rgba(255,255,255,0.08)', true: colors.amber }}
            thumbColor={isInstantBooking ? '#101014' : '#8E8E93'}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
      </View>

      {/* INSTANT BOOKING NOTIFICATION BAR */}
      {isInstantBooking && (
        <View style={[styles.instantBadge, { backgroundColor: 'rgba(245, 197, 24, 0.08)' }]}>
          <MaterialIcons name="bolt" size={scale(14)} color={colors.amber} />
          <Text style={[styles.instantBadgeText, { color: colors.amber }]}>
            Instant Booking Enabled: Automatic captain and guide match.
          </Text>
        </View>
      )}

      {/* SECTION TABS: Guide (50%) | Trip (50%) / next line Trip plan (100%) */}
      <View style={styles.segmentBlock}>
        <View style={styles.segmentRow}>
          {/* Guide Selector (50% Width) - Navigates directly to dedicated Guide Screen */}
          <TouchableOpacity
            style={[styles.tabButton, styles.tabButton50]}
            onPress={() => {
              router.push({
                pathname: '/guides' as any,
                params: { instantBooking: isInstantBooking ? 'true' : 'false' }
              });
            }}
          >
            <MaterialIcons
              name="explore"
              size={scale(16)}
              color={colors.textPrimary}
              style={{ marginRight: scale(4) }}
            />
            <Text style={[styles.tabButtonText, { color: colors.textPrimary }]}>
              Guide
            </Text>
          </TouchableOpacity>

          {/* Trip Selector (50% Width) - Switches inline content */}
          <TouchableOpacity
            style={[styles.tabButton, styles.tabButton50, activeSection === 'trip' && styles.tabButtonActive]}
            onPress={() => {
              setActiveSection('trip');
              setSearchQuery('');
            }}
          >
            <MaterialIcons
              name="map"
              size={scale(16)}
              color={activeSection === 'trip' ? '#101010' : colors.textPrimary}
              style={{ marginRight: scale(4) }}
            />
            <Text style={[styles.tabButtonText, { color: activeSection === 'trip' ? '#101010' : colors.textPrimary }]}>
              Trip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Trip Plan Selector (100% Width) - Switches inline content */}
        <TouchableOpacity
          style={[styles.tabButton, styles.tabButton100, activeSection === 'plan' && styles.tabButtonActive]}
          onPress={() => {
            setActiveSection('plan');
            setSearchQuery('');
          }}
        >
          <MaterialIcons
            name="collections-bookmark"
            size={scale(16)}
            color={activeSection === 'plan' ? '#101010' : colors.textPrimary}
            style={{ marginRight: scale(4) }}
          />
          <Text style={[styles.tabButtonText, { color: activeSection === 'plan' ? '#101010' : colors.textPrimary }]}>
            Trip Plan
          </Text>
        </TouchableOpacity>
      </View>

      {/* MAIN CONTENT AREA */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: verticalScale(110) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== 1. TRIP SUB-VIEW (Custom Itinerary Maker) ==================== */}
        {activeSection === 'trip' && (
          <View>
            <Text style={styles.sectionTitle}>Custom Itinerary Route Maker</Text>
            
            {/* Steps & Add locations */}
            <View style={[styles.cardForm, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Route Checkpoints</Text>

              {tripCheckpoints.map((cp, idx) => (
                <View key={idx} style={styles.checkpointItemRow}>
                  <View style={styles.checkpointLabelCol}>
                    <View style={[styles.indicatorDot, { backgroundColor: idx === 0 ? colors.amber : (idx === tripCheckpoints.length - 1 ? '#ef4444' : '#888') }]} />
                    <Text style={[styles.checkpointNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {idx === 0 ? 'Start' : idx === tripCheckpoints.length - 1 ? 'End' : `Stop ${idx}`}: {cp.name}
                    </Text>
                  </View>
                  {tripCheckpoints.length > 2 && (
                    <TouchableOpacity onPress={() => removeCheckpoint(idx)} style={styles.removeCheckpointBtn}>
                      <MaterialIcons name="remove-circle-outline" size={scale(18)} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Add Checkpoint Button */}
              <TouchableOpacity
                style={[styles.addStopBtn, { borderColor: colors.amber }]}
                onPress={() => setShowPresetDropdown(!showPresetDropdown)}
              >
                <MaterialIcons name="add" size={scale(16)} color={colors.amber} />
                <Text style={[styles.addStopText, { color: colors.amber }]}>Add Stopover Checkpoint</Text>
              </TouchableOpacity>

              {/* Preset Destinations Dropdown list */}
              {showPresetDropdown && (
                <View style={[styles.presetsDropdown, { borderColor: colors.border }]}>
                  <Text style={[styles.presetsTitle, { color: colors.textMuted }]}>SELECT LOCATION TO ADD</Text>
                  {presetDestinations
                    .filter((pd) => !tripCheckpoints.find((tc) => tc.name === pd.name))
                    .map((preset, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.presetItem, { borderBottomColor: colors.border }]}
                        onPress={() => addCheckpoint(preset)}
                      >
                        <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(13) }}>{preset.name}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}
            </View>

            {/* Vehicle Selection */}
            <View style={[styles.cardForm, { backgroundColor: colors.surfaceCard, borderColor: colors.border, marginTop: verticalScale(14) }]}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Choose Vehicle Class</Text>
              <View style={styles.vehicleSelectGrid}>
                {Object.keys(adminState.vehicleRatesPerHour).map((vKey) => {
                  const isSelected = selectedVehicle === vKey;
                  const label = vKey === '5seater' ? '5 Seater' : vKey === '7seater' ? '7 Seater' : vKey === '4x4jeep' ? '4*4 Jeep' : 'Eco Auto';
                  const rate = adminState.vehicleRatesPerHour[vKey as keyof typeof adminState.vehicleRatesPerHour];
                  return (
                    <TouchableOpacity
                      key={vKey}
                      style={[
                        styles.vehicleOptionCard,
                        { borderColor: isSelected ? colors.amber : colors.border, backgroundColor: isSelected ? 'rgba(245,197,24,0.06)' : 'transparent' }
                      ]}
                      onPress={() => setSelectedVehicle(vKey as any)}
                    >
                      <Text style={[styles.vehicleOptionLabel, { color: colors.textPrimary }]}>{label}</Text>
                      <Text style={[styles.vehicleOptionPrice, { color: colors.amber }]}>₹{rate}/hr</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Passenger Count Selection & Summary */}
            <View style={[styles.cardForm, { backgroundColor: colors.surfaceCard, borderColor: colors.border, marginTop: verticalScale(14) }]}>
              <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Trip Configuration & Pricing</Text>
              
              {/* Passenger counter */}
              <View style={styles.counterRow}>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(13) }}>Passenger Count</Text>
                <View style={styles.counterContainer}>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setTripPassengers(Math.max(1, tripPassengers - 1))}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.counterValue, { color: colors.textPrimary }]}>{tripPassengers}</Text>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setTripPassengers(Math.min(10, tripPassengers + 1))}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Price Breakdown */}
              <View style={styles.breakdownRow}>
                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Base Travel Duration</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{travelDuration} hours</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Checkpoint Stopovers ({checkpointHoursAddon})</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>+{checkpointHoursAddon} hours</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Total Trip Duration</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{totalTripHours.toFixed(1)} hours</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Hourly Rate ({selectedVehicle === 'auto' ? 'Auto' : 'Cab'})</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>₹{vehicleHourlyRate}/hr</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Final Quoted Price */}
              <View style={styles.finalPriceRow}>
                <View>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10) }}>ESTIMATED FARE</Text>
                  <Text style={[styles.finalFareText, { color: colors.amber }]}>₹{computedTripPrice}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.bookBtn, { backgroundColor: colors.amber, paddingHorizontal: scale(20) }]}
                  onPress={handleBookCustomTrip}
                >
                  <Text style={styles.bookBtnText}>Book Itinerary</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ==================== 2. PLAN SUB-VIEW ==================== */}
        {activeSection === 'plan' && (
          <View>
            <Text style={styles.sectionTitle}>Curated Itinerary Packages</Text>
            
            {filteredPlans.length === 0 ? (
              <View style={styles.emptyView}>
                <Text style={{ color: colors.textMuted }}>No tour packages match your search.</Text>
              </View>
            ) : (
              filteredPlans.map((plan) => {
                const currentPax = planPassengers[plan.id] || 1;
                return (
                  <View key={plan.id} style={[styles.planCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                    <Text style={[styles.planName, { color: colors.textPrimary }]}>{plan.name}</Text>
                    
                    {/* Checkpoint list */}
                    <View style={styles.planCheckpointsBox}>
                      <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10), fontWeight: '700', marginBottom: verticalScale(4) }}>CHECKPOINTS</Text>
                      <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12) }}>
                        {plan.checkpoints.join(' ➔ ')}
                      </Text>
                    </View>

                    {/* Stats details */}
                    <View style={styles.planMetaRow}>
                      <View style={styles.planMetaItem}>
                        <MaterialIcons name="schedule" size={scale(14)} color={colors.amber} />
                        <Text style={[styles.planMetaText, { color: colors.textPrimary }]}>{plan.duration}</Text>
                      </View>
                      <View style={styles.planMetaItem}>
                        <MaterialIcons name="local-activity" size={scale(14)} color={colors.amber} />
                        <Text style={[styles.planMetaText, { color: colors.textPrimary }]}>{plan.checkpoints.length} Stops</Text>
                      </View>
                    </View>

                    {/* Passenger count selector */}
                    <View style={styles.planPassengerRow}>
                      <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Passengers Count</Text>
                      <View style={styles.counterContainer}>
                        <TouchableOpacity
                          style={styles.counterBtn}
                          onPress={() =>
                            setPlanPassengers({
                              ...planPassengers,
                              [plan.id]: Math.max(1, currentPax - 1),
                            })
                          }
                        >
                          <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={[styles.counterValue, { color: colors.textPrimary }]}>{currentPax}</Text>
                        <TouchableOpacity
                          style={styles.counterBtn}
                          onPress={() =>
                            setPlanPassengers({
                              ...planPassengers,
                              [plan.id]: Math.min(10, currentPax + 1),
                            })
                          }
                        >
                          <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Pricing & checkout */}
                    <View style={[styles.planCardFooter, { borderTopColor: colors.border }]}>
                      <View>
                        <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10) }}>PACKAGE RATE</Text>
                        <Text style={[styles.planPriceText, { color: colors.amber }]}>₹{plan.basePrice}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.bookBtn, { backgroundColor: colors.amber }]}
                        onPress={() => handleBookPlan(plan)}
                      >
                        <Text style={styles.bookBtnText}>Book Package</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* CHOOSE YOUR RIDE (SHOWCASE ONLY - BOOKINGS HANDLED VIA TRIP/CUSTOM ITINERARY) */}
        <View style={styles.chooseRideHeader}>
          <Text style={styles.sectionTitleNoMargin}>Vehicle Fleet Showcase</Text>
          <Text style={[styles.viewAllText, { color: colors.textMuted }]}>Rates per hr</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.rideSlider}
          contentContainerStyle={styles.rideSliderContent}
        >
          {rides.map((ride) => {
            const isSelected = selectedRide === ride.key;
            const rate = adminState.vehicleRatesPerHour[ride.key as keyof typeof adminState.vehicleRatesPerHour];
            return (
              <TouchableOpacity
                key={ride.key}
                activeOpacity={0.9}
                style={[
                  styles.rideCard,
                  { backgroundColor: colors.surfaceCard, borderColor: isSelected ? colors.amber : colors.border },
                ]}
                onPress={() => {
                  setSelectedRide(ride.key);
                  router.push({ pathname: '/cars' as any, params: { selectedRide: ride.key } });
                }}
              >
                {isSelected && <View style={styles.selectedDot} />}
                <View style={styles.carImageWrapper}>
                  <Image source={ride.image} style={styles.carCutoutImage} resizeMode="contain" />
                </View>
                <Text style={[styles.rideCardName, { color: colors.textPrimary }]}>{ride.name}</Text>
                <Text style={[styles.rideCardDesc, { color: colors.amber, fontSize: moderateFontScale(11), fontWeight: '700', marginTop: verticalScale(2) }]}>
                  ₹{rate}/hr
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(9), marginTop: verticalScale(2) }}>
                  Info Only
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.footerVibeCard}>
          <View style={styles.waveOverlay} />
          <Text style={styles.vibeCardTitle}>#MAKE YOUR OWN VIBE WITH US</Text>
          <Text style={styles.vibeCardSub}>Made in India</Text>
          <Text style={styles.vibeCardCrafted}>Crafted in Karnataka</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101014',
  },
  topHeader: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(10),
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: moderateFontScale(22),
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(18),
    gap: scale(10),
    marginTop: verticalScale(12),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: scale(25),
    paddingHorizontal: scale(16),
    height: verticalScale(44),
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
  switchCol: {
    flex: 0.12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchLabel: {
    fontSize: moderateFontScale(8),
    fontWeight: '800',
    marginBottom: verticalScale(2),
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale(18),
    marginTop: verticalScale(8),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    gap: scale(4),
  },
  instantBadgeText: {
    fontSize: moderateFontScale(10),
    fontWeight: '700',
  },
  segmentBlock: {
    paddingHorizontal: scale(18),
    marginTop: verticalScale(12),
    gap: scale(8),
  },
  segmentRow: {
    flexDirection: 'row',
    gap: scale(8),
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: verticalScale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tabButton50: {
    flex: 0.5,
  },
  tabButton100: {
    width: '100%',
  },
  tabButtonActive: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },
  tabButtonText: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(14),
  },
  sectionTitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    marginBottom: verticalScale(12),
  },
  sectionTitleNoMargin: {
    color: '#F5C518',
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  emptyView: {
    padding: scale(30),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: scale(16),
  },
  bookBtn: {
    borderRadius: scale(14),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookBtnText: {
    color: '#101014',
    fontSize: moderateFontScale(12),
    fontWeight: '800',
  },
  cardForm: {
    borderRadius: scale(20),
    borderWidth: 1.2,
    padding: scale(16),
  },
  formLabel: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
    marginBottom: verticalScale(12),
  },
  checkpointItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: scale(10),
    padding: scale(10),
    marginBottom: verticalScale(8),
  },
  checkpointLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    flex: 0.9,
  },
  indicatorDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  checkpointNameText: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  removeCheckpointBtn: {
    padding: scale(4),
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderRadius: scale(12),
    height: verticalScale(40),
    marginTop: verticalScale(6),
    gap: scale(6),
  },
  addStopText: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  presetsDropdown: {
    backgroundColor: '#1E1E24',
    borderWidth: 1.2,
    borderRadius: scale(14),
    marginTop: verticalScale(8),
    padding: scale(10),
  },
  presetsTitle: {
    fontSize: moderateFontScale(9),
    fontWeight: '800',
    marginBottom: verticalScale(6),
    letterSpacing: 0.5,
  },
  presetItem: {
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
  },
  vehicleSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  vehicleOptionCard: {
    width: '48%',
    borderWidth: 1.2,
    borderRadius: scale(12),
    padding: scale(10),
    justifyContent: 'center',
  },
  vehicleOptionLabel: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  vehicleOptionPrice: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  counterBtn: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: '#3A3A40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  divider: {
    height: 1,
    marginVertical: verticalScale(12),
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(6),
  },
  finalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(6),
  },
  finalFareText: {
    fontSize: moderateFontScale(22),
    fontWeight: '900',
    marginTop: verticalScale(2),
  },
  planCard: {
    borderRadius: scale(20),
    borderWidth: 1.2,
    padding: scale(16),
    marginBottom: verticalScale(14),
  },
  planName: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  planCheckpointsBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: scale(10),
    padding: scale(10),
    marginVertical: verticalScale(10),
  },
  planMetaRow: {
    flexDirection: 'row',
    gap: scale(16),
    marginBottom: verticalScale(12),
  },
  planMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  planMetaText: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  planPassengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  planCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: verticalScale(10),
  },
  planPriceText: {
    fontSize: moderateFontScale(18),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  chooseRideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(18),
    marginBottom: verticalScale(12),
  },
  viewAllText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
  rideSlider: {
    marginBottom: verticalScale(18),
  },
  rideSliderContent: {
    paddingRight: scale(20),
  },
  rideCard: {
    width: scale(120),
    marginRight: scale(10),
    borderWidth: 1.5,
    borderRadius: scale(18),
    padding: scale(10),
    alignItems: 'center',
  },
  selectedDot: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#F5C518',
  },
  carImageWrapper: {
    width: '90%',
    height: verticalScale(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  carCutoutImage: {
    width: '100%',
    height: '100%',
  },
  rideCardName: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  rideCardDesc: {
    fontSize: moderateFontScale(10),
  },
  footerVibeCard: {
    backgroundColor: '#0A0A0C',
    borderRadius: scale(20),
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: scale(16),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    height: verticalScale(110),
    marginTop: verticalScale(10),
  },
  waveOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderWidth: scale(2),
    borderColor: 'rgba(245, 197, 24, 0.05)',
    borderRadius: scale(20),
  },
  vibeCardTitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(18),
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  vibeCardSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: moderateFontScale(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: verticalScale(6),
    letterSpacing: 1,
  },
  vibeCardCrafted: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: moderateFontScale(9),
    marginTop: verticalScale(2),
  },
});
