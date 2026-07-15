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
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Dynamically require maps for web safety
let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.warn('react-native-maps could not be loaded dynamically in driver-dashboard:', e);
  }
}

interface ActiveRequest {
  touristName: string;
  pickup: string;
  pickupLat: number;
  pickupLng: number;
  drop: string;
  dropLat: number;
  dropLng: number;
  distanceKm: number;
  durationMins: number;
  estimatedFare: number;
  otp: string;
}

export default function DriverDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [activeTab, setActiveTab] = useState<'duty' | 'active_trip' | 'profile'>('duty');
  const [isOnline, setIsOnline] = useState(false);
  const [appLang, setAppLang] = useState<'en' | 'kn'>('en');

  // Daily statistics
  const [kmDriven, setKmDriven] = useState(142.5);
  const [tripsCount, setTripsCount] = useState(5);
  const [earningsToday, setEarningsToday] = useState(2800);
  const [earningsBalance, setEarningsBalance] = useState(1200);

  // Settings states
  const [upiId, setUpiId] = useState('ka03md8240@okaxis');
  const [selectedVehicle, setSelectedVehicle] = useState<'innova' | 'swift'>('innova');
  const [navPreference, setNavPreference] = useState<'inapp' | 'google'>('inapp');

  // Modal support state
  const [disputeVisible, setDisputeVisible] = useState(false);

  // Incoming Request Simulation
  const [incomingRequest, setIncomingRequest] = useState<ActiveRequest | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [requestVisible, setRequestVisible] = useState(false);

  // Active trip state
  const [activeTrip, setActiveTrip] = useState<ActiveRequest | null>(null);
  const [tripPhase, setTripPhase] = useState<'pickup' | 'trip'>('pickup');
  const [otpVisible, setOtpVisible] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');

  // Completed rides log
  const [dailyRides, setDailyRides] = useState<any[]>([
    { id: '1', title: 'Majestic Metro ➔ Indiranagar 100ft Rd', time: '11:00 AM', fare: 340, payout: 'Settled to Wallet' },
    { id: '2', title: 'Hebbal Flyover ➔ Kempegowda Airport', time: '02:15 PM', fare: 850, payout: 'Settled to Wallet' },
  ]);

  // Loading triggers
  const [payoutLoading, setPayoutLoading] = useState(false);

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? 'rgba(26, 26, 32, 0.9)' : 'rgba(255, 255, 255, 0.92)',
    surfaceCard: isDark ? '#1E1E24' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
    danger: '#ef4444',
  };

  // Translations
  const trans = {
    en: {
      dashboard: 'Driver Dashboard',
      duty: 'Duty Status',
      activeTrip: 'Active Trip',
      profile: 'Profile & Account',
      todayStats: 'Today Stats',
      fuel: 'Fuel Status',
      maint: 'Vehicle Status Indicator',
      wallet: 'Driver Wallet Balance',
      payout: 'Instant Settlement Cashout',
      vehicle: 'Duty Settings & Vehicle Toggle',
      nav: 'Navigation Preference',
      help: 'Help & Support (Emergency)',
      report: 'Report Dispute / Issue',
      call: 'Call Admin Support',
      lang: 'Language & App Settings',
    },
    kn: {
      dashboard: 'ಚಾಲಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      duty: 'ಡ್ಯೂಟಿ ಸ್ಥಿತಿ',
      activeTrip: 'ಸಕ್ರಿಯ ಟ್ರಿಪ್',
      profile: 'ಪ್ರೊಫೈಲ್ ಮತ್ತು ಖಾತೆ',
      todayStats: 'ಇಂದಿನ ಅಂಕಿಅಂಶಗಳು',
      fuel: 'ಇಂಧನ ಸ್ಥಿತಿ',
      maint: 'ವಾಹನ ಸ್ಥಿತಿ ಸೂಚಕ',
      wallet: 'ಚಾಲಕ ವಾಲೆಟ್ ಬ್ಯಾಲೆನ್ಸ್',
      payout: 'ತಕ್ಷಣದ ಬ್ಯಾಂಕ್ ವರ್ಗಾವಣೆ',
      vehicle: 'ಡ್ಯೂಟಿ ಸೆಟ್ಟಿಂಗ್ಸ್ ಮತ್ತು ವಾಹನ ಬದಲಾವಣೆ',
      nav: 'ನಕ್ಷೆಯ ಆದ್ಯತೆ',
      help: 'ಸಹಾಯ ಮತ್ತು ಬೆಂಬಲ (ತುರ್ತು)',
      report: 'ವಿವಾದ / ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
      call: 'ಅಡ್ಮಿನ್ ಸಹಾಯವಾಣಿಗೆ ಕರೆ ಮಾಡಿ',
      lang: 'ಭಾಷೆ ಮತ್ತು ಆಪ್ ಸೆಟ್ಟಿಂಗ್ಸ್',
    }
  }[appLang];

  // Online simulator trigger
  useEffect(() => {
    let timeout: any;
    if (isOnline && !activeTrip && !incomingRequest) {
      timeout = setTimeout(() => {
        const mockRequest: ActiveRequest = {
          touristName: 'Abhishek (Tourist)',
          pickup: 'Bengaluru Palace Entrance Gate',
          pickupLat: 12.9982,
          pickupLng: 77.5920,
          drop: 'Kempegowda Airport Terminal 1',
          dropLat: 13.1986,
          dropLng: 77.7066,
          distanceKm: 32.5,
          durationMins: 45,
          estimatedFare: 980,
          otp: '8240',
        };
        setIncomingRequest(mockRequest);
        setTimerSeconds(15);
        setRequestVisible(true);
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [isOnline, activeTrip, incomingRequest]);

  // Request timer
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
    setActiveTrip(incomingRequest);
    setTripPhase('pickup');
    setIncomingRequest(null);
    setActiveTab('active_trip');
    Alert.alert(
      appLang === 'kn' ? 'ಪ್ರವಾಸ ಒಪ್ಪಿಕೊಳ್ಳಲಾಗಿದೆ!' : 'Ride Accepted!',
      appLang === 'kn' ? 'ಜಿಪಿಎಸ್ ಮಾರ್ಗಸೂಚಿ ಆರಂಭವಾಗಿದೆ. ಪಿಕಪ್ ಸ್ಥಳಕ್ಕೆ ತೆರಳಿ.' : 'GPS navigation routing started. Proceed to pickup.',
      [{ text: 'OK' }]
    );
  };

  const handleRejectRequest = () => {
    setRequestVisible(false);
    setIncomingRequest(null);
    Alert.alert(
      appLang === 'kn' ? 'ಪ್ರವಾಸ ನಿರಾಕರಿಸಲಾಗಿದೆ' : 'Ride Rejected',
      appLang === 'kn' ? 'ಶೀಘ್ರದಲ್ಲೇ ನಿಮಗೆ ಮತ್ತೊಂದು ಟ್ರಿಪ್ ವಿನಂತಿ ಸಿಗಲಿದೆ.' : 'You will receive another booking shortly.'
    );
  };

  const handleVerifyOtp = () => {
    if (!activeTrip) return;
    if (enteredOtp === activeTrip.otp) {
      setOtpVisible(false);
      setEnteredOtp('');
      setTripPhase('trip');
      Alert.alert(
        appLang === 'hi' ? 'सत्यापन सफल!' : 'Verification Success!',
        appLang === 'hi' ? `यात्रा शुरू हो चुकी है। गंतव्य: ${activeTrip.drop}` : `The trip has started. Proceed to: ${activeTrip.drop}.`
      );
    } else {
      Alert.alert('Invalid OTP', 'The code did not match. Please verify with rider (Try 8240).');
    }
  };

  const handleEndTrip = () => {
    if (!activeTrip) return;
    Alert.alert(
      appLang === 'hi' ? 'यात्रा समाप्त करें' : 'Complete Trip',
      appLang === 'hi' ? 'क्या आप इस यात्रा को समाप्त करना चाहते हैं?' : 'Are you sure you want to end this trip and collect payment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm End',
          onPress: () => {
            const fareEarned = activeTrip.estimatedFare;
            const distCovered = activeTrip.distanceKm;
            setEarningsToday(prev => prev + fareEarned);
            setEarningsBalance(prev => prev + fareEarned);
            setKmDriven(prev => parseFloat((prev + distCovered).toFixed(1)));
            setTripsCount(prev => prev + 1);
            setDailyRides([
              {
                id: `ride_${Date.now()}`,
                title: `${activeTrip.pickup.split(' ')[0]} ➔ ${activeTrip.drop.split(' ')[0]}`,
                time: 'Just Now',
                fare: fareEarned,
                payout: 'Settled to Wallet'
              },
              ...dailyRides
            ]);
            setActiveTrip(null);
            setTripPhase('pickup');
            setActiveTab('profile');
            Alert.alert('Trip Complete!', `₹${fareEarned} added to your cashout balance.`);
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
        `₹${paidAmt} successfully dispatched to UPI: ${upiId}!`
      );
    }, 2000);
  };

  const handleReportDispute = (issue: string) => {
    setDisputeVisible(false);
    Alert.alert(
      'Report Submitted',
      `Issue regarding "${issue}" has been reported to Admin. Verification is underway.`,
      [{ text: 'Done' }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#101014' : '#F5F5F7' }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header bar / Role switcher */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerLogo, { color: colors.amber }]}>VIBZZ DRIVER</Text>
          <Text style={[styles.headerGuideName, { color: colors.textPrimary }]}>Anil Gowda</Text>
        </View>
        
        <TouchableOpacity style={styles.switchRoleBtn} onPress={() => router.replace('/(tabs)')}>
          <MaterialIcons name="swap-horiz" size={scale(16)} color="#101010" />
          <Text style={styles.switchRoleText}>Tourist App</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Switchboard Body */}
      {activeTab === 'duty' && (
        <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
          {/* Go Online Duty status control */}
          <View style={[styles.dutyStatusCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.statusRow}>
              <View>
                <Text style={[styles.statusMainLabel, { color: colors.textPrimary }]}>{trans.duty}</Text>
                <Text style={[styles.statusSubText, { color: colors.textMuted }]}>
                  {isOnline ? 'ONLINE - Ready to accept trips' : 'OFFLINE - Go online to start earning'}
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

            <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
            
            <View style={styles.dutyStatsGrid}>
              <View style={styles.dutyStatCell}>
                <Text style={styles.statLabel}>Today KM</Text>
                <Text style={[styles.statValNum, { color: colors.textPrimary }]}>{kmDriven} km</Text>
              </View>
              <View style={[styles.vertDivider, { backgroundColor: colors.border }]} />
              <View style={styles.dutyStatCell}>
                <Text style={styles.statLabel}>Trips Done</Text>
                <Text style={[styles.statValNum, { color: colors.textPrimary }]}>{tripsCount}</Text>
              </View>
              <View style={[styles.vertDivider, { backgroundColor: colors.border }]} />
              <View style={styles.dutyStatCell}>
                <Text style={styles.statLabel}>Today Earnings</Text>
                <Text style={[styles.statValNum, { color: colors.amber }]}>₹{earningsToday}</Text>
              </View>
            </View>
          </View>

          {/* Vehicle status indicator */}
          <View style={[styles.vehicleStatusCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.amber }]}>{trans.maint}</Text>
            
            <View style={styles.vehicleModelRow}>
              <FontAwesome5 name="car" size={scale(20)} color={colors.amber} />
              <View style={{ marginLeft: scale(12) }}>
                <Text style={[styles.vehicleModelName, { color: colors.textPrimary }]}>
                  {selectedVehicle === 'innova' ? 'Toyota Innova Crysta' : 'Maruti Suzuki Swift'}
                </Text>
                <Text style={[styles.vehicleMetaSub, { color: colors.textMuted }]}>
                  {selectedVehicle === 'innova' ? '7 Seater · KA-03-MD-8240' : '5 Seater · KA-04-AB-1234'}
                </Text>
              </View>
            </View>

            <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statusProgressBlock}>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabel, { color: colors.textPrimary }]}>{trans.fuel}</Text>
                <Text style={[styles.progressValueText, { color: colors.amber }]}>78% Remaining</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '78%', backgroundColor: colors.amber }]} />
              </View>
            </View>

            <View style={styles.maintenanceStatsRow}>
              <View style={styles.maintenanceCell}>
                <MaterialIcons name="check-circle" size={scale(16)} color="#10B981" />
                <Text style={[styles.maintValText, { color: colors.textPrimary }]}>Engine OK</Text>
              </View>
              <View style={styles.maintenanceCell}>
                <MaterialIcons name="check-circle" size={scale(16)} color="#10B981" />
                <Text style={[styles.maintValText, { color: colors.textPrimary }]}>Tires OK</Text>
              </View>
              <View style={styles.maintenanceCell}>
                <MaterialIcons name="error-outline" size={scale(16)} color={colors.amber} />
                <Text style={[styles.maintValText, { color: colors.textPrimary }]}>Service soon</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {activeTab === 'active_trip' && (
        <View style={styles.activeTourTabPanel}>
          {activeTrip ? (
            <View style={{ flex: 1 }}>
              <View style={[styles.activeTourMapFrame, { borderBottomColor: colors.border }]}>
                {Platform.OS === 'web' || !MapView ? (
                  <View style={styles.webMapVisual}>
                    <View style={styles.gridCanvasOverlay} />
                    <View style={styles.hudNavBox}>
                      <Text style={styles.hudNavTitle}>CAB NAVIGATION ACTIVE</Text>
                      <Text style={styles.hudNavText}>Phase: {tripPhase.toUpperCase()}</Text>
                      {tripPhase === 'pickup' ? (
                        <Text style={styles.hudNavText}>Go to Pickup: {activeTrip.pickup}</Text>
                      ) : (
                        <Text style={styles.hudNavText}>Go to Drop: {activeTrip.drop}</Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <MapView
                    provider="google"
                    style={StyleSheet.absoluteFillObject}
                    initialRegion={{
                      latitude: 12.9982,
                      longitude: 77.5920,
                      latitudeDelta: 0.15,
                      longitudeDelta: 0.15,
                    }}
                  >
                    {tripPhase === 'pickup' ? (
                      <Marker
                        coordinate={{ latitude: activeTrip.pickupLat, longitude: activeTrip.pickupLng }}
                        title="Pickup Location"
                        pinColor={colors.amber}
                      />
                    ) : (
                      <Marker
                        coordinate={{ latitude: activeTrip.dropLat, longitude: activeTrip.dropLng }}
                        title="Dropoff Location"
                        pinColor="#ef4444"
                      />
                    )}
                  </MapView>
                )}
              </View>

              <View style={[styles.navDrawerBlock, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF' }]}>
                <View style={styles.touristProfileRow}>
                  <View style={styles.touristAvatarBox}>
                    <MaterialIcons name="person" size={scale(20)} color={colors.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.touristProfileName, { color: colors.textPrimary }]}>{activeTrip.touristName}</Text>
                    <Text style={[styles.touristProfileMeta, { color: colors.textMuted }]}>
                      Cab Trip · Est Payout: ₹{activeTrip.estimatedFare}
                    </Text>
                  </View>
                </View>

                {tripPhase === 'pickup' ? (
                  <View style={styles.phasePanelBlock}>
                    <Text style={[styles.phaseTitleText, { color: colors.textPrimary }]}>Phase 1: Navigate to Pickup</Text>
                    <View style={styles.phaseAddressCard}>
                      <MaterialIcons name="pin-drop" size={scale(16)} color={colors.amber} style={{ marginRight: scale(6) }} />
                      <Text style={[styles.phaseAddressVal, { color: colors.textPrimary }]} numberOfLines={1}>{activeTrip.pickup}</Text>
                    </View>

                    <View style={styles.actionBtnGrid}>
                      <TouchableOpacity style={[styles.navActionBtn, { backgroundColor: '#2C2C34' }]} onPress={() => Alert.alert('Status updated', 'Rider notified.')}>
                        <Text style={styles.navActionTextCancel}>Arrived</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.navActionBtn, { backgroundColor: colors.amber }]} onPress={() => setOtpVisible(true)}>
                        <Text style={styles.navActionTextConfirm}>Start Trip (OTP)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.phasePanelBlock}>
                    <Text style={[styles.phaseTitleText, { color: colors.textPrimary }]}>Phase 2: Driving to Dropoff</Text>
                    <View style={styles.phaseAddressCard}>
                      <MaterialIcons name="directions-car" size={scale(16)} color={colors.amber} style={{ marginRight: scale(6) }} />
                      <Text style={[styles.phaseAddressVal, { color: colors.textPrimary }]} numberOfLines={1}>
                        Dropoff: {activeTrip.drop}
                      </Text>
                    </View>

                    <View style={styles.actionBtnGrid}>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity style={[styles.navActionBtn, { backgroundColor: colors.amber }]} onPress={handleEndTrip}>
                        <Text style={styles.navActionTextConfirm}>End Trip & Collect</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.noActiveTourBlock}>
              <MaterialIcons name="navigation" size={scale(48)} color={colors.textMuted} style={{ marginBottom: verticalScale(14) }} />
              <Text style={[styles.noActiveTitle, { color: colors.textPrimary }]}>No Trip Active</Text>
              <Text style={[styles.noActiveSub, { color: colors.textMuted }]}>
                Toggle {"\""}Go Online{"\""} in the Duty status tab to start receiving instant booking requests from nearby tourists.
              </Text>
            </View>
          )}
        </View>
      )}

      {activeTab === 'profile' && (
        <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>
          
          {/* 1. Bank Account & Payout Details */}
          <View style={[styles.profileSectionCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border }]}>
            <Text style={[styles.profileSectionTitle, { color: colors.amber }]}>{trans.wallet}</Text>
            
            <View style={styles.payoutBalanceRow}>
              <View>
                <Text style={[styles.payoutAmtVal, { color: colors.textPrimary }]}>₹{earningsBalance}</Text>
                <Text style={[styles.payoutAmtSub, { color: colors.textMuted }]}>Current Balance ready to transfer</Text>
              </View>
              <TouchableOpacity 
                style={[styles.smallPayoutBtn, { backgroundColor: colors.amber }]} 
                onPress={handleInstantPayout}
                disabled={payoutLoading}
              >
                {payoutLoading ? <ActivityIndicator size="small" color="#101010" /> : <Text style={styles.smallPayoutBtnText}>Cashout</Text>}
              </TouchableOpacity>
            </View>

            <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Settlement UPI ID</Text>
            <View style={[styles.inputFieldBox, { borderColor: colors.border }]}>
              <MaterialIcons name="payment" size={scale(18)} color={colors.textMuted} style={{ marginRight: scale(8) }} />
              <TextInput
                style={[styles.textInputStyle, { color: colors.textPrimary }]}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="enter UPI ID"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>
          </View>

          {/* 2. Duty Settings & Vehicle Toggle */}
          <View style={[styles.profileSectionCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border }]}>
            <Text style={[styles.profileSectionTitle, { color: colors.amber }]}>{trans.vehicle}</Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: verticalScale(6) }]}>Choose Active Vehicle</Text>
            <View style={styles.vehiclePillsRow}>
              <TouchableOpacity
                style={[styles.vehiclePill, selectedVehicle === 'innova' && styles.vehiclePillActive, { borderColor: colors.border }]}
                onPress={() => setSelectedVehicle('innova')}
              >
                <FontAwesome5 name="car" size={scale(12)} color={selectedVehicle === 'innova' ? '#101010' : colors.textPrimary} />
                <Text style={[styles.vehiclePillText, { color: selectedVehicle === 'innova' ? '#101010' : colors.textPrimary }]}>Innova (KA-03-MD-8240)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.vehiclePill, selectedVehicle === 'swift' && styles.vehiclePillActive, { borderColor: colors.border }]}
                onPress={() => setSelectedVehicle('swift')}
              >
                <FontAwesome5 name="car" size={scale(12)} color={selectedVehicle === 'swift' ? '#101010' : colors.textPrimary} />
                <Text style={[styles.vehiclePillText, { color: selectedVehicle === 'swift' ? '#101010' : colors.textPrimary }]}>Swift (KA-04-AB-1234)</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />

            <View style={styles.toggleSettingItem}>
              <View>
                <Text style={[styles.toggleSettingLabel, { color: colors.textPrimary }]}>{trans.nav}</Text>
                <Text style={[styles.toggleSettingSub, { color: colors.textMuted }]}>
                  {navPreference === 'inapp' ? 'In-App GPS Screen' : 'Redirect to Google Maps App'}
                </Text>
              </View>
              <Switch
                value={navPreference === 'inapp'}
                onValueChange={(val) => setNavPreference(val ? 'inapp' : 'google')}
                trackColor={{ false: '#2C2C34', true: colors.amber }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* 3. Help & Support */}
          <View style={[styles.profileSectionCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border }]}>
            <Text style={[styles.profileSectionTitle, { color: colors.amber }]}>{trans.help}</Text>
            
            <TouchableOpacity 
              style={[styles.supportActionRowBtn, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: '#ef4444' }]}
              onPress={() => setDisputeVisible(true)}
            >
              <MaterialIcons name="report-problem" size={scale(18)} color="#ef4444" />
              <Text style={styles.supportActionBtnTextDanger}>{trans.report}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.supportActionRowBtn, { backgroundColor: 'rgba(245,197,24,0.08)', borderColor: colors.amber, marginTop: verticalScale(10) }]}
              onPress={() => Alert.alert('Dialing Admin Support', 'Calling हेल्पलाइन number +91 99000 82400...')}
            >
              <MaterialIcons name="call" size={scale(18)} color={colors.amber} />
              <Text style={[styles.supportActionBtnTextAmber, { color: colors.textPrimary }]}>{trans.call}</Text>
            </TouchableOpacity>
          </View>

          {/* 4. Language & App Settings */}
          <View style={[styles.profileSectionCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border }]}>
            <Text style={[styles.profileSectionTitle, { color: colors.amber }]}>{trans.lang}</Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: verticalScale(6) }]}>Select App Language / ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ</Text>
            <View style={styles.vehiclePillsRow}>
              <TouchableOpacity
                style={[styles.langPill, appLang === 'en' && styles.langPillActive, { borderColor: colors.border }]}
                onPress={() => setAppLang('en')}
              >
                <Text style={[styles.langPillText, { color: appLang === 'en' ? '#101010' : colors.textPrimary }]}>English</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.langPill, appLang === 'kn' && styles.langPillActive, { borderColor: colors.border }]}
                onPress={() => setAppLang('kn')}
              >
                <Text style={[styles.langPillText, { color: appLang === 'kn' ? '#101010' : colors.textPrimary }]}>ಕನ್ನಡ (Kannada)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Completed trips list */}
          <Text style={[styles.sectionTitle, { color: colors.amber, marginTop: scale(4) }]}>Today Completed Rides Log</Text>
          {dailyRides.map((item) => (
            <View key={item.id} style={[styles.dailyTripLogItem, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border }]}>
              <View style={styles.logHeaderRow}>
                <View>
                  <Text style={[styles.logTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                  <Text style={[styles.logTime, { color: colors.textMuted }]}>{item.time} · {item.payout}</Text>
                </View>
                <Text style={styles.logFare}>+₹{item.fare}</Text>
              </View>
            </View>
          ))}

          <View style={{ height: verticalScale(100) }} />
        </ScrollView>
      )}

      {/* Floating Bottom Tab Bar matching Tourist client look */}
      <View style={[styles.bottomTabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.tabBarItem} onPress={() => setActiveTab('duty')}>
          <View style={[styles.tabIconWrapper, activeTab === 'duty' && styles.tabIconWrapperActive]}>
            <MaterialIcons name="wifi" size={scale(22)} color={activeTab === 'duty' ? '#101010' : colors.textMuted} />
          </View>
          <Text style={[styles.tabBarLabel, { color: activeTab === 'duty' ? colors.amber : colors.textMuted }]}>
            {appLang === 'kn' ? 'ಡ್ಯೂಟಿ ಸ್ಥಿತಿ' : 'Duty Status'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBarItem} onPress={() => setActiveTab('active_trip')}>
          <View style={[styles.tabIconWrapper, activeTab === 'active_trip' && styles.tabIconWrapperActive]}>
            <MaterialIcons name="navigation" size={scale(22)} color={activeTab === 'active_trip' ? '#101010' : colors.textMuted} />
          </View>
          <Text style={[styles.tabBarLabel, { color: activeTab === 'active_trip' ? colors.amber : colors.textMuted }]}>
            {appLang === 'kn' ? 'ಸಕ್ರಿಯ ಟ್ರಿಪ್' : 'Active Trip'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBarItem} onPress={() => setActiveTab('profile')}>
          <View style={[styles.tabIconWrapper, activeTab === 'profile' && styles.tabIconWrapperActive]}>
            <MaterialIcons name="person" size={scale(22)} color={activeTab === 'profile' ? '#101010' : colors.textMuted} />
          </View>
          <Text style={[styles.tabBarLabel, { color: activeTab === 'profile' ? colors.amber : colors.textMuted }]}>
            {appLang === 'kn' ? 'ಖಾತೆ & ಸೆಟ್ಟಿಂಗ್ಸ್' : 'Account & Settings'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Simulated Incoming Request Modal Pop-up */}
      <Modal visible={requestVisible} transparent={true} animationType="slide">
        {incomingRequest && (
          <View style={styles.popupOverlay}>
            <View style={[styles.popupContentCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF' }]}>
              <View style={styles.popupTimerHeader}>
                <MaterialIcons name="warning" size={scale(18)} color={colors.amber} />
                <Text style={styles.popupTimerText}>INCOMING INSTANT CAB PING ({timerSeconds}s)</Text>
              </View>

              <View style={styles.popupMainDetails}>
                <View style={styles.touristNameBadge}>
                  <MaterialIcons name="person-pin" size={scale(22)} color={colors.amber} style={{ marginRight: scale(8) }} />
                  <View>
                    <Text style={[styles.touristNameVal, { color: colors.textPrimary }]}>{incomingRequest.touristName}</Text>
                    <Text style={[styles.touristMetaVal, { color: colors.textMuted }]}>Pickup Distance: 1.2 km away</Text>
                  </View>
                </View>

                <View style={[styles.popupDetailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Pickup Location</Text>
                  <Text style={[styles.popupVal, { color: colors.textPrimary }]} numberOfLines={1}>{incomingRequest.pickup}</Text>
                </View>

                <View style={[styles.popupDetailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Dropoff Location</Text>
                  <Text style={[styles.popupVal, { color: colors.textPrimary }]} numberOfLines={1}>{incomingRequest.drop}</Text>
                </View>

                <View style={styles.popupFareStats}>
                  <View style={styles.fareCell}>
                    <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Distance / Time</Text>
                    <Text style={[styles.payoutTextHighlight, { color: colors.textPrimary }]}>{incomingRequest.distanceKm} km ({incomingRequest.durationMins} mins)</Text>
                  </View>
                  <View style={[styles.vertDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.fareCell}>
                    <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Estimated Earnings</Text>
                    <Text style={[styles.payoutTextHighlight, { color: colors.amber }]}>₹{incomingRequest.estimatedFare}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.popupActionsGrid}>
                <TouchableOpacity style={[styles.popupBtn, { backgroundColor: '#2C2C34' }]} onPress={handleRejectRequest}>
                  <Text style={styles.popupBtnCancelText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.popupBtn, { backgroundColor: colors.amber }]} onPress={handleAcceptRequest}>
                  <Text style={styles.popupBtnConfirmText}>Accept Trip</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Start Trip OTP Entry Modal Pop-up */}
      <Modal visible={otpVisible} transparent={true} animationType="fade">
        {activeTrip && (
          <View style={styles.popupOverlay}>
            <View style={[styles.otpContentCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF' }]}>
              <Text style={[styles.otpTitle, { color: colors.textPrimary }]}>Enter Verification OTP</Text>
              <Text style={[styles.otpSub, { color: colors.textMuted }]}>Please check with {activeTrip.touristName} for the 4-digit code (e.g. 8240)</Text>

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

      {/* Dispute Reporter Modal popup */}
      <Modal visible={disputeVisible} transparent={true} animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={[styles.otpContentCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', width: '90%' }]}>
            <Text style={[styles.otpTitle, { color: colors.textPrimary, marginBottom: verticalScale(14) }]}>Report Dispute Event</Text>
            
            <TouchableOpacity style={styles.disputeSelectBtn} onPress={() => handleReportDispute('Rider Refused Payment')}>
              <Text style={[styles.disputeSelectText, { color: colors.textPrimary }]}>Rider refused cash payment</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.disputeSelectBtn} onPress={() => handleReportDispute('Accident Assistance')}>
              <Text style={[styles.disputeSelectText, { color: colors.textPrimary }]}>Accident or Breakdown assistance</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.disputeSelectBtn} onPress={() => handleReportDispute('App Glitch')}>
              <Text style={[styles.disputeSelectText, { color: colors.textPrimary }]}>App GPS or telemetry glitch</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.popupBtn, { backgroundColor: '#2C2C34', width: '100%', marginTop: scale(10) }]} onPress={() => setDisputeVisible(false)}>
              <Text style={styles.popupBtnCancelText}>Dismiss Dialog</Text>
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
  vehicleStatusCard: {
    borderRadius: scale(22),
    padding: scale(18),
    borderWidth: 1.2,
  },
  vehicleModelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleModelName: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  vehicleMetaSub: {
    fontSize: moderateFontScale(11.5),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  statusProgressBlock: {
    marginBottom: verticalScale(16),
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(6),
  },
  progressLabel: {
    fontSize: moderateFontScale(12.5),
    fontWeight: '700',
  },
  progressValueText: {
    fontSize: moderateFontScale(12.5),
    fontWeight: '800',
  },
  progressBarBg: {
    height: scale(8),
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: scale(4),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: scale(4),
  },
  maintenanceStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(4),
  },
  maintenanceCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  maintValText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
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
    fontSize: moderateFontScale(10.5),
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
  bottomTabBar: {
    position: 'absolute',
    bottom: scale(20),
    left: scale(20),
    right: scale(20),
    borderWidth: 1,
    borderRadius: scale(28),
    height: verticalScale(66),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabIconWrapper: {
    width: scale(40),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapperActive: {
    backgroundColor: '#F5C518',
  },
  tabBarLabel: {
    fontSize: moderateFontScale(10),
    fontWeight: '700',
    marginTop: verticalScale(2),
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
  profileSectionCard: {
    borderRadius: scale(22),
    padding: scale(16),
    borderWidth: 1.2,
    marginBottom: verticalScale(18),
  },
  profileSectionTitle: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(10),
  },
  payoutBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payoutAmtVal: {
    fontSize: moderateFontScale(26),
    fontWeight: '800',
  },
  payoutAmtSub: {
    fontSize: moderateFontScale(11.5),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  smallPayoutBtn: {
    borderRadius: scale(10),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
  },
  smallPayoutBtnText: {
    color: '#101010',
    fontWeight: '800',
    fontSize: moderateFontScale(11.5),
  },
  inputLabel: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
  },
  inputFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    height: verticalScale(38),
    marginTop: verticalScale(6),
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  textInputStyle: {
    flex: 1,
    fontSize: moderateFontScale(13.5),
    padding: 0,
    height: '100%',
  },
  sectionTitle: {
    fontSize: moderateFontScale(11),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(10),
  },
  vehiclePillsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(4),
  },
  vehiclePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    borderWidth: 1.2,
    borderRadius: scale(10),
    paddingVertical: verticalScale(6),
  },
  vehiclePillActive: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },
  vehiclePillText: {
    fontSize: moderateFontScale(9.5),
    fontWeight: '800',
  },
  toggleSettingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleSettingLabel: {
    fontSize: moderateFontScale(12.5),
    fontWeight: '700',
  },
  toggleSettingSub: {
    fontSize: moderateFontScale(10.5),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  supportActionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    borderWidth: 1.2,
    borderRadius: scale(12),
    paddingVertical: verticalScale(10),
  },
  supportActionBtnTextDanger: {
    color: '#ef4444',
    fontSize: moderateFontScale(12.5),
    fontWeight: '800',
  },
  supportActionBtnTextAmber: {
    fontSize: moderateFontScale(12.5),
    fontWeight: '800',
  },
  langPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderRadius: scale(10),
    paddingVertical: verticalScale(6),
  },
  langPillActive: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },
  langPillText: {
    fontSize: moderateFontScale(12),
    fontWeight: '800',
  },
  disputeSelectBtn: {
    width: '100%',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  disputeSelectText: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
    textAlign: 'center',
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
});
