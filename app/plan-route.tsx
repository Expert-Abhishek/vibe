import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { adminState } from './admin-state';

interface TourPackage {
  id: string;
  name: string;
  checkpoints: string[];
  travelHours: number;
  distanceKm: number;
  image: string;
}

const packagePlans: TourPackage[] = [
  {
    id: 'p1',
    name: 'Mysuru Royal Heritage Tour',
    checkpoints: ['Bengaluru Palace', 'Srirangapatna Fort', 'Mysuru Palace', 'Chamundi Hills'],
    travelHours: 6.5,
    distanceKm: 290,
    image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'p2',
    name: 'Hampi Ruins Explorer',
    checkpoints: ['Hampi Virupaksha Temple', 'Vitthala Stone Chariot', 'Lotus Mahal', 'Anjanadri Hill'],
    travelHours: 8,
    distanceKm: 340,
    image: 'https://images.unsplash.com/photo-1600100397608-f010e42ec9ab?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 'p3',
    name: 'Coorg Coffee & Mist Escape',
    checkpoints: ['Abbey Falls Coorg', 'Mandalpatti Peak View', 'Golden Temple Bylakuppe'],
    travelHours: 5.5,
    distanceKm: 250,
    image: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=600',
  },
];

export default function PlanRouteScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  
  // Booking modal state
  const [selectedPlan, setSelectedPlan] = useState<TourPackage | null>(null);
  const [bookingPax, setBookingPax] = useState(1);
  const [bookingVehicle, setBookingVehicle] = useState<'5seater' | '7seater' | '4x4jeep'>('5seater');
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
  const [bookingStep, setBookingStep] = useState<'form' | 'connecting' | 'success'>('form');

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

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
    success: '#10B981',
  };

  const filteredPackages = packagePlans.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.checkpoints.some((cp) => cp.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openBookingPopup = (plan: TourPackage) => {
    setSelectedPlan(plan);
    setBookingPax(1);
    setBookingVehicle('5seater');
    setBookingStep('form');

    // Default pre-booking date to tomorrow (YYYY-MM-DD)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split('T')[0]);
  };

  const handleConfirmBooking = () => {
    if (!selectedPlan) return;

    // Validate prebooking date limit (max 15 days in advance)
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

    setBookingStep('connecting');

    // Simulate match connection delay
    setTimeout(() => {
      setBookingStep('success');
    }, 2000);
  };

  const addTripAndClose = () => {
    if (!selectedPlan) return;

    const totalHours = selectedPlan.travelHours + selectedPlan.checkpoints.length;
    const rate = adminState.vehicleRatesPerHour[bookingVehicle] || 150;
    const price = Math.round(totalHours * rate);

    const finalDate = adminState.instantBookingEnabled ? 'Today' : bookingDate;
    const finalTime = adminState.instantBookingEnabled
      ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : bookingTime;

    // Add to userTrips Array
    adminState.userTrips.push({
      id: `plan_book_${Date.now()}`,
      type: 'plan',
      title: `${selectedPlan.name} (${Math.round(totalHours)} Hours)`,
      route: selectedPlan.checkpoints,
      driverOrGuideName: 'Suresh Kumar',
      date: finalDate,
      time: finalTime,
      price: price,
      paymentMode: 'UPI',
      status: 'Upcoming',
      passengerCount: bookingPax,
    });

    setSelectedPlan(null);
    setBookingStep('form');
    router.replace('/(tabs)/trips');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Karnataka Tour Packages</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Text */}
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeTitle}>Discover Heritage & Nature</Text>
          <Text style={[styles.welcomeSub, { color: colors.textMuted }]}>
            Choose a premium tour package below. Checkpoint stopovers and traveling duration calculations are fully integrated.
          </Text>
        </View>

        {/* Search Bar */}
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

        {/* Unified Package List */}
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
                      <Text style={[styles.durationValText, { color: colors.amber }]}>
                        🕒 Total: {totalHours.toFixed(1)} hrs (Travel: {plan.travelHours}h + stops)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rowActionCol}>
                    <TouchableOpacity
                      style={styles.rowBookBtn}
                      activeOpacity={0.8}
                      onPress={() => openBookingPopup(plan)}
                    >
                      <Text style={styles.rowBookBtnText}>Book</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: verticalScale(30) }} />
      </ScrollView>

      {/* Booking Popup Modal */}
      <Modal
        visible={selectedPlan !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedPlan(null)}
      >
        {selectedPlan && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              
              {/* Form Step */}
              {bookingStep === 'form' && (
                <ScrollView contentContainerStyle={{ paddingBottom: verticalScale(10) }} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Plan Checkout</Text>
                    <TouchableOpacity onPress={() => setSelectedPlan(null)}>
                      <MaterialIcons name="close" size={scale(22)} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.modalPlanName, { color: colors.amber }]}>{selectedPlan.name}</Text>

                  {/* Pricing Display */}
                  <View style={[styles.priceBox, { backgroundColor: isDark ? '#16161B' : '#F5F5F7' }]}>
                    <Text style={styles.priceLabel}>ESTIMATED PACKAGE PRICE</Text>
                    <Text style={[styles.priceValue, { color: colors.amber }]}>
                      ₹{Math.round((selectedPlan.travelHours + selectedPlan.checkpoints.length) * (adminState.vehicleRatesPerHour[bookingVehicle] || 150))}
                    </Text>
                    <Text style={styles.priceSubText}>Based on hourly billing: {selectedPlan.travelHours + selectedPlan.checkpoints.length} hrs total duration</Text>
                  </View>

                  {/* Sightseeing Spot checkpoints & preview photos */}
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: scale(10), padding: scale(10), marginBottom: verticalScale(12) }}>
                    <Text style={{ color: colors.amber, fontSize: moderateFontScale(10), fontWeight: '800', marginBottom: verticalScale(4) }}>CHECKPOINTS PATH</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), lineHeight: moderateFontScale(16) }}>
                      {selectedPlan.checkpoints.join(' ➔ ')}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', gap: scale(6), marginTop: verticalScale(8), justifyContent: 'space-between' }}>
                      {['https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=150', 'https://images.unsplash.com/photo-1600100397608-f010e42ec9ab?w=150', 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=150'].map((imgUrl, i) => (
                        <Image key={i} source={{ uri: imgUrl }} style={{ flex: 1, height: verticalScale(46), borderRadius: scale(6) }} />
                      ))}
                    </View>
                  </View>

                  {/* Passenger count selector */}
                  <View style={styles.counterRow}>
                    <Text style={[styles.selectorLabel, { color: colors.textPrimary }]}>Number of Passengers</Text>
                    <View style={styles.counterControls}>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setBookingPax(Math.max(1, bookingPax - 1))}
                      >
                        <Text style={styles.counterBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.counterVal, { color: colors.textPrimary }]}>{bookingPax}</Text>
                      <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setBookingPax(Math.min(10, bookingPax + 1))}
                      >
                        <Text style={styles.counterBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Vehicle selector */}
                  <Text style={[styles.selectorLabel, { color: colors.textPrimary, marginTop: verticalScale(14) }]}>Choose Vehicle Fleet</Text>
                  <View style={styles.vehicleRow}>
                    {(['5seater', '7seater', '4x4jeep'] as const).map((vKey) => {
                      const isSelected = bookingVehicle === vKey;
                      const name = vKey === '5seater' ? '5 Seater Cab' : vKey === '7seater' ? '7 Seater SUV' : '4x4 Jeep';
                      const hourlyRate = adminState.vehicleRatesPerHour[vKey] || 150;
                      return (
                        <TouchableOpacity
                          key={vKey}
                          style={[
                            styles.vehiclePill,
                            { borderColor: isSelected ? colors.amber : colors.border },
                            isSelected && { backgroundColor: 'rgba(245, 197, 24, 0.1)' }
                          ]}
                          onPress={() => setBookingVehicle(vKey)}
                        >
                          <Text style={[styles.vehiclePillText, { color: isSelected ? colors.amber : colors.textPrimary }]}>{name}</Text>
                          <Text style={styles.vehiclePillRate}>₹{hourlyRate}/hr</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Date Time selection (Only if Prebooking mode) */}
                  {!adminState.instantBookingEnabled && (
                    <View style={{ marginTop: verticalScale(14) }}>
                      <Text style={[styles.selectorLabel, { color: colors.textPrimary, marginBottom: verticalScale(8) }]}>Select Pre-Booking Date</Text>
                      
                      {/* Horizontal Date Picker */}
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

                  {/* Booking Action buttons */}
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    activeOpacity={0.8}
                    onPress={handleConfirmBooking}
                  >
                    <Text style={styles.confirmBtnText}>
                      {adminState.instantBookingEnabled ? '⚡ Instant Book Ride' : 'Confirm Pre-Booking'}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}

              {/* Connecting Loading step */}
              {bookingStep === 'connecting' && (
                <View style={styles.loadingStep}>
                  <ActivityIndicator color={colors.amber} size="large" />
                  <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>Matching Captain</Text>
                  <Text style={[styles.loadingSub, { color: colors.textMuted }]}>
                    Contacting nearest premium tour drivers for {selectedPlan.name}...
                  </Text>
                </View>
              )}

              {/* Success matched step */}
              {bookingStep === 'success' && (
                <View style={styles.successStep}>
                  <MaterialIcons name="check-circle" size={scale(64)} color={colors.success} />
                  <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Trip Scheduled!</Text>
                  
                  <View style={[styles.driverDetailCard, { backgroundColor: isDark ? '#16161B' : '#F5F5F7' }]}>
                    <Text style={styles.driverName}>Captain Suresh Kumar connected</Text>
                    <Text style={[styles.driverSub, { color: colors.textMuted }]}>Vehicle: {bookingVehicle === '4x4jeep' ? 'Mahindra Thar 4*4' : 'Ertiga SUV'}</Text>
                    <Text style={[styles.driverSub, { color: colors.textMuted }]}>Contact: +91 98765 43210</Text>
                  </View>

                  <Text style={[styles.successNote, { color: colors.textMuted }]}>
                    The tour itinerary has been synced with your Trips tab log. Safe travels!
                  </Text>

                  <TouchableOpacity
                    style={styles.doneBtn}
                    onPress={addTripAndClose}
                  >
                    <Text style={styles.doneBtnText}>Got it, View Trips</Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          </View>
        )}
      </Modal>

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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: scale(20),
  },
  modalContent: {
    borderRadius: scale(24),
    padding: scale(20),
    maxHeight: '90%',
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
    marginTop: verticalScale(4),
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
