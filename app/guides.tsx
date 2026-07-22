import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { fetchGuidesApi } from '@/constants/api';
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
import { adminState } from './admin-state';

// Dynamically import react-native-maps to prevent crashes on web
let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn('react-native-maps could not be loaded dynamically in guides:', e);
  }
}

interface Guide {
  id: string;
  name: string;
  city: string;
  experience: number;
  rating: number;
  languages: string[];
  specialty: string;
  description: string;
  avatarColor: string;
  image: string;
  chargePerHour: number;
  latitude: number;
  longitude: number;
}

const mockGuides: Guide[] = [
  {
    id: 'g1',
    name: 'Somanna Gowda',
    city: 'Hampi',
    experience: 15,
    rating: 4.9,
    languages: ['Kannada', 'English', 'Telugu'],
    specialty: 'UNESCO Ruins & Architecture',
    description: 'Born and raised in Hampi, studied the ruins for 15 years. Expert on Virupaksha and Vitthala temple details.',
    avatarColor: '#E07A5F',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    chargePerHour: 350,
    latitude: 15.3350,
    longitude: 76.4600,
  },
  {
    id: 'g2',
    name: 'Ananya Shastri',
    city: 'Mysuru',
    experience: 10,
    rating: 4.8,
    languages: ['Kannada', 'English', 'Hindi'],
    specialty: 'Palace History & Heritage Walks',
    description: 'Specializes in Wodeyar dynasty history and palace secrets. Guides heritage walks in Mysore.',
    avatarColor: '#3D405B',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    chargePerHour: 400,
    latitude: 12.3053,
    longitude: 76.6552,
  },
  {
    id: 'g3',
    name: 'Ramesh Kumar',
    city: 'Bengaluru',
    experience: 12,
    rating: 4.7,
    languages: ['Kannada', 'English'],
    specialty: 'City Heritage & Garden Walks',
    description: 'Explores Tipu summer palace, Lalbagh gardens and colonial-era landmarks of Bangalore.',
    avatarColor: '#81B29A',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    chargePerHour: 300,
    latitude: 12.9982,
    longitude: 77.5920,
  },
  {
    id: 'g4',
    name: 'Kavitha Hegde',
    city: 'Coorg',
    experience: 8,
    rating: 4.9,
    languages: ['Kannada', 'English', 'Kodava'],
    specialty: 'Coffee Plantation & Forest Treks',
    description: 'Leads hikes through plantation estate trails and peaks like Mandalpatti.',
    avatarColor: '#F4F1DE',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    chargePerHour: 350,
    latitude: 12.4385,
    longitude: 75.7214,
  },
  {
    id: 'g5',
    name: 'Manjunath Naik',
    city: 'Gokarna',
    experience: 6,
    rating: 4.6,
    languages: ['Kannada', 'English'],
    specialty: 'Beach Trekking & Mythological Trails',
    description: 'Guides along beach cliffs and temple routes. Native of Gokarna coast.',
    avatarColor: '#E29578',
    image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    chargePerHour: 250,
    latitude: 14.5262,
    longitude: 74.3168,
  },
];

