import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Dynamically require maps for web safety
let MapView: any = null;
let Marker: any = null;
let Circle: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Circle = Maps.Circle;
  } catch (e) {
    console.warn('react-native-maps could not be loaded dynamically in guide-dashboard:', e);
  }
}

interface TourSpot {
  name: string;
  lat: number;
  lng: number;
}

interface ActiveRequest {
  touristName: string;
  pickup: string;
  pickupLat: number;
  pickupLng: number;
  spots: TourSpot[];
  durationHrs: number;
  estimatedFare: number;
  language: string;
  groupSize: number;
  otp: string;
}

export default function GuideDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<'duty' | 'active_tour' | 'earnings'>('duty');
  const [isOnline, setIsOnline] = useState(false);

  // Daily statistics
  const [hoursOnline, setHoursOnline] = useState(0);
  const [tripsCount, setTripsCount] = useState(0);
  const [earningsToday, setEarningsToday] = useState(0);
  const [earningsBalance, setEarningsBalance] = useState(0);

  // Incoming Request Simulation
  const [incomingRequest, setIncomingRequest] = useState<ActiveRequest | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [requestVisible, setRequestVisible] = useState(false);

  // Active tour state
  const [activeTour, setActiveTour] = useState<ActiveRequest | null>(null);
  const [tourPhase, setTourPhase] = useState<'pickup' | 'tour'>('pickup');
  const [currentSpotIndex, setCurrentSpotIndex] = useState(0);
  const [otpVisible, setOtpVisible] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');

  // Daily Activity Logs
  const [dailyTours, setDailyTours] = useState<any[]>([
    { id: '1', title: 'Bengaluru Palace Heritage Walk', time: '10:15 AM', fare: 950, payout: 'Paid to Wallet', rating: 5 },
    { id: '2', title: 'Lalbagh Botanical Gardens Walk', time: '01:00 PM', fare: 800, payout: 'Paid to Wallet', rating: 4.8 },
  ]);

  // Loading triggers
  const [payoutLoading, setPayoutLoading] = useState(false);

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
    danger: '#ef4444',
  };

  // Online Hour increment simulator
  useEffect(() => {
    let interval: any;
    if (isOnline) {
      interval = setInterval(() => {
        setHoursOnline(prev => parseFloat((prev + 0.1).toFixed(1)));
      }, 60000); // Increments 0.1 hours every minute of simulation
    }
    return () => clearInterval(interval);
  }, [isOnline]);

  // Incoming booking simulator: pops up a request 5 seconds after going online
  useEffect(() => {
    let timeout: any;
    if (isOnline && !activeTour && !incomingRequest) {
      timeout = setTimeout(() => {
        // Trigger simulated request
        const mockRequest: ActiveRequest = {
          touristName: 'Abhishek (Tourist)',
          pickup: 'Bengaluru Palace Entrance Gate',
          pickupLat: 12.9982,
          pickupLng: 77.5920,
          spots: [
            { name: 'Bengaluru Palace Grounds', lat: 12.9982, lng: 77.5920 },
            { name: 'National Gallery of Modern Art', lat: 12.9912, lng: 77.5890 },
            { name: 'Vidhana Soudha Landmark', lat: 12.9796, lng: 77.5908 }
          ],
          durationHrs: 4,
          estimatedFare: 1800,
          language: 'English & Hindi',
          groupSize: 3,
          otp: '8240',
        };
        setIncomingRequest(mockRequest);
        setTimerSeconds(30);
        setRequestVisible(true);
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [isOnline, activeTour, incomingRequest]);

  // Incoming Request timer countdown
  useEffect(() => {
    let timer: any;
    if (requestVisible && timerSeconds > 0) {
      timer = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setRequestVisible(false);
            setIncomingRequest(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [requestVisible, timerSeconds]);

  const handleAcceptRequest = () => {
    if (!incomingRequest) return;
    setRequestVisible(false);
    setActiveTour(incomingRequest);
    setTourPhase('pickup');
    setCurrentSpotIndex(0);
    setIncomingRequest(null);
    setActiveTab('active_tour');
    Alert.alert(
      'Request Accepted!',
      'GPS navigation routing started. Proceed to pickup location.',
      [{ text: 'Navigate Now' }]
    );
  };

  const handleRejectRequest = () => {
    setRequestVisible(false);
    setIncomingRequest(null);
    Alert.alert('Request Rejected', 'You will receive another booking shortly.');
  };

  const handleArrived = () => {
    setOtpVisible(true);
  };

  const handleVerifyOtp = () => {
    if (!activeTour) return;
    if (enteredOtp === activeTour.otp) {
      setOtpVisible(false);
      setEnteredOtp('');
      setTourPhase('tour');
      setCurrentSpotIndex(0);
      Alert.alert(
        'Verification Success!',
        `OTP code matched. The tour has started. Proceed to Spot 1: ${activeTour.spots[0].name}.`
      );
    } else {
      Alert.alert('Invalid OTP', 'The code did not match. Please verify with tourist (Try 8240).');
    }
  };

  const handleNextSpot = () => {
    if (!activeTour) return;
    if (currentSpotIndex < activeTour.spots.length - 1) {
      const nextIdx = currentSpotIndex + 1;
      setCurrentSpotIndex(nextIdx);
      Alert.alert('Spot Reached!', `Proceeding to next stop: ${activeTour.spots[nextIdx].name}.`);
    } else {
      Alert.alert('Final Spot Reached!', 'All itinerary points are covered. You can now complete the tour.');
    }
  };

  const handleEndTour = () => {
    if (!activeTour) return;
    Alert.alert(
      'Complete Tour',
      'Are you sure you want to end this tour and collect payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm End',
          onPress: () => {
            const fareEarned = activeTour.estimatedFare;
            setEarningsToday(prev => prev + fareEarned);
            setEarningsBalance(prev => prev + fareEarned);
            setTripsCount(prev => prev + 1);
            setDailyTours([
              {
                id: `tour_${Date.now()}`,
                title: activeTour.title || 'Custom Tour',
                time: 'Just Now',
                fare: fareEarned,
                payout: 'Paid to Wallet',
                rating: 5
              },
              ...dailyTours
            ]);
            setActiveTour(null);
            setTourPhase('pickup');
            setActiveTab('earnings');
            Alert.alert('Tour Complete!', `₹${fareEarned} has been added to your daily wallet earnings!`);
          }
        }
      ]
    );
  };

  const handleInstantPayout = () => {
    if (earningsBalance <= 0) {
      Alert.alert('No Balance', 'Your bank payout balance is empty.');
      return;
    }
    setPayoutLoading(true);
    setTimeout(() => {
      setPayoutLoading(false);
      const paidAmt = earningsBalance;
      setEarningsBalance(0);
      Alert.alert(
        'Payout Transferred!',
        `₹${paidAmt} has been dispatched directly to your registered bank account via IMPS!`
      );
    }, 2000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header bar / Role switcher */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerLogo, { color: colors.amber }]}>VIBZZ PARTNER</Text>
          <Text style={[styles.headerGuideName, { color: colors.textPrimary }]}>Ramesh G. (Guide Dashboard)</Text>
        </View>
        
        {/* Switch back button */}
        <TouchableOpacity
          style={styles.switchRoleBtn}
          onPress={() => router.replace('/(tabs)')}
        >
          <MaterialIcons name="swap-horiz" size={scale(16)} color="#101010" />
          <Text style={styles.switchRoleText}>Tourist App</Text>
        </TouchableOpacity>
      </View>

      {/* Main Tabs view content switcher */}
      {activeTab === 'duty' && (
        <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
          {/* Go Online Duty status control */}
          <View style={[styles.dutyStatusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statusRow}>
              <View>
                <Text style={[styles.statusMainLabel, { color: colors.textPrimary }]}>Duty Status</Text>
                <Text style={[styles.statusSubText, { color: colors.textMuted }]}>
                  {isOnline ? 'ONLINE - Accepting Requests' : 'OFFLINE - Toggle online to receive trips'}
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={(val) => {
                  setIsOnline(val);
                  if (!val) {
                    setIncomingRequest(null);
                    setRequestVisible(false);
                  }
                }}
                trackColor={{ false: '#2C2C34', true: colors.amber }}
                thumbColor={isOnline ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            {/* Quick summary stats */}
            <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
            <View style={styles.dutyStatsGrid}>
              <View style={styles.dutyStatCell}>
                <Text style={styles.statLabel}>Online Hours</Text>
                <Text style={[styles.statValNum, { color: colors.textPrimary }]}>{hoursOnline}h</Text>
              </View>
              <View style={[styles.vertDivider, { backgroundColor: colors.border }]} />
              <View style={styles.dutyStatCell}>
                <Text style={styles.statLabel}>Today Trips</Text>
                <Text style={[styles.statValNum, { color: colors.textPrimary }]}>{tripsCount}</Text>
              </View>
              <View style={[styles.vertDivider, { backgroundColor: colors.border }]} />
              <View style={styles.dutyStatCell}>
                <Text style={styles.statLabel}>Today Earnings</Text>
                <Text style={[styles.statValNum, { color: colors.amber }]}>₹{earningsToday}</Text>
              </View>
            </View>
          </View>

          {/* Live demand map list */}
          <View style={styles.mapSectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.amber }]}>Live Tourist Demand Heatmap</Text>
            <View style={[styles.mapContainerBox, { borderColor: colors.border }]}>
              {Platform.OS === 'web' || !MapView ? (
                // Web HUD Telemetry simulator
                <View style={styles.webMapVisual}>
                  <View style={styles.gridCanvasOverlay} />
                  <View style={styles.demandLabelBox}>
                    <Text style={styles.demandTitle}>HIGH DEMAND DETECTED</Text>
                    <Text style={styles.demandDetail}>1. Bengaluru Palace (4 requests/hr)</Text>
                    <Text style={styles.demandDetail}>2. Majestic Metro (6 requests/hr)</Text>
                  </View>
                  <View style={[styles.heatmapCircleVisual, { backgroundColor: 'rgba(245,197,24,0.3)', width: scale(80), height: scale(80), borderRadius: scale(40) }]} />
                </View>
              ) : (
                // Native Map View
                <MapView
                  provider="google"
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={{
                    latitude: 12.9716,
                    longitude: 77.5946,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  }}
                >
                  {/* Bengaluru Palace demand radius marker */}
                  <Circle
                    center={{ latitude: 12.9982, longitude: 77.5920 }}
                    radius={300}
                    strokeColor="rgba(245,197,24,0.5)"
                    fillColor="rgba(245,197,24,0.25)"
                  />
                  {/* Majestic Metro demand radius marker */}
                  <Circle
                    center={{ latitude: 12.9784, longitude: 77.5694 }}
                    radius={400}
                    strokeColor="rgba(245,197,24,0.5)"
                    fillColor="rgba(245,197,24,0.25)"
                  />
                  <Marker
                    coordinate={{ latitude: 12.9982, longitude: 77.5920 }}
                    title="Bengaluru Palace Area"
                    description="High tourist booking demand"
                  />
                  <Marker
                    coordinate={{ latitude: 12.9784, longitude: 77.5694 }}
                    title="Majestic Station Hub"
                    description="Very High tourist arrivals"
                  />
                </MapView>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {activeTab === 'active_tour' && (
        <View style={styles.activeTourTabPanel}>
          {activeTour ? (
            <View style={{ flex: 1 }}>
              {/* Map Routing */}
              <View style={[styles.activeTourMapFrame, { borderBottomColor: colors.border }]}>
                {Platform.OS === 'web' || !MapView ? (
                  // Symmetrical Web HUD navigation path
                  <View style={styles.webMapVisual}>
                    <View style={styles.gridCanvasOverlay} />
                    <View style={styles.hudNavBox}>
                      <Text style={styles.hudNavTitle}>GPS NAVIGATION ACTIVE</Text>
                      <Text style={styles.hudNavText}>Phase: {tourPhase.toUpperCase()}</Text>
                      {tourPhase === 'pickup' ? (
                        <Text style={styles.hudNavText}>Heading to Pickup: {activeTour.pickup}</Text>
                      ) : (
                        <Text style={styles.hudNavText}>Target Spot {currentSpotIndex + 1}: {activeTour.spots[currentSpotIndex].name}</Text>
                      )}
                    </View>
                  </View>
                ) : (
                  // Native Map View
                  <MapView
                    provider="google"
                    style={StyleSheet.absoluteFillObject}
                    initialRegion={{
                      latitude: 12.9982,
                      longitude: 77.5920,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }}
                  >
                    {tourPhase === 'pickup' ? (
                      <Marker
                        coordinate={{ latitude: activeTour.pickupLat, longitude: activeTour.pickupLng }}
                        title="Tourist Pickup Location"
                        pinColor={colors.amber}
                      />
                    ) : (
                      activeTour.spots.map((spot, sidx) => (
                        <Marker
                          key={sidx}
                          coordinate={{ latitude: spot.lat, longitude: spot.lng }}
                          title={`Spot ${sidx + 1}: ${spot.name}`}
                          pinColor={sidx === currentSpotIndex ? '#ef4444' : '#888'}
                        />
                      ))
                    )}
                  </MapView>
                )}
              </View>

              {/* Navigation drawer controls */}
              <View style={[styles.navDrawerBlock, { backgroundColor: colors.surface }]}>
                <View style={styles.touristProfileRow}>
                  <View style={styles.touristAvatarBox}>
                    <MaterialIcons name="person" size={scale(20)} color={colors.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.touristProfileName, { color: colors.textPrimary }]}>{activeTour.touristName}</Text>
                    <Text style={[styles.touristProfileMeta, { color: colors.textMuted }]}>
                      Language: {activeTour.language} | Group: {activeTour.groupSize} Pax
                    </Text>
                  </View>
                </View>

                {tourPhase === 'pickup' ? (
                  /* PHASE 1: PICKUP CONTROLS */
                  <View style={styles.phasePanelBlock}>
                    <Text style={[styles.phaseTitleText, { color: colors.textPrimary }]}>Phase 1: Pickup Tourist</Text>
                    <View style={styles.phaseAddressCard}>
                      <MaterialIcons name="pin-drop" size={scale(16)} color={colors.amber} style={{ marginRight: scale(6) }} />
                      <Text style={[styles.phaseAddressVal, { color: colors.textPrimary }]} numberOfLines={1}>{activeTour.pickup}</Text>
                    </View>

                    <View style={styles.actionBtnGrid}>
                      <TouchableOpacity style={[styles.navActionBtn, { backgroundColor: '#2C2C34' }]} onPress={handleArrived}>
                        <Text style={styles.navActionTextCancel}>Arrived at Location</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.navActionBtn, { backgroundColor: colors.amber }]} onPress={() => setOtpVisible(true)}>
                        <Text style={styles.navActionTextConfirm}>Start Tour (OTP)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* PHASE 2: TOUR CONTROLS */
                  <View style={styles.phasePanelBlock}>
                    <Text style={[styles.phaseTitleText, { color: colors.textPrimary }]}>
                      Phase 2: Tour in Progress (Spot {currentSpotIndex + 1}/{activeTour.spots.length})
                    </Text>
                    <View style={styles.phaseAddressCard}>
                      <MaterialIcons name="assistant-photo" size={scale(16)} color={colors.amber} style={{ marginRight: scale(6) }} />
                      <Text style={[styles.phaseAddressVal, { color: colors.textPrimary }]} numberOfLines={1}>
                        Targeting: {activeTour.spots[currentSpotIndex].name}
                      </Text>
                    </View>

                    <View style={styles.actionBtnGrid}>
                      {currentSpotIndex < activeTour.spots.length - 1 ? (
                        <TouchableOpacity style={[styles.navActionBtn, { backgroundColor: '#2C2C34' }]} onPress={handleNextSpot}>
                          <Text style={styles.navActionTextCancel}>Reached / Next Spot</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ flex: 1 }} />
                      )}
                      <TouchableOpacity style={[styles.navActionBtn, { backgroundColor: colors.amber }]} onPress={handleEndTour}>
                        <Text style={styles.navActionTextConfirm}>End Tour & Collect</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.noActiveTourBlock}>
              <MaterialIcons name="landscape" size={scale(48)} color={colors.textMuted} style={{ marginBottom: verticalScale(14) }} />
              <Text style={[styles.noActiveTitle, { color: colors.textPrimary }]}>No Tour Active</Text>
              <Text style={[styles.noActiveSub, { color: colors.textMuted }]}>
                Toggle {"\""}Go Online{"\""} in the Duty status tab to start receiving instant booking requests from nearby tourists.
              </Text>
            </View>
          )}
        </View>
      )}

      {activeTab === 'earnings' && (
        <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
          {/* Earnings wallet bank account card */}
          <View style={[styles.walletCardFrame, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.walletTitleLabel}>Unsettled Wallet Balance</Text>
            <Text style={styles.walletBalText}>₹{earningsBalance}</Text>
            <Text style={[styles.walletSubText, { color: colors.textMuted }]}>
              Immediate cashout directly to your registered IMPS bank account.
            </Text>

            <TouchableOpacity
              style={styles.payoutButton}
              activeOpacity={0.8}
              onPress={handleInstantPayout}
              disabled={payoutLoading}
            >
              {payoutLoading ? (
                <ActivityIndicator color="#101010" />
              ) : (
                <>
                  <Text style={styles.payoutBtnText}>Instant Settlement Payout</Text>
                  <MaterialIcons name="account-balance" size={scale(16)} color="#101010" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Today ride logs history */}
          <Text style={[styles.sectionTitle, { color: colors.amber }]}>Today Completed Trips Activity</Text>
          {dailyTours.map((item) => (
            <View key={item.id} style={[styles.dailyTripLogItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.logHeaderRow}>
                <View>
                  <Text style={[styles.logTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.logTime, { color: colors.textMuted }]}>{item.time} · {item.payout}</Text>
                </View>
                <Text style={styles.logFare}>+₹{item.fare}</Text>
              </View>
              {item.rating && (
                <View style={styles.logRatingRow}>
                  <Text style={[styles.logRatingText, { color: colors.textMuted }]}>Rating: </Text>
                  <MaterialIcons name="star" size={scale(12)} color={colors.amber} style={{ marginRight: scale(2) }} />
                  <Text style={[styles.logRatingVal, { color: colors.textPrimary }]}>{item.rating}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Bottom Portal Tab Navigator bar */}
      <View style={[styles.bottomTabBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'duty' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('duty')}
        >
          <MaterialIcons name="wifi" size={scale(20)} color={activeTab === 'duty' ? colors.amber : colors.textMuted} />
          <Text style={[styles.tabBarLabel, { color: activeTab === 'duty' ? colors.amber : colors.textMuted }]}>Duty Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'active_tour' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('active_tour')}
        >
          <MaterialIcons name="navigation" size={scale(20)} color={activeTab === 'active_tour' ? colors.amber : colors.textMuted} />
          <Text style={[styles.tabBarLabel, { color: activeTab === 'active_tour' ? colors.amber : colors.textMuted }]}>Active Tour</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBarItem, activeTab === 'earnings' && styles.tabBarItemActive]}
          onPress={() => setActiveTab('earnings')}
        >
          <MaterialIcons name="monetization-on" size={scale(20)} color={activeTab === 'earnings' ? colors.amber : colors.textMuted} />
          <Text style={[styles.tabBarLabel, { color: activeTab === 'earnings' ? colors.amber : colors.textMuted }]}>Earnings Log</Text>
        </TouchableOpacity>
      </View>

      {/* Simulated Incoming Request Modal Pop-up */}
      <Modal
        visible={requestVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRequestVisible(false)}
      >
        {incomingRequest && (
          <View style={styles.popupOverlay}>
            <View style={[styles.popupContentCard, { backgroundColor: colors.surface }]}>
              {/* Countdown Progress circle bar */}
              <View style={styles.popupTimerHeader}>
                <MaterialIcons name="warning" size={scale(18)} color={colors.amber} />
                <Text style={styles.popupTimerText}>INCOMING INSTANT BOOKING ({timerSeconds}s)</Text>
              </View>

              {/* Tourist & Tour details */}
              <View style={styles.popupMainDetails}>
                <View style={styles.touristNameBadge}>
                  <MaterialIcons name="person-pin" size={scale(22)} color={colors.amber} style={{ marginRight: scale(8) }} />
                  <View>
                    <Text style={[styles.touristNameVal, { color: colors.textPrimary }]}>{incomingRequest.touristName}</Text>
                    <Text style={[styles.touristMetaVal, { color: colors.textMuted }]}>Prefer: {incomingRequest.language} · {incomingRequest.groupSize} Pax</Text>
                  </View>
                </View>

                {/* Pickup details */}
                <View style={[styles.popupDetailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Tourist Pickup</Text>
                  <Text style={[styles.popupVal, { color: colors.textPrimary }]} numberOfLines={1}>{incomingRequest.pickup}</Text>
                </View>

                {/* Target Spots */}
                <View style={[styles.popupDetailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Spots to Tour</Text>
                  <Text style={[styles.popupVal, { color: colors.textPrimary }]} numberOfLines={1}>
                    {incomingRequest.spots.map(s => s.name).join(' ➔ ')}
                  </Text>
                </View>

                {/* Duration & Payout */}
                <View style={styles.popupFareStats}>
                  <View style={styles.fareCell}>
                    <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Duration</Text>
                    <Text style={[styles.payoutTextHighlight, { color: colors.textPrimary }]}>{incomingRequest.durationHrs} Hours</Text>
                  </View>
                  <View style={[styles.vertDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.fareCell}>
                    <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Estimated Payout</Text>
                    <Text style={[styles.payoutTextHighlight, { color: colors.amber }]}>₹{incomingRequest.estimatedFare}</Text>
                  </View>
                </View>
              </View>

              {/* Accept / Reject buttons */}
              <View style={styles.popupActionsGrid}>
                <TouchableOpacity style={[styles.popupBtn, { backgroundColor: '#2C2C34' }]} onPress={handleRejectRequest}>
                  <Text style={styles.popupBtnCancelText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.popupBtn, { backgroundColor: colors.amber }]} onPress={handleAcceptRequest}>
                  <Text style={styles.popupBtnConfirmText}>Accept Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Start Trip OTP Entry Modal Pop-up */}
      <Modal
        visible={otpVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOtpVisible(false)}
      >
        {activeTour && (
          <View style={styles.popupOverlay}>
            <View style={[styles.otpContentCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.otpTitle, { color: colors.textPrimary }]}>Enter Verification OTP</Text>
              <Text style={[styles.otpSub, { color: colors.textMuted }]}>Please check with {activeTour.touristName} for the 4-digit code (e.g. 8240)</Text>

              <TextInput
                style={[styles.otpInput, { color: colors.textPrimary, borderColor: colors.amber }]}
                placeholder="0000"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                maxLength={4}
                value={enteredOtp}
                onChangeText={setEnteredOtp}
                autoFocus
              />

              <View style={styles.popupActionsGrid}>
                <TouchableOpacity style={[styles.popupBtn, { backgroundColor: '#2C2C34' }]} onPress={() => setOtpVisible(false)}>
                  <Text style={styles.popupBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.popupBtn, { backgroundColor: colors.amber }]} onPress={handleVerifyOtp}>
                  <Text style={styles.popupBtnConfirmText}>Verify & Start</Text>
                </TouchableOpacity>
              </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1.2,
  },
  headerLogo: {
    fontSize: moderateFontScale(10),
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headerGuideName: {
    fontSize: moderateFontScale(13.5),
    fontWeight: '800',
    marginTop: verticalScale(2),
  },
  switchRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5C518',
    borderRadius: scale(10),
    paddingVertical: verticalScale(5),
    paddingHorizontal: scale(10),
    gap: scale(4),
  },
  switchRoleText: {
    color: '#101010',
    fontSize: moderateFontScale(10.5),
    fontWeight: '800',
  },
  tabScrollContent: {
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(110),
  },
  dutyStatusCard: {
    borderRadius: scale(22),
    padding: scale(16),
    borderWidth: 1.2,
    marginBottom: verticalScale(20),
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusMainLabel: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  statusSubText: {
    fontSize: moderateFontScale(10.5),
    fontWeight: '600',
    marginTop: verticalScale(3),
    width: '90%',
  },
  statsDivider: {
    height: 1.2,
    marginVertical: verticalScale(14),
  },
  dutyStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dutyStatCell: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#8D8D97',
    fontSize: moderateFontScale(10),
    fontWeight: '600',
  },
  statValNum: {
    fontSize: moderateFontScale(15),
    fontWeight: '800',
    marginTop: verticalScale(4),
  },
  vertDivider: {
    width: 1.2,
    height: '60%',
  },
  mapSectionBlock: {
    marginTop: scale(2),
  },
  sectionTitle: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(10),
  },
  mapContainerBox: {
    height: verticalScale(280),
    width: '100%',
    borderRadius: scale(24),
    overflow: 'hidden',
    borderWidth: 1.2,
  },
  webMapVisual: {
    flex: 1,
    backgroundColor: '#101014',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gridCanvasOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    opacity: 0.35,
  },
  demandLabelBox: {
    position: 'absolute',
    top: scale(14),
    left: scale(14),
    backgroundColor: 'rgba(16, 16, 20, 0.85)',
    borderRadius: scale(12),
    padding: scale(10),
    borderWidth: 1.2,
    borderColor: 'rgba(245, 197, 24, 0.15)',
  },
  demandTitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(9),
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: verticalScale(4),
  },
  demandDetail: {
    color: '#ffffff',
    fontSize: moderateFontScale(10.5),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  heatmapCircleVisual: {
    borderColor: 'rgba(245,197,24,0.5)',
    borderWidth: 1.5,
  },
  activeTourTabPanel: {
    flex: 1,
    paddingBottom: verticalScale(80),
  },
  activeTourMapFrame: {
    flex: 0.62,
    borderBottomWidth: 1.2,
  },
  hudNavBox: {
    position: 'absolute',
    top: scale(14),
    left: scale(14),
    backgroundColor: 'rgba(16, 16, 20, 0.85)',
    borderRadius: scale(12),
    padding: scale(10),
    borderWidth: 1.2,
    borderColor: 'rgba(245,197,24,0.15)',
  },
  hudNavTitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(9),
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: verticalScale(4),
  },
  hudNavText: {
    color: '#ffffff',
    fontSize: moderateFontScale(11),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  navDrawerBlock: {
    flex: 0.38,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    padding: scale(16),
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  touristProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  touristAvatarBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(245,197,24,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  touristProfileName: {
    fontSize: moderateFontScale(13.5),
    fontWeight: '800',
  },
  touristProfileMeta: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  phasePanelBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  phaseTitleText: {
    fontSize: moderateFontScale(11.5),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#F5C518',
  },
  phaseAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: scale(10),
    padding: scale(10),
    marginVertical: verticalScale(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  phaseAddressVal: {
    fontSize: moderateFontScale(12),
    fontWeight: '600',
    flex: 1,
  },
  actionBtnGrid: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(2),
  },
  navActionBtn: {
    flex: 1,
    borderRadius: scale(12),
    height: scale(38),
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActionTextCancel: {
    color: '#ffffff',
    fontSize: moderateFontScale(11.5),
    fontWeight: '700',
  },
  navActionTextConfirm: {
    color: '#101010',
    fontSize: moderateFontScale(11.5),
    fontWeight: '800',
  },
  noActiveTourBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(36),
    textAlign: 'center',
  },
  noActiveTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  noActiveSub: {
    fontSize: moderateFontScale(12.5),
    lineHeight: moderateFontScale(18),
    textAlign: 'center',
    marginTop: verticalScale(6),
  },
  walletCardFrame: {
    borderRadius: scale(22),
    padding: scale(18),
    borderWidth: 1.2,
    marginBottom: verticalScale(20),
  },
  walletTitleLabel: {
    color: '#8D8D97',
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  walletBalText: {
    color: '#F5C518',
    fontSize: moderateFontScale(28),
    fontWeight: '800',
    marginVertical: verticalScale(4),
  },
  walletSubText: {
    fontSize: moderateFontScale(11.5),
    lineHeight: moderateFontScale(16),
    marginBottom: verticalScale(14),
  },
  payoutButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(12),
    height: scale(40),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  payoutBtnText: {
    color: '#101010',
    fontSize: moderateFontScale(12.5),
    fontWeight: '800',
  },
  dailyTripLogItem: {
    borderRadius: scale(16),
    padding: scale(14),
    marginBottom: verticalScale(12),
    borderWidth: 1.2,
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTitle: {
    fontSize: moderateFontScale(12.5),
    fontWeight: '800',
  },
  logTime: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  logFare: {
    color: '#10B981',
    fontSize: moderateFontScale(15),
    fontWeight: '800',
  },
  logRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  logRatingText: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
  },
  logRatingVal: {
    fontSize: moderateFontScale(10.5),
    fontWeight: '700',
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: verticalScale(74),
    flexDirection: 'row',
    borderTopWidth: 1.2,
    paddingBottom: verticalScale(14),
    elevation: 8,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: verticalScale(6),
  },
  tabBarItemActive: {
    borderTopWidth: 1.5,
    borderTopColor: '#F5C518',
  },
  tabBarLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '700',
    marginTop: verticalScale(4),
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(18),
  },
  popupContentCard: {
    width: '100%',
    borderRadius: scale(24),
    padding: scale(20),
    borderWidth: 1.8,
    borderColor: '#F5C518',
  },
  popupTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    marginBottom: verticalScale(14),
  },
  popupTimerText: {
    color: '#F5C518',
    fontSize: moderateFontScale(11),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  popupMainDetails: {
    marginBottom: verticalScale(20),
  },
  touristNameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: scale(12),
    padding: scale(10),
    marginBottom: verticalScale(12),
  },
  touristNameVal: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  touristMetaVal: {
    fontSize: moderateFontScale(10.5),
    fontWeight: '600',
    marginTop: verticalScale(1),
  },
  popupDetailRow: {
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1.2,
  },
  popupLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  popupVal: {
    fontSize: moderateFontScale(12.5),
    fontWeight: '700',
    marginTop: verticalScale(2),
  },
  popupFareStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(12),
  },
  fareCell: {
    flex: 1,
    alignItems: 'center',
  },
  payoutTextHighlight: {
    fontSize: moderateFontScale(17),
    fontWeight: '800',
    marginTop: verticalScale(4),
  },
  popupActionsGrid: {
    flexDirection: 'row',
    gap: scale(10),
  },
  popupBtn: {
    flex: 1,
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupBtnCancelText: {
    color: '#ffffff',
    fontSize: moderateFontScale(12.5),
    fontWeight: '700',
  },
  popupBtnConfirmText: {
    color: '#101010',
    fontSize: moderateFontScale(12.5),
    fontWeight: '800',
  },
  otpContentCard: {
    width: '85%',
    borderRadius: scale(20),
    padding: scale(20),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F5C518',
  },
  otpTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  otpSub: {
    fontSize: moderateFontScale(11),
    lineHeight: moderateFontScale(16),
    textAlign: 'center',
    marginTop: verticalScale(4),
    marginBottom: verticalScale(16),
  },
  otpInput: {
    width: scale(140),
    borderWidth: 1.8,
    borderRadius: scale(14),
    height: scale(46),
    fontSize: moderateFontScale(24),
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: scale(6),
    marginBottom: verticalScale(20),
  },
});
