import { adminState } from '@/constants/admin-state';
import {
  bookTripApi,
  deductWalletApi,
  fetchGuidesApi,
  fetchWalletBalanceApi,
  submitWalletDeductionRequestApi,
} from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { sendLocalNotification } from '@/constants/notifications';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppModal } from '@src/context/ModalContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapView, { Marker } from '@/components/react-native-maps';

import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/src/components/LanguageSelector';

interface Guide {
  id: string;
  name: string;
  city: string;
  experience: number;
  languages: string[];
  specialty: string;
  description: string;
  avatarColor: string;
  image: string;
  chargePerHour: number;
  latitude: number;
  longitude: number;
}

const mockGuides: Guide[] = [];

export default function GuidesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialInstantParam = params.instantBooking === 'true';
  const { showSuccess, showError } = useAppModal();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const session = getUserSessionSync();

  // Dynamic guides list state
  const [guidesList, setGuidesList] = useState<Guide[]>([]);
  const [loadingGuides, setLoadingGuides] = useState(false);

  // Booking process states
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [bookingStep, setBookingStep] = useState<'none' | 'loading' | 'map' | 'datetime' | 'accepted'>('none');

  const getTodayDateString = () => {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  // Advanced prebooking fields initialized with today date
  const [prebookDate, setPrebookDate] = useState(getTodayDateString());
  const [prebookHour, setPrebookHour] = useState<number>(10);
  const [prebookMinute, setPrebookMinute] = useState<number>(0);
  const [prebookAmPm, setPrebookAmPm] = useState<'AM' | 'PM'>('AM');
  const prebookTimeStr = `${prebookHour}:${prebookMinute < 10 ? '0' + prebookMinute : prebookMinute} ${prebookAmPm}`;

  // Prebooking Deposit Option (20% Minimum Advance OR 100% Full Payment)
  const [prebookPayOption, setPrebookPayOption] = useState<'20' | '100'>('20');
  const [instantPaymentMode, setInstantPaymentMode] = useState<'wallet' | 'cash'>('wallet');

  // Prebooking Date Options (15 Days)
  const dateOptions = Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
      monthName: d.toLocaleDateString('en-US', { month: 'short' }),
    };
  });

  useEffect(() => {
    let isMounted = true;
    async function loadDynamicGuides() {
      setLoadingGuides(true);
      try {
        const rawGuides = await fetchGuidesApi();
        if (isMounted) {
          const formattedBackendGuides: Guide[] = (rawGuides || []).map((g: any, index: number) => ({
            id: g.user_id || g.id || `bg_${index}`,
            name: g.name || 'Certified Local Guide',
            city: g.city || 'Hampi',
            experience: Number(g.experience) || 5,
            languages: Array.isArray(g.languages) ? g.languages : ['Kannada', 'English', 'Hindi'],
            specialty: g.expertise || 'Heritage & Cultural Tours',
            description: g.bio || 'Government certified tourist guide with extensive local history knowledge.',
            avatarColor: '#E07A5F',
            image: g.photo_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            chargePerHour: Number(g.daily_rate) || 2000,
            latitude: Number(g.latitude) || (15.3350 + (index * 0.005)),
            longitude: Number(g.longitude) || (76.4600 + (index * 0.005)),
          }));
          setGuidesList(formattedBackendGuides);
        }
      } catch (err) {
        console.warn('Error loading dynamic guides:', err);
      } finally {
        if (isMounted) setLoadingGuides(false);
      }
    }
    loadDynamicGuides();
    return () => { isMounted = false; };
  }, []);

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
    success: '#10B981',
    danger: '#ef4444',
  };

  const filteredGuides = guidesList.filter(
    (g) =>
      g.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startBookingFlow = (guide: Guide) => {
    // Check if tourist already has an active ongoing guide tour
    const existingActiveTrip = (adminState.userTrips || []).find((t: any) => {
      if (!t) return false;
      const isGuide = t.type === 'guide' || String(t.title || '').toLowerCase().includes('guide');
      const st = String(t.status || '').toLowerCase();
      const isActive = !st.includes('cancel') && !st.includes('decline') && st !== 'completed';
      return isGuide && isActive;
    });

    if (existingActiveTrip) {
      Alert.alert(
        '⚠️ Active Guide Tour In Progress',
        `You already have an active guide booking ("${existingActiveTrip.title}").\n\nPlease complete or cancel your current tour on the Trips screen before booking another guide.`,
        [
          { text: 'View Active Trip', onPress: () => router.push('/(tabs)/trips') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setSelectedGuide(guide);
    if (adminState.instantBookingEnabled) {
      setBookingStep('loading');
      setTimeout(() => {
        setBookingStep('map');
      }, 1000);
    } else {
      const tomorrow = dateOptions.length > 0 ? dateOptions[0].dateStr : new Date().toISOString().split('T')[0];
      setPrebookDate(tomorrow);
      setPrebookPayOption('20');
      setBookingStep('datetime');
    }
  };

  const validatePrebookDate = (dateStr: string) => {
    if (!dateStr) return { valid: false, error: 'Please select a date.' };
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { valid: false, error: 'Invalid date format.' };

    const selectedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();

    selectedDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { valid: false, error: 'Pre-booking date cannot be in the past.' };
    }
    if (diffDays > 15) {
      return { valid: false, error: 'Pre-booking restricted to 15 days in advance only.' };
    }
    return { valid: true };
  };

  const confirmPrebooking = async () => {
    const check = validatePrebookDate(prebookDate);
    if (!check.valid) {
      if (showError) showError('Date Restriction', check.error);
      else Alert.alert('Date Restriction', check.error);
      return;
    }
    setBookingStep('loading');

    try {
      const session = getUserSessionSync();
      const customerId = session?.id || 't1';
      const customerName = session?.name || 'Tourist Client';
      const fareAmt = selectedGuide ? selectedGuide.chargePerHour : 2000;

      // Calculate deposit & deduction amount (Wallet Money automatically picked)
      const amountToDeduct = prebookPayOption === '20' ? Math.round(fareAmt * 0.20) : fareAmt;

      if (amountToDeduct > 0) {
        const deductRes = await deductWalletApi({
          userId: customerId,
          amount: amountToDeduct,
          description: `Payment for Guide Tour - ${selectedGuide?.name}`,
        });

        if (!deductRes || !deductRes.success) {
          setBookingStep('datetime');
          const errorMsg = deductRes?.message || 'Insufficient wallet balance. Please top up first.';
          if (showError) showError('Payment Failed', errorMsg);
          else Alert.alert('Payment Failed', errorMsg);
          return;
        }

        await submitWalletDeductionRequestApi({
          userId: customerId,
          userName: customerName,
          role: 'tourist',
          amount: amountToDeduct,
          description: `Guide Pre-Booking Deposit for ${selectedGuide?.name} (${prebookPayOption}% Advance)`,
        });
      }

      // Construct scheduled time safely
      let scheduledTimeStr: string | null = null;
      try {
        const effectiveDateStr = prebookDate && prebookDate.includes('-') ? prebookDate : getTodayDateString();
        const dateParts = effectiveDateStr.split('-').map(Number);
        const year = dateParts[0] || new Date().getFullYear();
        const month = (dateParts[1] || (new Date().getMonth() + 1)) - 1;
        const day = dateParts[2] || new Date().getDate();

        let finalHour = prebookHour || 10;
        if (prebookAmPm === 'PM' && finalHour !== 12) {
          finalHour += 12;
        } else if (prebookAmPm === 'AM' && finalHour === 12) {
          finalHour = 0;
        }
        const dateObj = new Date(year, month, day, finalHour, prebookMinute || 0);
        if (!isNaN(dateObj.getTime())) {
          scheduledTimeStr = dateObj.toISOString();
        } else {
          scheduledTimeStr = new Date().toISOString();
        }
      } catch (e) {
        console.warn('Prebook date parsing fallback:', e);
        scheduledTimeStr = new Date().toISOString();
      }

      // 3. Dispatch Booking Request to Backend
      const bookRes = await bookTripApi({
        tripType: 'guide',
        title: `Guided tour of ${selectedGuide?.city} with ${selectedGuide?.name}`,
        customerId: customerId,
        customerName: customerName,
        pickupName: `${selectedGuide?.city} Landmark Center`,
        dropName: `${selectedGuide?.city} Sightseeing Spots`,
        amount: fareAmt,
        paymentMode: 'wallet',
        bookingType: 'prebook',
        scheduledTime: scheduledTimeStr,
        advanceDepositPaid: amountToDeduct,
        remainingCashBalance: fareAmt - amountToDeduct,
      });

      const tripId = bookRes?.data?.id || `guide_book_${Date.now()}`;
      const generatedOtp = bookRes?.data?.otp || '8240';
      const generatedEndOtp = bookRes?.data?.end_otp || bookRes?.data?.endOtp || '4321';

      if (!Array.isArray(adminState.userTrips)) {
        adminState.userTrips = [];
      }
      adminState.userTrips.unshift({
        id: tripId,
        type: 'guide',
        title: `Guided tour of ${selectedGuide?.city} with ${selectedGuide?.name}`,
        driverOrGuideName: selectedGuide?.name || 'Guide',
        customerId: customerId,
        customerName: customerName,
        date: prebookDate,
        time: prebookTimeStr,
        price: fareAmt,
        paymentMode: 'Wallet',
        status: 'Pending Guide Confirmation',
        bookingType: 'prebook',
        advanceDepositPaid: amountToDeduct,
        remainingCashBalance: fareAmt - amountToDeduct,
        otp: generatedOtp,
        endOtp: generatedEndOtp,
      });

      // 4. Toast Notification: "Request sent to guide"
      if (showSuccess) {
        showSuccess('Request Sent to Guide', `Pre-booking request sent to ${selectedGuide?.name}. Waiting for guide confirmation.`);
      }
      sendLocalNotification(
        '🚩 Request Sent to Guide!',
        `Your booking request has been sent to ${selectedGuide?.name}.`
      );

      router.push('/(tabs)/trips');
    } catch (err) {
      console.error('Error confirming prebooking:', err);
      if (showError) showError('Booking Error', 'Failed to complete pre-booking request.');
    } finally {
      setBookingStep('none');
      setSelectedGuide(null);
    }
  };

  const checkoutGuide = async () => {
    if (!selectedGuide) return;
    setBookingStep('loading');

    try {
      const session = getUserSessionSync();
      const finalDate = adminState.instantBookingEnabled ? 'Today (Instant)' : prebookDate;
      const finalTime = adminState.instantBookingEnabled ? 'Immediate' : prebookTimeStr;
      const fareAmt = selectedGuide.chargePerHour;
      const customerId = session?.id || 't1';
      const customerName = session?.name || 'Tourist Client';

      // Perform wallet deduction if paying via wallet
      if (instantPaymentMode === 'wallet' && fareAmt > 0) {
        const deductRes = await deductWalletApi({
          userId: customerId,
          amount: fareAmt,
          description: `Payment for Guided Tour with ${selectedGuide.name}`,
        });

        if (!deductRes || !deductRes.success) {
          const errorMsg = deductRes?.message || 'Insufficient wallet balance. Please top up first.';
          if (showError) showError('Payment Failed', errorMsg);
          else Alert.alert('Payment Failed', errorMsg);
          setBookingStep('none');
          return;
        }

        await submitWalletDeductionRequestApi({
          userId: customerId,
          userName: customerName,
          role: 'tourist',
          amount: fareAmt,
          description: `Instant Guide Booking Payment for ${selectedGuide.name}`,
        });
      }

      const bookRes = await bookTripApi({
        tripType: 'guide',
        title: `Guided tour of ${selectedGuide.city} with ${selectedGuide.name}`,
        customerId: customerId,
        customerName: customerName,
        pickupName: `${selectedGuide.city} Landmark Center`,
        dropName: `${selectedGuide.city} Sightseeing Spots`,
        amount: fareAmt,
        paymentMode: instantPaymentMode,
        bookingType: adminState.instantBookingEnabled ? 'instant' : 'prebook',
      });

      const tripId = bookRes?.data?.id || bookRes?.id || `guide_book_${Date.now()}`;

      if (showSuccess) {
        showSuccess('Request Sent to Guide', `Instant request sent to ${selectedGuide.name}. Waiting for guide response.`);
      }
      sendLocalNotification(
        '🚩 Request Sent to Guide!',
        `Booking request sent for ${selectedGuide.name}. Waiting for guide confirmation.`
      );

      if (!Array.isArray(adminState.userTrips)) {
        adminState.userTrips = [];
      }
      adminState.userTrips.unshift({
        id: tripId,
        type: 'guide',
        title: `Guided tour of ${selectedGuide.city} with ${selectedGuide.name}`,
        driverOrGuideName: selectedGuide.name,
        customerId: session?.id || 't1',
        customerName: session?.name || 'Tourist Client',
        date: finalDate,
        time: finalTime,
        price: fareAmt,
        paymentMode: instantPaymentMode === 'wallet' ? 'Wallet' : 'Cash',
        status: 'Pending Guide Confirmation',
        bookingType: adminState.instantBookingEnabled ? 'instant' : 'prebook',
        otp: '8240',
        endOtp: '4321',
      });

      router.push('/(tabs)/trips');
    } catch (e) {
      console.error('checkoutGuide error:', e);
      if (showError) showError('Booking Error', 'Failed to complete guide booking.');
    } finally {
      setBookingStep('none');
      setSelectedGuide(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary }]}>{t('hireLocalGuideHeader')}</Text>
        <LanguageSelector compact />
      </View>

      {/* TOP SEARCH BAR */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { flex: 1, borderColor: colors.border }]}>
          <MaterialIcons name="search" size={scale(20)} color={colors.amber} style={styles.searchIcon} />
          <TextInput
            placeholder="Search guides by city or area..."
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
      </View>

      {/* Guides List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.listHeader, { color: colors.amber }]}>
          {searchQuery.trim() === '' ? 'Highly Recommended Guides' : `Guides matching "${searchQuery}"`}
        </Text>

        {loadingGuides ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.amber} />
            <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: moderateFontScale(13) }}>
              Fetching verified guides from database...
            </Text>
          </View>
        ) : filteredGuides.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <MaterialIcons name="explore-off" size={scale(40)} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: scale(8), fontSize: moderateFontScale(13) }}>
              No certified local guides found in this city.
            </Text>
          </View>
        ) : (
          filteredGuides.map((guide) => (
            <View key={guide.id} style={[styles.guideCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              {/* Photo & main Info */}
              <View style={styles.guideCardHeader}>
                <Image source={{ uri: guide.image }} style={styles.guidePhoto} />
                <View style={styles.guideMeta}>
                  <Text style={[styles.guideName, { color: colors.textPrimary }]}>{guide.name}</Text>

                  <View style={styles.infoBadgeRow}>
                    <Text style={[styles.cityText, { color: colors.amber }]}>{guide.city}</Text>
                    <View style={styles.dotSeparator} />
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>
                      💼 {guide.experience} Yrs Working Exp.
                    </Text>
                  </View>

                  <Text style={[styles.specialtyText, { color: colors.textPrimary }]} numberOfLines={1}>
                    Area: {guide.specialty}
                  </Text>
                </View>
              </View>

              {/* Languages tags */}
              <View style={styles.langRow}>
                {guide.languages.map((lang, idx) => (
                  <View key={idx} style={[styles.langBadge, { borderColor: colors.border }]}>
                    <Text style={[styles.langText, { color: colors.textMuted }]}>{lang}</Text>
                  </View>
                ))}
              </View>

              {/* Price & Book Footer */}
              <View style={[styles.guideCardFooter, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10) }}>CHARGE RATE</Text>
                  <Text style={[styles.priceValue, { color: colors.amber }]}>₹{guide.chargePerHour}/Day</Text>
                </View>
                <TouchableOpacity
                  style={[styles.bookBtn, { backgroundColor: colors.amber }]}
                  onPress={() => startBookingFlow(guide)}
                >
                  <Text style={styles.bookBtnText}>Book Guide</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Loading Modal */}
      <Modal visible={bookingStep === 'loading'} transparent animationType="fade">
        <View style={styles.overlayModal}>
          <View style={[styles.loadingBox, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.amber} />
            <Text style={{ color: colors.textPrimary, marginTop: scale(12), fontWeight: '700' }}>
              Communicating with Guides nearby...
            </Text>
          </View>
        </View>
      </Modal>

      {/* MAP MODAL (Instant Booking ON - Original Radar Match UI) */}
      <Modal visible={bookingStep === 'map'} transparent animationType="slide">
        <View style={styles.overlayModal}>
          <View style={[styles.mapContainerBox, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Radar Nearby guide Search</Text>
              <TouchableOpacity onPress={() => setBookingStep('none')}>
                <MaterialIcons name="close" size={scale(20)} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Map Area */}
            <View style={[styles.mockMapArea, { backgroundColor: isDark ? '#141416' : '#EFEFF4' }]}>
              {Platform.OS !== 'web' && MapView ? (
                <MapView
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={{
                    latitude: selectedGuide?.latitude || 12.9716,
                    longitude: selectedGuide?.longitude || 77.5946,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: (selectedGuide?.latitude || 12.9716) - 0.005,
                      longitude: (selectedGuide?.longitude || 77.5946) + 0.003,
                    }}
                    title="Your Location"
                    pinColor="blue"
                  />
                  {selectedGuide && (
                    <Marker
                      coordinate={{
                        latitude: selectedGuide.latitude,
                        longitude: selectedGuide.longitude,
                      }}
                      title={selectedGuide.name}
                    />
                  )}
                </MapView>
              ) : (
                <View style={styles.fallbackMapGraphic}>
                  <View style={styles.pulseRadar1} />
                  <View style={styles.pulseRadar2} />
                  <View style={[styles.mapPin, { left: '40%', top: '50%', backgroundColor: colors.amber }]}>
                    <MaterialIcons name="person-pin" size={scale(16)} color="#101010" />
                  </View>
                  <View style={[styles.mapPin, { right: '35%', top: '35%', backgroundColor: colors.success }]}>
                    <MaterialIcons name="explore" size={scale(16)} color="#ffffff" />
                  </View>
                  <Text style={[styles.radarInfoText, { color: colors.textMuted }]}>
                    ⚡ Radar ping match: {selectedGuide?.name} is 350 meters away!
                  </Text>
                </View>
              )}
            </View>

            {/* Radar result acceptance */}
            <View style={styles.acceptedMessageBox}>
              <MaterialIcons name="check-circle" size={scale(36)} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.matchStatus, { color: colors.success }]}>Instant Match Dispatched!</Text>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(13) }}>
                  Booking request sent to {selectedGuide?.name}. Waiting for live response...
                </Text>
              </View>
            </View>

            {/* Instant Payment Selector: Both Cash & Wallet Supported */}
            <View style={{ paddingHorizontal: scale(18), marginBottom: verticalScale(10) }}>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), fontWeight: '700', marginBottom: 4 }}>
                Instant Payment Mode:
              </Text>
              <View style={{ flexDirection: 'row', gap: scale(10) }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: scale(8),
                    borderRadius: scale(8),
                    borderWidth: 1.5,
                    borderColor: instantPaymentMode === 'wallet' ? colors.amber : colors.border,
                    backgroundColor: instantPaymentMode === 'wallet' ? 'rgba(245,197,24,0.1)' : 'transparent',
                    alignItems: 'center',
                  }}
                  onPress={() => setInstantPaymentMode('wallet')}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(11), fontWeight: '800' }}>UPI / Wallet</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: scale(8),
                    borderRadius: scale(8),
                    borderWidth: 1.5,
                    borderColor: instantPaymentMode === 'cash' ? colors.amber : colors.border,
                    backgroundColor: instantPaymentMode === 'cash' ? 'rgba(245,197,24,0.1)' : 'transparent',
                    alignItems: 'center',
                  }}
                  onPress={() => setInstantPaymentMode('cash')}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(11), fontWeight: '800' }}>Cash</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Guide Info */}
            {selectedGuide && (
              <View style={[styles.compactGuideCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F5F5F7' }]}>
                <Image source={{ uri: selectedGuide.image }} style={styles.compactPhoto} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>{selectedGuide.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), marginTop: 2 }}>
                    City: {selectedGuide.city} · Mob: +91 98888 77712
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={[styles.actionConfirmBtn, { backgroundColor: colors.amber }]} onPress={checkoutGuide}>
              <Text style={styles.actionConfirmText}>Send Request to Guide</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DATE-TIME PRE-BOOKING MODAL (Original Layout + 20%/100% Deposit Option) */}
      <Modal visible={bookingStep === 'datetime'} transparent animationType="slide">
        <View style={styles.overlayModal}>
          <View style={[styles.mapContainerBox, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Pre-booking Guide</Text>
              <TouchableOpacity onPress={() => setBookingStep('none')}>
                <MaterialIcons name="close" size={scale(20)} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: scale(16) }} showsVerticalScrollIndicator={false}>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginBottom: verticalScale(14) }}>
                Pre-book certified local guides up to <Text style={{ color: colors.amber, fontWeight: '700' }}>15 days in advance</Text>.
              </Text>

              {/* Date Selection */}
              <View style={{ marginBottom: verticalScale(14) }}>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700', marginBottom: verticalScale(8) }}>Select Pre-Booking Date</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: verticalScale(10) }}>
                  {dateOptions.map((opt) => {
                    const isSelected = prebookDate === opt.dateStr;
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
                        onPress={() => setPrebookDate(opt.dateStr)}
                      >
                        <Text style={{ fontSize: moderateFontScale(8), fontWeight: '800', color: isSelected ? '#101014' : colors.textMuted }}>{opt.dayName.toUpperCase()}</Text>
                        <Text style={{ fontSize: moderateFontScale(13), fontWeight: '900', color: isSelected ? '#101014' : colors.textPrimary, marginVertical: verticalScale(2) }}>{opt.dayNum}</Text>
                        <Text style={{ fontSize: moderateFontScale(8), fontWeight: '800', color: isSelected ? '#101014' : colors.textMuted }}>{opt.monthName.toUpperCase()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Time Selection */}
              <View style={{ marginBottom: verticalScale(14) }}>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700', marginBottom: verticalScale(8) }}>Select Start Time</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', padding: scale(8), borderRadius: scale(12), borderWidth: 1.5, borderColor: colors.border }}>
                  {/* Hour Selection */}
                  <View style={{ alignItems: 'center', flex: 1.2 }}>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(9), fontWeight: '800', marginBottom: verticalScale(4) }}>HOUR</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                      <TouchableOpacity
                        style={{ width: scale(26), height: scale(26), borderRadius: scale(6), backgroundColor: '#3A3A40', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setPrebookHour(prev => prev === 1 ? 12 : prev - 1)}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: moderateFontScale(14) }}>-</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: moderateFontScale(15), fontWeight: '900', color: colors.textPrimary, width: scale(22), textAlign: 'center' }}>
                        {prebookHour < 10 ? '0' + prebookHour : prebookHour}
                      </Text>
                      <TouchableOpacity
                        style={{ width: scale(26), height: scale(26), borderRadius: scale(6), backgroundColor: '#3A3A40', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setPrebookHour(prev => prev === 12 ? 1 : prev + 1)}
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
                        onPress={() => setPrebookMinute(prev => prev === 0 ? 55 : prev - 5)}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: moderateFontScale(14) }}>-</Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: moderateFontScale(15), fontWeight: '900', color: colors.textPrimary, width: scale(22), textAlign: 'center' }}>
                        {prebookMinute < 10 ? '0' + prebookMinute : prebookMinute}
                      </Text>
                      <TouchableOpacity
                        style={{ width: scale(26), height: scale(26), borderRadius: scale(6), backgroundColor: '#3A3A40', justifyContent: 'center', alignItems: 'center' }}
                        onPress={() => setPrebookMinute(prev => prev === 55 ? 0 : prev + 5)}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: moderateFontScale(14) }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* AM/PM Switch */}
                  <View style={{ flexDirection: 'row', gap: scale(4), marginLeft: scale(10), flex: 1.3 }}>
                    {(['AM', 'PM'] as const).map((period) => {
                      const isSelected = prebookAmPm === period;
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
                          onPress={() => setPrebookAmPm(period)}
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

              {/* Pre-Booking Deposit Option (20% Advance OR 100% Full Payment) */}
              <View style={{ marginBottom: verticalScale(14) }}>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700', marginBottom: verticalScale(8) }}>Pre-Booking Deposit Option</Text>
                <View style={{ flexDirection: 'row', gap: scale(10) }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: scale(10),
                      borderRadius: scale(10),
                      borderWidth: 1.5,
                      borderColor: prebookPayOption === '20' ? colors.amber : colors.border,
                      backgroundColor: prebookPayOption === '20' ? 'rgba(245, 197, 24, 0.1)' : 'transparent',
                      alignItems: 'center',
                    }}
                    onPress={() => setPrebookPayOption('20')}
                  >
                    <Text style={{ color: colors.amber, fontSize: moderateFontScale(14), fontWeight: '900' }}>20%</Text>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10), fontWeight: '600', marginTop: 2 }}>Advance Deposit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: scale(10),
                      borderRadius: scale(10),
                      borderWidth: 1.5,
                      borderColor: prebookPayOption === '100' ? colors.amber : colors.border,
                      backgroundColor: prebookPayOption === '100' ? 'rgba(245, 197, 24, 0.1)' : 'transparent',
                      alignItems: 'center',
                    }}
                    onPress={() => setPrebookPayOption('100')}
                  >
                    <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(14), fontWeight: '900' }}>100%</Text>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10), fontWeight: '600', marginTop: 2 }}>Full Payment</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fare & Wallet Deduction Info */}
              {selectedGuide && (() => {
                const totalAmt = selectedGuide.chargePerHour;
                const depositAmt = prebookPayOption === '20' ? Math.round(totalAmt * 0.20) : totalAmt;
                return (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: scale(12), borderRadius: scale(12), borderWidth: 1, borderColor: colors.border, marginBottom: verticalScale(14) }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>Guide Charge Rate:</Text>
                      <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(11), fontWeight: '700' }}>₹{totalAmt}/Day</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }}>
                      <Text style={{ color: colors.amber, fontSize: moderateFontScale(11), fontWeight: '700' }}>Wallet Money Auto-Deduction ({prebookPayOption}%):</Text>
                      <Text style={{ color: colors.amber, fontSize: moderateFontScale(12), fontWeight: '900' }}>₹{depositAmt}</Text>
                    </View>
                  </View>
                );
              })()}

              <TouchableOpacity style={[styles.actionConfirmBtn, { backgroundColor: colors.amber, marginTop: verticalScale(10), marginHorizontal: 0 }]} onPress={confirmPrebooking}>
                <Text style={styles.actionConfirmText}>Submit Booking Request</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ACCEPTED FINAL MODAL FOR PRE-BOOKINGS */}
      <Modal visible={bookingStep === 'accepted'} transparent animationType="slide">
        <View style={styles.overlayModal}>
          <View style={[styles.mapContainerBox, { backgroundColor: colors.surface, padding: scale(20) }]}>
            <View style={{ alignItems: 'center', marginVertical: scale(10) }}>
              <View style={{ width: scale(56), height: scale(56), borderRadius: scale(28), backgroundColor: 'rgba(245, 197, 24, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: scale(12) }}>
                <MaterialIcons name="send" size={scale(32)} color={colors.amber} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.amber, fontSize: moderateFontScale(18) }]}>Request Sent to Guide!</Text>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginTop: scale(4), textAlign: 'center', paddingHorizontal: scale(10) }}>
                Your booking request has been dispatched to {selectedGuide?.name}. You can track the live confirmation status in your Trips tab.
              </Text>
            </View>

            <View style={[styles.acceptedDetailCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)', borderColor: colors.border }]}>
              {/* Date Row */}
              <View style={styles.infoRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                  <MaterialIcons name="event" size={scale(16)} color={colors.amber} />
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), fontWeight: '600' }}>SCHEDULE</Text>
                </View>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700' }}>
                  {prebookDate} at {prebookTimeStr}
                </Text>
              </View>

              <View style={[styles.acceptedDivider, { backgroundColor: colors.border }]} />

              {/* Status Row */}
              <View style={styles.infoRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                  <MaterialIcons name="hourglass-top" size={scale(16)} color={colors.amber} />
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), fontWeight: '600' }}>STATUS</Text>
                </View>
                <Text style={{ color: colors.amber, fontSize: moderateFontScale(12), fontWeight: '700' }}>Pending Guide Confirmation</Text>
              </View>
            </View>

            {selectedGuide && (
              <View style={[styles.compactGuideCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F5F5F7', marginTop: scale(14), borderColor: colors.border, borderWidth: 1, marginHorizontal: 0, width: '100%' }]}>
                <Image source={{ uri: selectedGuide.image }} style={styles.compactPhoto} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: moderateFontScale(13) }}>{selectedGuide.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10.5), marginTop: 2 }}>
                    Expertise: {selectedGuide.specialty}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionConfirmBtn, { backgroundColor: colors.amber, marginTop: scale(18), width: '100%', marginHorizontal: 0 }]}
              onPress={() => {
                setBookingStep('none');
                setSelectedGuide(null);
              }}
            >
              <Text style={styles.actionConfirmText}>Guide Booked ✓</Text>
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
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(12),
  },
  backButton: {
    padding: scale(4),
  },
  navTitle: {
    fontSize: moderateFontScale(17),
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(18),
    gap: scale(10),
    marginTop: verticalScale(4),
    marginBottom: verticalScale(12),
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
  scrollContent: {
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(30),
  },
  listHeader: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
    marginBottom: verticalScale(12),
  },
  emptyCard: {
    borderRadius: scale(20),
    padding: scale(30),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  guideCard: {
    borderRadius: scale(20),
    borderWidth: 1.2,
    padding: scale(14),
    marginBottom: verticalScale(12),
  },
  guideCardHeader: {
    flexDirection: 'row',
    gap: scale(12),
  },
  guidePhoto: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
  },
  guideMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  guideName: {
    fontSize: moderateFontScale(15),
    fontWeight: '800',
  },
  infoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(2),
  },
  cityText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
  dotSeparator: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: scale(6),
  },
  specialtyText: {
    fontSize: moderateFontScale(11),
    fontWeight: '600',
    marginTop: verticalScale(4),
  },
  langRow: {
    flexDirection: 'row',
    gap: scale(6),
    marginTop: verticalScale(10),
  },
  langBadge: {
    borderWidth: 1,
    borderRadius: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
  },
  langText: {
    fontSize: moderateFontScale(9),
    fontWeight: '600',
  },
  guideCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: verticalScale(12),
    paddingTop: verticalScale(10),
  },
  priceValue: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    marginTop: verticalScale(2),
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
  overlayModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  loadingBox: {
    padding: scale(30),
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  mockMapArea: {
    height: verticalScale(220),
    width: '100%',
    overflow: 'hidden',
  },
  fallbackMapGraphic: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRadar1: {
    position: 'absolute',
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    borderWidth: 1.5,
    borderColor: 'rgba(245, 197, 24, 0.2)',
  },
  pulseRadar2: {
    position: 'absolute',
    width: scale(200),
    height: scale(200),
    borderRadius: scale(100),
    borderWidth: 1.5,
    borderColor: 'rgba(245, 197, 24, 0.08)',
  },
  mapPin: {
    position: 'absolute',
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarInfoText: {
    position: 'absolute',
    bottom: verticalScale(12),
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
  acceptedMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(14),
    gap: scale(10),
  },
  matchStatus: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  compactGuideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale(18),
    padding: scale(10),
    borderRadius: scale(14),
    gap: scale(10),
  },
  compactPhoto: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
  },
  actionConfirmBtn: {
    marginHorizontal: scale(18),
    height: verticalScale(44),
    borderRadius: scale(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(16),
  },
  actionConfirmText: {
    color: '#101014',
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
  acceptedDetailCard: {
    borderWidth: 1.2,
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(6),
    marginTop: verticalScale(12),
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
  },
  acceptedDivider: {
    height: 1,
    width: '100%',
  },
});