export default function GuidesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialInstantParam = params.instantBooking === 'true';

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [isInstantBooking, setIsInstantBooking] = useState(initialInstantParam);

  // Dynamic guides list state
  const [guidesList, setGuidesList] = useState<Guide[]>(mockGuides);
  const [loadingGuides, setLoadingGuides] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDynamicGuides() {
      setLoadingGuides(true);
      try {
        const rawGuides = await fetchGuidesApi();
        if (rawGuides && rawGuides.length > 0 && isMounted) {
          const formattedBackendGuides: Guide[] = rawGuides.map((g: any, index: number) => ({
            id: g.user_id || g.id || `bg_${index}`,
            name: g.name || 'Certified Local Guide',
            city: g.city || 'Hampi',
            experience: Number(g.experience) || 5,
            rating: Number(g.rating) || 5.0,
            languages: Array.isArray(g.languages) ? g.languages : ['Kannada', 'English', 'Hindi'],
            specialty: g.expertise || 'Heritage & Cultural Tours',
            description: g.bio || 'Government certified tourist guide with extensive local history knowledge.',
            avatarColor: '#E07A5F',
            image: g.photo_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            chargePerHour: Number(g.daily_rate) || 2000,
            latitude: Number(g.latitude) || (15.3350 + (index * 0.005)),
            longitude: Number(g.longitude) || (76.4600 + (index * 0.005)),
          }));

          // Merge backend guides with mockGuides, keeping unique by phone or name
          const combined = [...formattedBackendGuides];
          mockGuides.forEach(mg => {
            if (!combined.some(cg => cg.name.toLowerCase() === mg.name.toLowerCase())) {
              combined.push(mg);
            }
          });
          setGuidesList(combined);
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

  // Booking process states
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [bookingStep, setBookingStep] = useState<'none' | 'loading' | 'map' | 'datetime' | 'accepted'>('none');

  // Advanced prebooking fields
  const [prebookDate, setPrebookDate] = useState('');
  const [prebookHour, setPrebookHour] = useState<number>(10);
  const [prebookMinute, setPrebookMinute] = useState<number>(0);
  const [prebookAmPm, setPrebookAmPm] = useState<'AM' | 'PM'>('AM');
  const prebookTime = `${prebookHour}:${prebookMinute < 10 ? '0' + prebookMinute : prebookMinute} ${prebookAmPm}`;

  // Prebooking Date Options
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
    danger: '#ef4444',
  };

  const filteredGuides = guidesList.filter(
    (g) =>
      g.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const startBookingFlow = (guide: Guide) => {
    setSelectedGuide(guide);
    if (adminState.instantBookingEnabled) {
      setBookingStep('loading');
      setTimeout(() => {
        setBookingStep('map');
      }, 1500);
    } else {
      // Set default pre-booking date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setPrebookDate(tomorrow.toISOString().split('T')[0]);
      setBookingStep('datetime');
    }
  };

  // Date Check validation logic (15 Days Constraint)
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

  const confirmPrebooking = () => {
    const check = validatePrebookDate(prebookDate);
    if (!check.valid) {
      Alert.alert('Date Restriction', check.error);
      return;
    }
    setBookingStep('loading');
    setTimeout(() => {
      setBookingStep('accepted');
    }, 1200);
  };

  const checkoutGuide = () => {
    if (!selectedGuide) return;
    const finalDate = adminState.instantBookingEnabled ? 'Today' : prebookDate;
    const finalTime = adminState.instantBookingEnabled ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : prebookTime;

    // Add guide booking to upcoming trips silently behind the scenes
    adminState.userTrips.push({
      id: `guide_book_${Date.now()}`,
      type: 'guide',
      title: `Guided tour of ${selectedGuide.city} with ${selectedGuide.name}`,
      driverOrGuideName: selectedGuide.name,
      date: finalDate,
      time: finalTime,
      price: selectedGuide.chargePerHour * 4, // 4 hours block charge
      paymentMode: 'UPI',
      status: 'Upcoming',
    });

    // Close the popover immediately
    setBookingStep('none');
    setSelectedGuide(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary }]}>Hire Local Guides</Text>
        <View style={{ width: scale(40) }} />
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

      {/* ==================== 1. BOOKING MODALS ==================== */}

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

      {/* MAP MODAL (Instant Booking ON) */}
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
                  {/* Tourist Point */}
                  <Marker
                    coordinate={{
                      latitude: (selectedGuide?.latitude || 12.9716) - 0.005,
                      longitude: (selectedGuide?.longitude || 77.5946) + 0.003,
                    }}
                    title="Your Location"
                    pinColor="blue"
                  />
                  {/* Guide Point */}
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
                // Fallback custom map representation
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
                <Text style={[styles.matchStatus, { color: colors.success }]}>Instant Match Accepted!</Text>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(13) }}>
                  {selectedGuide?.name} accepted your booking request.
                </Text>
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
              <Text style={styles.actionConfirmText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DATE-TIME PRE-BOOKING MODAL (Instant Booking OFF) */}
      <Modal visible={bookingStep === 'datetime'} transparent animationType="slide">
        <View style={styles.overlayModal}>
          <View style={[styles.mapContainerBox, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Advanced Pre-booking</Text>
              <TouchableOpacity onPress={() => setBookingStep('none')}>
                <MaterialIcons name="close" size={scale(20)} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: scale(16) }}>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginBottom: verticalScale(14) }}>
                Pre-book certified local guides up to <Text style={{ color: colors.amber, fontWeight: '700' }}>15 days in advance</Text>.
              </Text>

              {/* Date Selection */}
              <View style={{ marginBottom: verticalScale(14) }}>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700', marginBottom: verticalScale(8) }}>Select Pre-Booking Date</Text>

                {/* Horizontal Date Picker */}
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

              <TouchableOpacity style={[styles.actionConfirmBtn, { backgroundColor: colors.amber, marginTop: verticalScale(20) }]} onPress={confirmPrebooking}>
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
              <View style={{ width: scale(56), height: scale(56), borderRadius: scale(28), backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: scale(12) }}>
                <MaterialIcons name="check-circle" size={scale(36)} color={colors.success} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.success, fontSize: moderateFontScale(18) }]}>Booking Confirmed!</Text>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginTop: scale(4), textAlign: 'center', paddingHorizontal: scale(10) }}>
                Your pre-booking request has been successfully accepted by the guide.
              </Text>
            </View>

            <View style={[styles.acceptedDetailCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)', borderColor: colors.border }]}>
              {/* Date Row */}
              <View style={styles.infoRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                  <MaterialIcons name="event" size={scale(16)} color={colors.amber} />
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), fontWeight: '600' }}>DATE</Text>
                </View>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700' }}>{prebookDate}</Text>
              </View>

              <View style={[styles.acceptedDivider, { backgroundColor: colors.border }]} />

              {/* Time Row */}
              <View style={styles.infoRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                  <MaterialIcons name="schedule" size={scale(16)} color={colors.amber} />
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), fontWeight: '600' }}>TIME</Text>
                </View>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700' }}>{prebookTime}</Text>
              </View>

              <View style={[styles.acceptedDivider, { backgroundColor: colors.border }]} />

              {/* Rate Row */}
              <View style={styles.infoRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                  <MaterialIcons name="payments" size={scale(16)} color={colors.amber} />
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), fontWeight: '600' }}>RATE</Text>
                </View>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700' }}>₹{selectedGuide?.chargePerHour}/Day</Text>
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

            <TouchableOpacity style={[styles.actionConfirmBtn, { backgroundColor: colors.amber, marginTop: scale(18), width: '100%', marginHorizontal: 0 }]} onPress={checkoutGuide}>
              <Text style={styles.actionConfirmText}>Close</Text>
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
  switchCol: {
    flex: 0.12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    fontSize: moderateFontScale(8),
    fontWeight: '800',
    marginBottom: verticalScale(2),
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
  inputHeading: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    marginBottom: verticalScale(6),
  },
  inputStyle: {
    borderWidth: 1.2,
    borderRadius: scale(12),
    height: verticalScale(40),
    paddingHorizontal: scale(12),
    fontSize: moderateFontScale(13),
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
  detailCardText: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
    marginTop: verticalScale(4),
  },
});
