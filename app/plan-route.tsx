import { adminState } from '@/constants/admin-state';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { getSocket } from '@src/services/socketService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TourPackage {
  id: string;
  name: string;
  checkpoints: string[];
  travelHours: number;
  distanceKm: number;
  image: string;
  destinationIds?: string[];
  destinationId?: string;
}

import { createTripApi, deductWalletApi, fetchActiveTripApi, fetchDriversApi, fetchPlansApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { PRESET_PICKUP_DROP_LOCATIONS, PresetLocation } from '@/constants/preset-locations';

export default function PlanRouteScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [livePlans, setLivePlans] = useState<any[]>([]);
  const [loadingLivePlans, setLoadingLivePlans] = useState(true);
  const [backendDrivers, setBackendDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);

  // Booking modal state
  const [selectedPlan, setSelectedPlan] = useState<TourPackage | null>(null);
  const [bookingPax, setBookingPax] = useState(1);
  const [bookingVehicle, setBookingVehicle] = useState<'5seater' | '7seater' | '4x4jeep' | 'auto'>('5seater');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('upi');
  const [preBookingPaymentChoice, setPreBookingPaymentChoice] = useState<'advance_20' | 'full_100'>('advance_20');
  const [selected4x4Car, setSelected4x4Car] = useState<string>('Thar');
  const [stationList, setStationList] = useState<PresetLocation[]>(PRESET_PICKUP_DROP_LOCATIONS);
  const [selectedPickup, setSelectedPickup] = useState<PresetLocation>(PRESET_PICKUP_DROP_LOCATIONS[0]);
  const [selectedDrop, setSelectedDrop] = useState<PresetLocation>(PRESET_PICKUP_DROP_LOCATIONS[1]);

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

  const [bookingDate, setBookingDate] = useState('');
  const bookingTime = `${bookingHour}:${bookingMinute < 10 ? '0' + bookingMinute : bookingMinute} ${bookingAmPm}`;
  const [bookingStep, setBookingStep] = useState<'details' | 'form' | 'connecting' | 'success'>('details');

  // Vehicle selector modal visibility state
  const [isVehiclePickerVisible, setIsVehiclePickerVisible] = useState(false);

  const params = useLocalSearchParams();
  const fromVehicle = params.fromVehicle === 'true';
  const vehicleTypeParam = params.vehicleType as '5seater' | '7seater' | '4x4jeep' | 'auto';
  const carNameParam = params.carName as string;

  const displayPackagePlans: (TourPackage & { price?: number })[] = livePlans.map((p, idx) => ({
    id: p.id || `p_${idx}`,
    name: p.name,
    checkpoints: Array.isArray(p.checkpoints)
      ? p.checkpoints.map((cp: any) => typeof cp === 'string' ? cp : (cp.name || 'Tourist Place'))
      : ['Tourist Place'],
    travelHours: parseFloat(p.duration) || 8,
    distanceKm: parseFloat(p.km) || 150,
    price: parseFloat(p.price) || 4999,
    image: p.checkpoints && p.checkpoints[0]?.images?.[0]
      ? p.checkpoints[0].images[0]
      : 'https://images.unsplash.com/photo-1600100397608-f010e42ec9ab?auto=format&fit=crop&q=80&w=600',
    destinationIds: p.destinationIds || p.destination_ids,
    destinationId: p.destinationId || p.destination_id,
  }));

  useEffect(() => {
    async function loadBackendData() {
      setLoadingLivePlans(true);
      const data = await fetchPlansApi();
      if (data && data.length > 0) {
        setLivePlans(data);
      }
      const drivers = await fetchDriversApi();
      if (drivers && drivers.length > 0) {
        setBackendDrivers(drivers);
      }
      setLoadingLivePlans(false);
    }
    loadBackendData();
  }, []);

  useEffect(() => {
    if (params.fromVehicle === 'true') {
      if (params.selectedRide) {
        setBookingVehicle(params.selectedRide as any);
      }
      if (params.selectedDriverId) {
        const driverId = params.selectedDriverId as string;
        setSelectedDriver({
          id: driverId,
          user_id: driverId,
          name: (params.selectedDriverName as string) || 'Verified Driver',
          vehicle_model: (params.selectedCarModel as string) || 'Standard Cab',
          vehicle_number: (params.selectedCarNumber as string) || '',
          car_front_url: (params.selectedCarPhoto as string) || '',
          daily_rate: params.selectedDriverRate ? Number(params.selectedDriverRate) : 1800,
          hourly_addon_rate: params.selectedDriverAddonRate ? Number(params.selectedDriverAddonRate) : 150,
        });
      }

      const planId = params.selectedPlanId ? String(params.selectedPlanId) : '';
      const planName = params.selectedPlanName ? String(params.selectedPlanName) : '';

      let match = displayPackagePlans.find((p: any) =>
        (planId && String(p.id) === planId) ||
        (planName && p.name.toLowerCase() === planName.toLowerCase())
      );

      if (!match) {
        match = {
          id: planId || `plan_${Date.now()}`,
          name: planName || 'Karnataka Package Tour',
          checkpoints: ['Bengaluru City Tour', 'Heritage Stops', 'Local Showcase'],
          travelHours: 8,
          distanceKm: 150,
          price: 4999,
          image: 'https://images.unsplash.com/photo-1600100397608-f010e42ec9ab?auto=format&fit=crop&q=80&w=600',
        };
      }

      setSelectedPlan(match);
      setBookingStep('form');

      router.setParams({ fromVehicle: undefined });
    }
  }, [params.fromVehicle, params.selectedDriverId, params.selectedPlanId, params.selectedPlanName, livePlans]);

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

  const vehicleRatesPerDay: Record<string, number> = {
    '5_seater': 1800,
    '7_seater': 2600,
    '4x4': 4200,
    'auto': 1200,
    '5seater': 1800,
    '7seater': 2600,
    '4x4jeep': 4200,
  };

  const calculatePackagePrice = (plan: TourPackage, vehicle: string) => {
    const baseP = (plan as any).price ? Number((plan as any).price) : 1800;
    let baseDayRate = baseP;

    if (vehicle === '5seater' || vehicle === '5_seater') {
      baseDayRate = (plan as any).price_5_seater ? Number((plan as any).price_5_seater) : baseP;
    } else if (vehicle === '7seater' || vehicle === '7_seater') {
      baseDayRate = (plan as any).price_7_seater ? Number((plan as any).price_7_seater) : Math.round(baseP * 1.35);
    } else if (vehicle === '4x4jeep' || vehicle === '4x4') {
      baseDayRate = (plan as any).price_4x4 ? Number((plan as any).price_4x4) : Math.round(baseP * 1.60);
    } else if (vehicle === 'auto') {
      baseDayRate = (plan as any).price_auto ? Number((plan as any).price_auto) : Math.round(baseP * 0.65);
    }

    const vehicleHourlyRate = selectedDriver?.hourly_addon_rate ? Number(selectedDriver.hourly_addon_rate) : ((adminState.vehicleRatesPerHour as Record<string, number>)[vehicle] || 150);
    const totalTripHours = plan.travelHours + (plan.checkpoints ? plan.checkpoints.length : 2);

    const extraHoursRounded = 0;
    const extraAddonCharge = 0;
    const computedPrice = baseDayRate;

    return {
      computedPrice,
      baseDayRate,
      extraHoursRounded,
      extraAddonCharge,
      vehicleHourlyRate,
      totalTripHours
    };
  };


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

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
    success: '#10B981',
    danger: '#EF4444',
  };



  const filteredPackages = displayPackagePlans.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.checkpoints.some((cp) => cp.toLowerCase().includes(searchQuery.toLowerCase()))
  );


  const openBookingPopup = (plan: TourPackage) => {
    setSelectedPlan(plan);
    setBookingPax(1);
    setBookingVehicle('5seater');
    setBookingStep('details');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split('T')[0]);
  };

  const handleConfirmBooking = () => {
    if (!selectedPlan) return;

    if (!adminState.instantBookingEnabled) {
      if (!bookingDate) {
        Alert.alert('Error', 'Please enter a booking date.');
        return;
      }
      const selectedTime = new Date(bookingDate).getTime();
      const nowTime = new Date().getTime();
      const maxTime = nowTime + 15 * 24 * 60 * 60 * 1000;
      if (selectedTime < nowTime - 24 * 60 * 60 * 1000) {
        Alert.alert('Error', 'Cannot book a date in the past.');
        return;
      }
      if (selectedTime > maxTime) {
        Alert.alert('Booking Restricted', 'Pre-bookings can only be made up to 15 days in advance.');
        return;
      }
    }

    addTripAndClose();
  };

  const addTripAndClose = async () => {
    if (!selectedPlan) return;

    const sessionCheck = getUserSessionSync();
    const currentUserIdCheck = sessionCheck?.id || sessionCheck?.profile?.user_id;

    if (currentUserIdCheck) {
      try {
        const activeRes = await fetchActiveTripApi(currentUserIdCheck);
        if (activeRes && activeRes.hasActiveTrip && activeRes.trip) {
          Alert.alert(
            '⚠️ Active Trip Already Exists',
            `You already have an active trip in progress ("${activeRes.trip.title || 'Ongoing Trip'}"). Please complete or cancel your current trip before booking a new one.`,
            [
              { text: '📍 Track Active Trip', onPress: () => router.push({ pathname: '/trip-status', params: { tripId: activeRes.trip.id, id: activeRes.trip.id } }) },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          return;
        }
      } catch (e) {
        console.warn('Pre-flight active trip check error:', e);
      }
    }

    const priceInfo = calculatePackagePrice(selectedPlan, bookingVehicle);
    const totalPrice = priceInfo.computedPrice;
    const isPreBooking = !adminState.instantBookingEnabled;
    const is20Percent = isPreBooking && preBookingPaymentChoice === 'advance_20';
    const prebookPayOption = preBookingPaymentChoice === 'advance_20' ? 20 : 100;
    const paymentAmount = is20Percent ? Math.round(totalPrice * 0.20) : totalPrice;
    const remainingBalance = is20Percent ? totalPrice - paymentAmount : 0;
    const totalHours = priceInfo.totalTripHours;

    const finalDate = adminState.instantBookingEnabled ? 'Today' : bookingDate;
    const finalTime = adminState.instantBookingEnabled
      ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : bookingTime;

    const driverName = selectedDriver?.name || 'Anil Gowda (Captain)';
    const driverId = selectedDriver?.id || 'd1';

    if (paymentMethod === 'cash') {
      const paymentLabel = isPreBooking
        ? `Cash (Pre-Booking Fees: ₹${paymentAmount}, Bal ₹${remainingBalance})`
        : `Cash (Full Payment ₹${totalPrice})`;

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

      const session = getUserSessionSync();
      const currentUserId = session?.id || session?.profile?.user_id;

      const targetCategory = selectedDriver?.vehicle_category || bookingVehicle || '5_seater';
      const planDestIds = Array.isArray(selectedPlan.destinationIds) && selectedPlan.destinationIds.length > 0 ? selectedPlan.destinationIds : (Array.isArray(selectedPlan.checkpoints) ? selectedPlan.checkpoints : []);
      const primaryDestId = selectedPlan.destinationId || (planDestIds.length > 0 ? planDestIds[0] : null);

      const createdTrip = await createTripApi({
        tripType: 'plan',
        title: `${selectedPlan.name}`,
        customerId: currentUserId,
        customerName: session?.name || 'Abhishek (Tourist)',
        driverOrGuideName: selectedDriver ? driverName : 'Auto-Assigned Captain',
        driverId: selectedDriver ? driverId : null,
        planId: selectedPlan.id,
        destinationId: primaryDestId || undefined,
        destinationIds: planDestIds,
        pickupId: selectedPickup.id,
        pickupName: selectedPickup.name,
        pickupLat: selectedPickup.latitude,
        pickupLng: selectedPickup.longitude,
        dropId: selectedDrop.id,
        dropName: selectedDrop.name,
        dropLat: selectedDrop.latitude,
        dropLng: selectedDrop.longitude,
        vehicleCategory: targetCategory,
        amount: totalPrice,
        paymentMode: paymentMethod === 'cash' ? 'Cash' : 'UPI',
        status: 'Pending',
        durationHours: totalHours,
        extraHours: priceInfo.extraHoursRounded,
        addonCharge: priceInfo.extraAddonCharge,
        bookingType: isPreBooking ? 'PRE_BOOKED' : 'INSTANT',
        scheduledTime: calculatedScheduledTime,
      });

      if (createdTrip && createdTrip.success === false) {
        Alert.alert(
          '⚠️ Active Trip Already Exists',
          createdTrip.message || 'You already have an active trip in progress. Please complete or cancel your current trip before booking a new one.',
          [
            { text: '📍 Track Active Trip', onPress: () => router.push({ pathname: '/trip-status', params: { tripId: createdTrip.activeTrip?.id || createdTrip.tripId } }) },
            { text: 'OK', style: 'cancel' }
          ]
        );
        return;
      }

      const realTripId = createdTrip?.data?.id || createdTrip?.id || createdTrip?.tripId || `plan_book_${Date.now()}`;
      const realOtp = createdTrip?.data?.otp || createdTrip?.otp || '8240';
      const realEndOtp = createdTrip?.data?.endOtp || createdTrip?.data?.end_otp || createdTrip?.endOtp || '4321';

      const newTripObj = {
        id: realTripId,
        tripId: realTripId,
        type: 'plan' as const,
        title: `${selectedPlan.name} (${Math.round(totalHours)} Hours)`,
        pickupId: selectedPickup.id,
        pickup_id: selectedPickup.id,
        stationId: selectedPickup.id,
        pickup: selectedPickup.name,
        pickupName: selectedPickup.name,
        pickupLat: selectedPickup.latitude,
        pickupLng: selectedPickup.longitude,
        dropId: selectedDrop.id,
        drop_id: selectedDrop.id,
        drop: selectedDrop.name,
        dropName: selectedDrop.name,
        dropLat: selectedDrop.latitude,
        dropLng: selectedDrop.longitude,
        route: selectedPlan.checkpoints,
        checkpoints: selectedPlan.checkpoints,
        date: finalDate,
        time: finalTime,
        price: totalPrice,
        amount: totalPrice,
        touristName: session?.name || 'Abhishek (Tourist)',
        customerName: session?.name || 'Abhishek (Tourist)',
        customerId: currentUserId,
        driverOrGuideName: selectedDriver ? driverName : 'Searching Captain...',
        assignedToId: selectedDriver ? driverId : null,
        status: 'Pending' as const,
        paymentMode: paymentLabel,
        passengerCount: bookingPax,
        otp: realOtp,
        endOtp: realEndOtp,
      };

      adminState.advanceBookings.push(newTripObj as any);
      adminState.userTrips.push(newTripObj as any);

      if (!Array.isArray((adminState as any).pendingDriverRequests)) {
        (adminState as any).pendingDriverRequests = [];
      }
      (adminState as any).pendingDriverRequests.push(newTripObj);

      if (!createdTrip?.success) {
        try {
          const socket = getSocket();
          if (socket && socket.connected) {
            socket.emit('broadcast_trip_request', newTripObj);
            socket.emit('trip_requested', newTripObj);
          }
          DeviceEventEmitter.emit('new_driver_request', { trip: newTripObj });
        } catch (e) {
          console.warn('Socket emit error on plan booking:', e);
        }
      }

      setSelectedPlan(null);
      setBookingStep('details');
      router.replace({ pathname: '/trip-status', params: { tripId: realTripId, id: realTripId } });
      return;
    }

    // Wallet Direct Deduction Payment Flow
    const session = getUserSessionSync();
    const currentUserId = session?.id || session?.profile?.user_id || 't1';

    const walletDeductRes = await deductWalletApi({
      userId: currentUserId,
      amount: paymentAmount,
      description: isPreBooking
        ? `Vibe Wallet Deposit (${prebookPayOption}%) for Tour: ${selectedPlan.name}`
        : `Vibe Wallet Payment for Tour: ${selectedPlan.name}`,
    });

    if (!walletDeductRes || !walletDeductRes.success) {
      Alert.alert(
        '💳 Insufficient Wallet Balance',
        `Your Vibe Wallet balance is insufficient to pay ₹${paymentAmount}. Please add money to your Vibe Wallet in your Profile.`,
        [
          { text: 'Add Money to Wallet', onPress: () => router.push('/(tabs)/profile') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    const paymentLabel = isPreBooking
      ? `Wallet Deposit (${prebookPayOption}%): ₹${paymentAmount} (Bal ₹${remainingBalance})`
      : `Wallet Payment: ₹${paymentAmount}`;

    const targetCategory = selectedDriver?.vehicle_category || bookingVehicle || '5_seater';

    const planDestIds = Array.isArray(selectedPlan.destinationIds) && selectedPlan.destinationIds.length > 0 ? selectedPlan.destinationIds : (Array.isArray(selectedPlan.checkpoints) ? selectedPlan.checkpoints : []);
    const primaryDestId = selectedPlan.destinationId || (planDestIds.length > 0 ? planDestIds[0] : null);

    // Save trip to backend DB
    const createdTrip = await createTripApi({
      tripType: 'plan',
      title: `${selectedPlan.name} (${Math.round(totalHours)} Hours)`,
      customerId: currentUserId,
      customerName: session?.name || 'Abhishek (Tourist)',
      driverOrGuideName: selectedDriver ? driverName : 'Auto-Assigned Captain',
      driverId: selectedDriver ? driverId : null,
      planId: selectedPlan.id,
      destinationId: primaryDestId || undefined,
      destinationIds: planDestIds,
      vehicleCategory: targetCategory,
      amount: totalPrice,
      paymentMode: 'Wallet',
      status: 'Confirmed',
      durationHours: totalHours,
      extraHours: priceInfo.extraHoursRounded,
      addonCharge: priceInfo.extraAddonCharge,
    });

    const realTripId = createdTrip?.data?.id || createdTrip?.id || createdTrip?.tripId || `plan_book_${Date.now()}`;

    const newTripObj = {
      id: realTripId,
      tripId: realTripId,
      type: 'plan' as const,
      title: `${selectedPlan.name} (${Math.round(totalHours)} Hours)`,
      route: selectedPlan.checkpoints,
      checkpoints: selectedPlan.checkpoints,
      driverOrGuideName: selectedDriver ? driverName : 'Searching Captain...',
      date: finalDate,
      time: finalTime,
      price: totalPrice,
      amount: totalPrice,
      paymentMode: paymentLabel,
      status: 'Pending' as const,
      passengerCount: bookingPax,
      otp: createdTrip?.otp || '8240',
      endOtp: createdTrip?.end_otp || createdTrip?.endOtp || '4321',
    };

    adminState.userTrips.push(newTripObj as any);

    if (!Array.isArray((adminState as any).pendingDriverRequests)) {
      (adminState as any).pendingDriverRequests = [];
    }
    (adminState as any).pendingDriverRequests.push(newTripObj);

    try {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('broadcast_trip_request', newTripObj);
        socket.emit('trip_requested', newTripObj);
      }
      DeviceEventEmitter.emit('new_driver_request', { trip: newTripObj });
    } catch (e) {
      console.warn('Socket emit error on plan booking:', e);
    }

    setSelectedPlan(null);
    setBookingStep('details');
    router.replace({ pathname: '/trip-status', params: { tripId: realTripId, id: realTripId } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {selectedPlan === null ? (
        <>
          {/* SCREEN 1: LIST OF TOUR PACKAGES */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Karnataka Tour Packages</Text>
            <View style={{ width: scale(40) }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.welcomeBanner}>
              <Text style={styles.welcomeTitle}>Discover Heritage & Nature</Text>
              <Text style={[styles.welcomeSub, { color: colors.textMuted }]}>
                Choose a premium tour package below. Checkpoint stopovers and traveling duration calculations are fully integrated.
              </Text>
            </View>

            <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
              <MaterialIcons name="search" size={scale(20)} color={colors.amber} style={styles.searchIcon} />
              <TextInput
                placeholder="Search tours or checkpoints..."
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'}
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

            <View style={{ gap: scale(12), marginTop: verticalScale(10) }}>
              {filteredPackages.length === 0 ? (
                <View style={styles.noResults}>
                  <Text style={{ color: colors.textMuted }}>No package tours match your search query.</Text>
                </View>
              ) : (
                filteredPackages.map((plan) => {
                  const checkpointsCount = plan.checkpoints.length;
                  const totalHours = plan.travelHours + checkpointsCount;

                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[styles.packageListRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      activeOpacity={0.9}
                      onPress={() => openBookingPopup(plan)}
                    >
                      <Image source={{ uri: plan.image }} style={styles.packageRowImage} />

                      <View style={styles.packageRowBody}>
                        <Text style={[styles.packageNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                          {plan.name}
                        </Text>

                        <View style={styles.metaInfoRow}>
                          <Text style={[styles.metaText, { color: colors.textMuted }]}>
                            📍 {checkpointsCount} Stops  •  🛣️ {plan.distanceKm} km
                          </Text>
                        </View>

                        <View style={styles.durationsRow}>
                          <Text style={[styles.metaText, { color: colors.textMuted }]}>
                            🕒 Total: {totalHours.toFixed(1)} hrs
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <View style={{ height: verticalScale(30) }} />
          </ScrollView>
        </>
      ) : (
        <>
          {/* SCREEN 2: DEDICATED FULL SCREEN PLAN DETAILS & CHECKOUT PAGE */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => setSelectedPlan(null)}>
              <MaterialIcons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {selectedPlan.name}
            </Text>
            <View style={{ width: scale(40) }} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* PLAN DETAILS HEADER */}
            <Text style={[styles.modalPlanName, { color: colors.amber }]}>{selectedPlan.name}</Text>

            {/* PICKUP & DROP LOCATION SELECTOR FOR TOUR PLAN */}
            <View style={{ marginVertical: verticalScale(10), backgroundColor: colors.surface, padding: scale(14), borderRadius: scale(16), borderWidth: 1, borderColor: colors.border }}>


              {/* Pickup Location Selector */}
              <View style={{ marginBottom: verticalScale(12) }}>
                <Text style={{ color: colors.amber, fontSize: moderateFontScale(11), fontWeight: '800', letterSpacing: 0.5, marginBottom: verticalScale(6) }}>
                  PICKUP LOCATION
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {stationList.map((loc) => {
                    const isSelected = selectedPickup.id === loc.id;
                    return (
                      <TouchableOpacity
                        key={`p_${loc.id}`}
                        style={{
                          paddingHorizontal: scale(12),
                          paddingVertical: verticalScale(8),
                          borderRadius: scale(10),
                          borderWidth: 1.5,
                          borderColor: isSelected ? colors.amber : colors.border,
                          backgroundColor: isSelected ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255,255,255,0.03)',
                          marginRight: scale(8),
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: scale(6),
                        }}
                        onPress={() => setSelectedPickup(loc)}
                      >
                        <MaterialIcons name="trip-origin" size={scale(14)} color={isSelected ? colors.amber : colors.textMuted} />
                        <Text style={{ color: isSelected ? colors.amber : colors.textPrimary, fontSize: moderateFontScale(11.5), fontWeight: isSelected ? '800' : '600' }}>
                          {loc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Drop Location Selector */}
              <View style={{ marginBottom: verticalScale(4) }}>
                <Text style={{ color: colors.amber, fontSize: moderateFontScale(11), fontWeight: '800', letterSpacing: 0.5, marginBottom: verticalScale(6) }}>
                  DROP LOCATION
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {stationList.map((loc) => {
                    const isSelected = selectedDrop.id === loc.id;
                    return (
                      <TouchableOpacity
                        key={`d_${loc.id}`}
                        style={{
                          paddingHorizontal: scale(12),
                          paddingVertical: verticalScale(8),
                          borderRadius: scale(10),
                          borderWidth: 1.5,
                          borderColor: isSelected ? colors.amber : colors.border,
                          backgroundColor: isSelected ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255,255,255,0.03)',
                          marginRight: scale(8),
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: scale(6),
                        }}
                        onPress={() => setSelectedDrop(loc)}
                      >
                        <MaterialIcons name="location-on" size={scale(14)} color={isSelected ? '#EF4444' : colors.textMuted} />
                        <Text style={{ color: isSelected ? colors.amber : colors.textPrimary, fontSize: moderateFontScale(11.5), fontWeight: isSelected ? '800' : '600' }}>
                          {loc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* RAPIDO / UBER STYLE DYNAMIC VEHICLE CATEGORY SELECTOR */}
            <View style={{ marginVertical: verticalScale(10) }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: moderateFontScale(14), marginBottom: verticalScale(8) }}>
                Select Vehicle Category & Pricing
              </Text>
              <View style={{ gap: scale(8) }}>
                {[
                  { key: '5_seater', label: '5 Seater', icon: 'directions-car', capacity: '4 Pax + 2 Bags', desc: 'Comfortable standard AC cab' },
                  { key: '7_seater', label: '7 Seater', icon: 'airport-shuttle', capacity: '6 Pax + 4 Bags', desc: 'Spacious for family & extra luggage' },
                  { key: '4x4', label: '4x4 Off-Road', icon: 'terrain', capacity: '4 Pax + Adventure Gear', desc: 'Powerful 4WD for hills & rough terrain' },
                  { key: 'auto', label: 'Auto Rickshaw', icon: 'electric-rickshaw', capacity: '3 Pax Local Sightseeing', desc: 'Budget-friendly open air tour' },
                ].map((cat) => {
                  const isSelected = bookingVehicle === cat.key || (bookingVehicle === '5seater' && cat.key === '5_seater') || (bookingVehicle === '7seater' && cat.key === '7_seater') || (bookingVehicle === '4x4jeep' && cat.key === '4x4');
                  const catPrice = calculatePackagePrice(selectedPlan, cat.key).computedPrice;
                  const catDeposit = !adminState.instantBookingEnabled ? Math.round(catPrice * 0.20) : catPrice;

                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: scale(12),
                        borderRadius: scale(14),
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? colors.amber : colors.border,
                        backgroundColor: isSelected ? 'rgba(245, 197, 24, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      }}
                      onPress={() => setBookingVehicle(cat.key as any)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10), flex: 1 }}>
                        <View style={{
                          width: scale(38),
                          height: scale(38),
                          borderRadius: scale(10),
                          backgroundColor: isSelected ? colors.amber : 'rgba(255, 255, 255, 0.08)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <MaterialIcons name={cat.icon as any} size={scale(22)} color={isSelected ? '#101014' : colors.textPrimary} />
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                            <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: moderateFontScale(13) }}>
                              {cat.label}
                            </Text>
                            {isSelected && (
                              <View style={{ backgroundColor: colors.amber, paddingHorizontal: scale(6), paddingVertical: 1, borderRadius: scale(4) }}>
                                <Text style={{ color: '#101014', fontWeight: '900', fontSize: moderateFontScale(9) }}>SELECTED</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10.5), marginTop: 2 }}>
                            {cat.capacity} • {cat.desc}
                          </Text>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end', marginLeft: scale(8) }}>
                        <Text style={{ color: colors.amber, fontWeight: '900', fontSize: moderateFontScale(15) }}>
                          ₹{catPrice}
                        </Text>
                        {!adminState.instantBookingEnabled && (
                          <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(9.5) }}>
                            Deposit ₹{catDeposit}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>



            {/* CHECKPOINTS VISUAL CARDS & ITINERARY */}
            <View style={{ width: '100%', marginVertical: verticalScale(10) }}>
              <Text style={{ color: colors.amber, fontSize: moderateFontScale(11), fontWeight: '800', letterSpacing: 0.5, marginBottom: verticalScale(10) }}>
                TOUR ITINERARY CHECKPOINTS ({selectedPlan.checkpoints.length} STOPS)
              </Text>

              <View style={{ gap: verticalScale(10) }}>
                {selectedPlan.checkpoints.map((cp: any, index: number) => {
                  const cpName = typeof cp === 'string' ? cp : (cp.name || cp.title || `Stop ${index + 1}`);
                  const cpDesc = typeof cp === 'object' ? (cp.description || cp.location || 'Key sightseeing attraction & photo stopover') : 'Featured landmark & sightseeing checkpoint';
                  const cpImg = typeof cp === 'object' && Array.isArray(cp.images) && cp.images.length > 0
                    ? cp.images[0]
                    : (typeof cp === 'object' && cp.image ? cp.image : [
                      'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=500',
                      'https://images.unsplash.com/photo-1600100397608-f010e42ec9ab?w=500',
                      'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=500',
                      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=500',
                    ][index % 4]);

                  return (
                    <View
                      key={index}
                      style={{
                        flexDirection: 'row',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: scale(14),
                        borderWidth: 1,
                        borderColor: colors.border,
                        overflow: 'hidden',
                        padding: scale(10),
                        gap: scale(12),
                        alignItems: 'center',
                      }}
                    >
                      <Image
                        source={{ uri: cpImg }}
                        style={{ width: scale(72), height: scale(72), borderRadius: scale(10), backgroundColor: '#212129' }}
                      />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), marginBottom: verticalScale(2) }}>
                          <View style={{ backgroundColor: colors.amber, paddingHorizontal: scale(6), paddingVertical: verticalScale(2), borderRadius: scale(6) }}>
                            <Text style={{ color: '#101014', fontSize: moderateFontScale(9), fontWeight: '900' }}>STOP {index + 1}</Text>
                          </View>
                        </View>
                        <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(14), fontWeight: '800' }} numberOfLines={1}>
                          {cpName}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), marginTop: verticalScale(2) }} numberOfLines={2}>
                          {cpDesc}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.counterRow}>
              <Text style={[styles.selectorLabel, { color: colors.textPrimary }]}>Number of Passengers</Text>
              <View style={styles.counterControls}>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setBookingPax(Math.max(1, bookingPax - 1))}>
                  <Text style={styles.counterBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={[styles.counterVal, { color: colors.textPrimary }]}>{bookingPax}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setBookingPax(Math.min(10, bookingPax + 1))}>
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pre-Booking Date & Time Pickers */}
            {!adminState.instantBookingEnabled && (
              <View style={{ marginTop: verticalScale(14) }}>
                <Text style={[styles.selectorLabel, { color: colors.textPrimary, marginBottom: verticalScale(8) }]}>Select Pre-Booking Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: verticalScale(12) }}>
                  {dateOptions.map((opt) => {
                    const isSelected = bookingDate === opt.dateStr;
                    return (
                      <TouchableOpacity
                        key={opt.dateStr}
                        style={{
                          width: scale(50),
                          height: verticalScale(52),
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
                        <Text style={{ fontSize: moderateFontScale(12), fontWeight: '900', color: isSelected ? '#101014' : colors.textPrimary, marginVertical: verticalScale(1) }}>{opt.dayNum}</Text>
                        <Text style={{ fontSize: moderateFontScale(8), fontWeight: '800', color: isSelected ? '#101014' : colors.textMuted }}>{opt.monthName.toUpperCase()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.selectorLabel, { color: colors.textPrimary, marginBottom: verticalScale(8) }]}>Select Booking Time</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', padding: scale(8), borderRadius: scale(12), borderWidth: 1.5, borderColor: colors.border }}>
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

            {/* PAYMENT METHOD SELECTOR (CASH vs UPI) - ONLY SHOW FOR INSTANT BOOKINGS */}
            {adminState.instantBookingEnabled && (
              <View style={{ marginTop: verticalScale(14), marginBottom: verticalScale(6) }}>
                <Text style={[styles.selectorLabel, { color: colors.textPrimary, marginBottom: verticalScale(8) }]}>
                  Select Payment Mode
                </Text>
                <View style={{ flexDirection: 'row', gap: scale(10) }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: verticalScale(10),
                      borderRadius: scale(12),
                      borderWidth: 1.5,
                      borderColor: paymentMethod === 'cash' ? colors.amber : colors.border,
                      backgroundColor: paymentMethod === 'cash' ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255,255,255,0.03)',
                      gap: scale(6),
                    }}
                    onPress={() => setPaymentMethod('cash')}
                  >
                    <MaterialIcons name="currency-rupee" size={scale(18)} color={paymentMethod === 'cash' ? colors.amber : colors.textMuted} />
                    <Text style={{ color: paymentMethod === 'cash' ? colors.amber : colors.textPrimary, fontWeight: '800', fontSize: moderateFontScale(13) }}>
                      Cash
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: verticalScale(10),
                      borderRadius: scale(12),
                      borderWidth: 1.5,
                      borderColor: paymentMethod === 'upi' ? colors.amber : colors.border,
                      backgroundColor: paymentMethod === 'upi' ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255,255,255,0.03)',
                      gap: scale(6),
                    }}
                    onPress={() => setPaymentMethod('upi')}
                  >
                    <MaterialIcons name="qr-code" size={scale(18)} color={paymentMethod === 'upi' ? colors.amber : colors.textMuted} />
                    <Text style={{ color: paymentMethod === 'upi' ? colors.amber : colors.textPrimary, fontWeight: '800', fontSize: moderateFontScale(13) }}>
                      Wallet
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* PRE-BOOKING PAYMENT CHOICE (20% ADVANCE vs 100% FULL) */}
            {!adminState.instantBookingEnabled && (
              <View style={{ marginTop: verticalScale(12), marginBottom: verticalScale(6) }}>
                <Text style={[styles.selectorLabel, { color: colors.textPrimary, marginBottom: verticalScale(8) }]}>
                  Payment Option (Pre-Booking)
                </Text>
                <View style={{ flexDirection: 'row', gap: scale(10) }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: verticalScale(10),
                      paddingHorizontal: scale(10),
                      borderRadius: scale(12),
                      borderWidth: 1.5,
                      borderColor: preBookingPaymentChoice === 'advance_20' ? colors.amber : colors.border,
                      backgroundColor: preBookingPaymentChoice === 'advance_20' ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255,255,255,0.03)',
                      alignItems: 'center',
                    }}
                    onPress={() => setPreBookingPaymentChoice('advance_20')}
                  >
                    <Text style={{ color: preBookingPaymentChoice === 'advance_20' ? colors.amber : colors.textPrimary, fontWeight: '900', fontSize: moderateFontScale(12.5) }}>
                      20% Advance
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10), marginTop: 2, textAlign: 'center' }}>
                      Pay 20% now, 80% to driver
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: verticalScale(10),
                      paddingHorizontal: scale(10),
                      borderRadius: scale(12),
                      borderWidth: 1.5,
                      borderColor: preBookingPaymentChoice === 'full_100' ? colors.amber : colors.border,
                      backgroundColor: preBookingPaymentChoice === 'full_100' ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255,255,255,0.03)',
                      alignItems: 'center',
                    }}
                    onPress={() => setPreBookingPaymentChoice('full_100')}
                  >
                    <Text style={{ color: preBookingPaymentChoice === 'full_100' ? colors.amber : colors.textPrimary, fontWeight: '900', fontSize: moderateFontScale(12.5) }}>
                      100% Full Payment
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10), marginTop: 2, textAlign: 'center' }}>
                      Pay 100% full fare now
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* PRE-BOOKING FEES BREAKDOWN CARD */}
            {(() => {
              const priceInfo = calculatePackagePrice(selectedPlan, bookingVehicle);
              const { computedPrice, baseDayRate, extraHoursRounded, extraAddonCharge, vehicleHourlyRate, totalTripHours } = priceInfo;
              const isPreBooking = !adminState.instantBookingEnabled;
              const is20Percent = isPreBooking && preBookingPaymentChoice === 'advance_20';
              const advancePayable = is20Percent ? Math.round(computedPrice * 0.20) : computedPrice;
              const remainingBalance = is20Percent ? (computedPrice - advancePayable) : 0;

              return (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6), marginTop: verticalScale(14) }}>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>Base Travel Duration</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: moderateFontScale(11) }}>{selectedPlan.travelHours.toFixed(1)} hours</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6) }}>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>Checkpoints Addon ({selectedPlan.checkpoints.length} stops)</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: moderateFontScale(11) }}>+{selectedPlan.checkpoints.length} hours</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6) }}>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>Total Trip Duration</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: moderateFontScale(11) }}>{totalTripHours.toFixed(1)} hours</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6) }}>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>Base Package Rate</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: moderateFontScale(11) }}>₹{baseDayRate}</Text>
                  </View>
                  {extraHoursRounded > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6) }}>
                      <Text style={{ color: colors.danger, fontSize: moderateFontScale(11), fontWeight: '600' }}>Extra Hours Add-on ({extraHoursRounded} hrs)</Text>
                      <Text style={{ color: colors.danger, fontWeight: '700', fontSize: moderateFontScale(11) }}>+₹{extraAddonCharge}</Text>
                    </View>
                  )}

                  <View style={{ height: 1, backgroundColor: colors.border, marginVertical: verticalScale(8) }} />

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
                      <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>Total Package Fare</Text>
                      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: moderateFontScale(12) }}>₹{computedPrice}</Text>
                    </View>

                    {isPreBooking ? (
                      <>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(6) }}>
                          <Text style={{ color: colors.amber, fontSize: moderateFontScale(12), fontWeight: '800' }}>Pre-Booking Fees ({paymentMethod.toUpperCase()})</Text>
                          <Text style={{ color: colors.amber, fontWeight: '900', fontSize: moderateFontScale(15) }}>₹{advancePayable}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>Remaining Balance at Trip</Text>
                          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: moderateFontScale(11) }}>₹{remainingBalance}</Text>
                        </View>
                      </>
                    ) : (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.amber, fontSize: moderateFontScale(12), fontWeight: '800' }}>Full Payment ({paymentMethod.toUpperCase()})</Text>
                        <Text style={{ color: colors.amber, fontWeight: '900', fontSize: moderateFontScale(15) }}>₹{computedPrice}</Text>
                      </View>
                    )}
                  </View>
                </>
              );
            })()}

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                !selectedPlan && { backgroundColor: '#3A3A40', opacity: 0.6 }
              ]}
              activeOpacity={0.8}
              disabled={!selectedPlan}
              onPress={handleConfirmBooking}
            >
              <MaterialIcons name={paymentMethod === 'cash' ? "currency-rupee" : "payment"} size={scale(20)} color="#101014" />
              <Text style={styles.confirmBtnText}>
                {paymentMethod === 'cash'
                  ? (!adminState.instantBookingEnabled
                    ? `Book via Cash (Pre-Booking Fees ₹${Math.round(calculatePackagePrice(selectedPlan, bookingVehicle).computedPrice * 0.20)})`
                    : `Total Fare ₹${calculatePackagePrice(selectedPlan, bookingVehicle).computedPrice}`)
                  : (!adminState.instantBookingEnabled
                    ? `Pay Pre-Booking Fees (₹${Math.round(calculatePackagePrice(selectedPlan, bookingVehicle).computedPrice * 0.20)})`
                    : `Pay Total Fare (₹${calculatePackagePrice(selectedPlan, bookingVehicle).computedPrice})`)}
              </Text>
            </TouchableOpacity>

            <View style={{ height: verticalScale(30) }} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101014',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(10),
  },
  backButton: {
    padding: scale(6),
  },
  headerTitle: {
    fontSize: moderateFontScale(17),
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(30),
  },
  welcomeBanner: {
    marginVertical: verticalScale(10),
  },
  welcomeTitle: {
    fontSize: moderateFontScale(22),
    fontWeight: '900',
    color: '#ffffff',
  },
  welcomeSub: {
    fontSize: moderateFontScale(12),
    marginTop: verticalScale(4),
    lineHeight: moderateFontScale(17),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(15),
    paddingHorizontal: scale(12),
    height: scale(44),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(14),
  },
  searchIcon: {
    marginRight: scale(6),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateFontScale(13),
    padding: 0,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
  },
  packageCard: {
    borderWidth: 1,
    borderRadius: scale(22),
    overflow: 'hidden',
    marginBottom: verticalScale(6),
  },
  packageImage: {
    width: '100%',
    height: verticalScale(160),
  },
  packageBody: {
    padding: scale(16),
  },
  packageName: {
    fontSize: moderateFontScale(17),
    fontWeight: '800',
  },
  checkpointsBlock: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: scale(10),
    padding: scale(10),
    marginVertical: verticalScale(10),
  },
  blockLabel: {
    color: '#F5C518',
    fontSize: moderateFontScale(9),
    fontWeight: '800',
    marginBottom: verticalScale(4),
  },
  checkpointsText: {
    fontSize: moderateFontScale(12.5),
    lineHeight: moderateFontScale(17),
  },
  timeBreakdownRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(6),
    marginBottom: verticalScale(12),
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: scale(8),
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(8),
  },
  timeVal: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: verticalScale(8),
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(4),
  },
  totalDurationLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: moderateFontScale(9),
    fontWeight: '800',
  },
  totalDurationVal: {
    fontSize: moderateFontScale(18),
    fontWeight: '900',
  },
  bookBtn: {
    backgroundColor: '#F5C518',
    borderRadius: scale(12),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(20),
  },
  bookBtnText: {
    color: '#101014',
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#101014',
  },
  modalContent: {
    flex: 1,
    width: '100%',
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(10),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: moderateFontScale(18),
    fontWeight: '900',
  },
  modalPlanName: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(12),
  },
  priceBox: {
    borderRadius: scale(14),
    padding: scale(14),
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: moderateFontScale(10),
    fontWeight: '800',
  },
  priceValue: {
    fontSize: moderateFontScale(28),
    fontWeight: '900',
    marginVertical: verticalScale(4),
  },
  priceSubText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: moderateFontScale(10),
  },
  selectorLabel: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
    marginBottom: verticalScale(6),
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(4)
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  counterBtn: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    color: '#ffffff',
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  counterVal: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scale(8),
    marginTop: verticalScale(4),
  },
  vehiclePill: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: scale(12),
    padding: scale(8),
    alignItems: 'center',
  },
  vehiclePillText: {
    fontSize: moderateFontScale(11),
    fontWeight: '800',
  },
  vehiclePillRate: {
    fontSize: moderateFontScale(10),
    color: 'rgba(255,255,255,0.4)',
    marginTop: verticalScale(2),
  },
  prebookDisclaimer: {
    fontSize: moderateFontScale(10),
    marginBottom: verticalScale(8),
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  inputTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: moderateFontScale(10),
    marginBottom: verticalScale(4),
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: scale(10),
    height: scale(38),
    paddingHorizontal: scale(10),
    fontSize: moderateFontScale(12),
  },
  confirmBtn: {
    backgroundColor: '#F5C518',
    borderRadius: scale(14),
    height: scale(48),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(20),
  },
  confirmBtnText: {
    color: '#101014',
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  loadingStep: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
  },
  loadingTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    marginTop: verticalScale(14),
  },
  loadingSub: {
    fontSize: moderateFontScale(12),
    textAlign: 'center',
    marginTop: verticalScale(6),
    paddingHorizontal: scale(20),
  },
  successStep: {
    alignItems: 'center',
    paddingVertical: verticalScale(20),
  },
  successTitle: {
    fontSize: moderateFontScale(20),
    fontWeight: '900',
    marginTop: verticalScale(10),
  },
  driverDetailCard: {
    width: '100%',
    borderRadius: scale(14),
    padding: scale(14),
    marginVertical: verticalScale(16),
    alignItems: 'center',
  },
  driverName: {
    color: '#F5C518',
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
  driverSub: {
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(2),
  },
  successNote: {
    fontSize: moderateFontScale(11),
    textAlign: 'center',
    paddingHorizontal: scale(10),
    marginBottom: verticalScale(20),
  },
  doneBtn: {
    backgroundColor: '#F5C518',
    borderRadius: scale(14),
    height: scale(44),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#101014',
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
  packageListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(14),
    padding: scale(10),
  },
  packageRowImage: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(10),
  },
  packageRowBody: {
    flex: 1,
    marginLeft: scale(12),
    justifyContent: 'center',
  },
  packageNameText: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  metaInfoRow: {
    marginTop: verticalScale(4),
  },
  metaText: {
    fontSize: moderateFontScale(11),
  },
  durationsRow: {
    marginTop: verticalScale(4),
  },
  durationValText: {
    fontSize: moderateFontScale(11.5),
    fontWeight: '700',
  },
  rowActionCol: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(6),
  },
  rowBookBtn: {
    backgroundColor: '#F5C518',
    borderRadius: scale(8),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(14),
  },
  rowBookBtnText: {
    color: '#101014',
    fontSize: moderateFontScale(12),
    fontWeight: '800',
  },
});
