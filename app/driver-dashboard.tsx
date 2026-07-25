import NotificationModal from '@/components/NotificationModal';
import { rideStateService } from '@src/services/rideStateService';
import {
  acceptTripApi,
  driverArrivedApi,
  fetchDriverAdvanceSchedulesApi,
  fetchDriverRequestsApi,
  fetchDriverStatsApi,
  fetchDriverTripsApi,
  fetchUserProfileApi,
  fetchWalletBalanceApi,
  respondDriverRequestApi,
  saveUserSettingsApi,
  submitWithdrawalApi,
  updateDriverLocationApi,
  updatePasswordApi,
  updateUserProfileApi
} from '@/constants/api';
import { clearUserSession, getUserSessionSync, saveUserSession } from '@/constants/authStore';
import { sendLocalNotification } from '@/constants/notifications';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { setAppTheme, toggleAppTheme, useColorScheme } from '@/hooks/use-color-scheme';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminState } from '@/constants/admin-state';

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
  const [isOnline, setIsOnline] = useState(true);
  const [appLang, setAppLang] = useState<'en' | 'kn'>('en');

  // Stats state
  const [kmDriven, setKmDriven] = useState(0);
  const [tripsCount, setTripsCount] = useState(0);
  const [earningsToday, setEarningsToday] = useState(0);
  const [earningsBalance, setEarningsBalance] = useState(0);

  // Settings & Toggles
  const [selectedVehicle, setSelectedVehicle] = useState<'innova' | 'swift'>('innova');
  const [navPreference, setNavPreference] = useState<'inapp' | 'google'>('inapp');

  // Modal support state
  const [disputeVisible, setDisputeVisible] = useState(false);
  const [confirmEndModalVisible, setConfirmEndModalVisible] = useState(false);
  const [completedModalVisible, setCompletedModalVisible] = useState(false);
  const [lastCompletedTrip, setLastCompletedTrip] = useState<any>(null);
  const [acceptedModalVisible, setAcceptedModalVisible] = useState(false);
  const [acceptedTripDetails, setAcceptedTripDetails] = useState<any>(null);

  // Incoming Request Simulation
  const [incomingRequest, setIncomingRequest] = useState<ActiveRequest | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [requestVisible, setRequestVisible] = useState(false);

  // Active trip state
  const [activeTrip, setActiveTrip] = useState<ActiveRequest | null>(null);
  const [tripPhase, setTripPhase] = useState<'pickup' | 'trip'>('pickup');
  const [otpVisible, setOtpVisible] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');

  // Loading triggers
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const currentSession = getUserSessionSync();
  const [driverName, setDriverName] = useState(currentSession?.name || currentSession?.profile?.name || 'Anil Gowda (Captain)');
  const [driverPhone, setDriverPhone] = useState(currentSession?.phone || currentSession?.profile?.phone || '+91 99000 82400');
  const [vehicleModel, setVehicleModel] = useState(currentSession?.profile?.vehicle_model || 'Innova Crysta AC');
  const [vehicleNumber, setVehicleNumber] = useState(currentSession?.profile?.vehicle_number || 'KA-01-EX-8240');
  const [vehicleType, setVehicleType] = useState(currentSession?.profile?.vehicle_type || '7 Seater Cab');
  const [photoUrl, setPhotoUrl] = useState(currentSession?.profile?.photo_url || currentSession?.profile?.photoUrl || '');
  const [upiId, setUpiId] = useState(currentSession?.profile?.upi_id || currentSession?.profile?.upiId || 'ka03md8240@okaxis');

  // Unified Edit Mode & Password toggle
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [driverTrips, setDriverTrips] = useState<any[]>([]);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    async function loadDriverBackendData() {
      const session = getUserSessionSync();
      const driverId = session?.id;

      if (!driverId) {
        setKmDriven(0);
        setTripsCount(0);
        setEarningsToday(0);
        setEarningsBalance(0);
        setDriverTrips([]);
        return;
      }

      const userRes = await fetchUserProfileApi(driverId);
      if (userRes && userRes.success && userRes.user) {
        const u = userRes.user;
        const p = u.profile || {};
        if (u.name) setDriverName(u.name);
        if (u.phone) setDriverPhone(u.phone);
        if (p.vehicle_model) setVehicleModel(p.vehicle_model);
        if (p.vehicle_number) setVehicleNumber(p.vehicle_number);
        if (p.photo_url || p.photoUrl) setPhotoUrl(p.photo_url || p.photoUrl);
        if (p.upi_id || p.upiId) setUpiId(p.upi_id || p.upiId);
      }

      const walletRes = await fetchWalletBalanceApi(driverId);
      if (walletRes && walletRes.balance !== undefined) {
        setEarningsBalance(walletRes.balance);
      } else {
        setEarningsBalance(0);
      }

      const statsRes = await fetchDriverStatsApi(driverId);
      if (statsRes && statsRes.success && statsRes.data) {
        setKmDriven(statsRes.data.todayKm || 0);
        setTripsCount(statsRes.data.tripsCount || 0);
        setEarningsToday(statsRes.data.todayEarnings || 0);
      } else {
        setKmDriven(0);
        setTripsCount(0);
        setEarningsToday(0);
      }

      const tripsRes = await fetchDriverTripsApi(driverId);
      if (tripsRes && Array.isArray(tripsRes)) {
        setDriverTrips(tripsRes);
      } else {
        setDriverTrips([]);
      }
    }
    loadDriverBackendData();
  }, []);

  const handlePickImage = async () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option to upload your photo:',
      [
        {
          text: '📸 Take Photo (Camera)',
          onPress: async () => {
            const { granted } = await ImagePicker.requestCameraPermissionsAsync();
            if (!granted) {
              Alert.alert('Permission Denied', 'Camera access permission is required.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.3,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              let uri = asset.uri;
              if (asset.base64) {
                uri = asset.base64.startsWith('data:') ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`;
              }
              setPhotoUrl(uri);
            }
          },
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: async () => {
            const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!granted) {
              Alert.alert('Permission Denied', 'Gallery access permission is required.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.3,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              let uri = asset.uri;
              if (asset.base64) {
                uri = asset.base64.startsWith('data:') ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`;
              }
              setPhotoUrl(uri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSaveUnifiedProfile = async () => {
    const session = getUserSessionSync();
    const userId = session?.id || session?.profile?.user_id || 'd1';

    setIsSavingProfile(true);

    // 1. Update Profile (Name, Phone, Photo, Vehicle details)
    const apiRes = await updateUserProfileApi(userId, {
      name: driverName,
      phone: driverPhone,
      role: 'driver',
      vehicle_model: vehicleModel,
      vehicle_number: vehicleNumber,
      photo_url: photoUrl,
      photoUrl: photoUrl,
      upiId: upiId,
    });
    if (!apiRes?.success) {
      setIsSavingProfile(false);
      Alert.alert('Update Failed', apiRes?.message || 'Could not save your profile. Please try again.');
      return;
    }
    // 2. Update Password if entered
    let passwordUpdated = false;
    if (newPassword.trim().length > 0) {
      if (!currentPassword.trim()) {
        setIsSavingProfile(false);
        Alert.alert('🔐 Current Password Required', 'Please enter your current password to update your password.');
        return;
      }
      const passRes = await updatePasswordApi({
        userId: userId,
        currentPassword,
        newPassword,
      });

      if (passRes && passRes.success) {
        passwordUpdated = true;
        setCurrentPassword('');
        setNewPassword('');
      } else {
        setIsSavingProfile(false);
        Alert.alert('🔐 Password Error', passRes?.message || 'Current password invalid. Failed to update password.');
        return;
      }
    }

    setIsSavingProfile(false);

    const updatedSession = {
      ...(session || { id: userId, role: 'driver', status: 'Active' }),
      name: driverName,
      phone: driverPhone,
      profile: {
        ...(session?.profile || {}),
        ...(apiRes?.user?.profile || {}),
        name: driverName,
        phone: driverPhone,
        vehicle_model: vehicleModel,
        vehicle_number: vehicleNumber,
        photo_url: photoUrl,
        photoUrl: photoUrl,
        upiId: upiId,
      }
    };
    await saveUserSession(updatedSession as any);
    setIsEditMode(false);

    Alert.alert('Profile updated successfully!');
  };

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

  // Driver Session & Live Location Updates
  useEffect(() => {
    if (!isOnline) return;
    const session = getUserSessionSync();
    const driverId = session?.id;
    if (!driverId) return;

    // Post real-time location coordinates
    const locationInterval = setInterval(async () => {
      await updateDriverLocationApi(driverId, 12.9716, 77.5946, true);
    }, 10000);

    // Poll live pending ride requests from backend
    const pollRequests = async () => {
      const reqs = await fetchDriverRequestsApi(driverId);
      if (reqs && reqs.length > 0 && !activeTrip && !requestVisible && !acceptedModalVisible) {
        const firstReq = reqs[0];
        setIncomingRequest({
          touristName: firstReq.customerName || 'Tourist Customer',
          pickup: firstReq.pickupName || firstReq.title || 'Bengaluru Pickup',
          pickupLat: 12.9716,
          pickupLng: 77.5946,
          drop: firstReq.dropName || 'Destination Point',
          dropLat: 12.3053,
          dropLng: 76.6552,
          distanceKm: firstReq.durationHours ? firstReq.durationHours * 30 : 45,
          durationMins: firstReq.durationHours ? firstReq.durationHours * 60 : 60,
          estimatedFare: Number(firstReq.price || firstReq.amount || 2500),
          paymentMode: firstReq.paymentMode || 'Cash',
          otp: firstReq.otp || '8240',
          tripId: firstReq.id,
        } as any);
        setTimerSeconds(25);
        setRequestVisible(true);
      }
    };

    pollRequests();
    const requestInterval = setInterval(pollRequests, 4000);

    return () => {
      clearInterval(locationInterval);
      clearInterval(requestInterval);
    };
  }, [isOnline, activeTrip, requestVisible, acceptedModalVisible]);

  // Request timer countdown for popup modal
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

  // Fetch real-time driver schedules & pending queries from PostgreSQL database
  useEffect(() => {
    const loadDriverData = async () => {
      const session = getUserSessionSync();
      const dId = session?.id;
      if (!dId) return;

      const schedules = await fetchDriverAdvanceSchedulesApi(dId);
      if (Array.isArray(schedules)) {
        setDriverTrips(schedules);
      } else {
        setDriverTrips([]);
      }

      // Fetch driver stats
      const statsRes = await fetchDriverStatsApi(dId);
      if (statsRes && statsRes.success && statsRes.data) {
        setKmDriven(statsRes.data.todayKm || 0);
        setTripsCount(statsRes.data.tripsCount || 0);
        setEarningsToday(statsRes.data.todayEarnings || 0);
      } else {
        setKmDriven(0);
        setTripsCount(0);
        setEarningsToday(0);
      }
    };
    loadDriverData();
    const interval = setInterval(loadDriverData, 5000);
    return () => clearInterval(interval);
  }, [updateTrigger]);

  const handleLogout = async () => {
    Alert.alert(
      'Driver Logout',
      'Are you sure you want to log out of Driver Dashboard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearUserSession();
            router.replace('/(auth)/sign-in');
          }
        }
      ]
    );
  };

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;
    const session = getUserSessionSync();
    const driverId = session?.id;
    const tripId = (incomingRequest as any).tripId;

    if (tripId && driverId) {
      await respondDriverRequestApi(tripId, driverId, 'accept', session?.name || driverName);
    }

    const acceptedObj = { ...incomingRequest };

    setRequestVisible(false);
    setActiveTrip(acceptedObj);
    setAcceptedTripDetails(acceptedObj);
    setTripPhase('pickup');
    setIncomingRequest(null);

    // Trigger custom themed Ride Accepted celebration popup modal!
    setAcceptedModalVisible(true);
  };

  const handleRejectRequest = async () => {
    const session = getUserSessionSync();
    const driverId = session?.id;
    const tripId = (incomingRequest as any)?.tripId;

    if (tripId && driverId) {
      await respondDriverRequestApi(tripId, driverId, 'decline');
    }

    setRequestVisible(false);
    setIncomingRequest(null);
    setActiveTrip(null);
    setUpdateTrigger(prev => prev + 1);
  };

  const handleVerifyOtp = () => {
    if (!activeTrip) return;
    const expectedOtp = String(activeTrip.otp || '8240').trim();
    if (enteredOtp.trim() === expectedOtp) {
      setOtpVisible(false);
      setEnteredOtp('');
      setTripPhase('trip');

      sendLocalNotification(
        '🚀 Ride Started!',
        `OTP Verified. Navigation started towards ${activeTrip.drop}.`
      );
    } else {
      Alert.alert('Incorrect OTP ❌', `The entered OTP "${enteredOtp}" is incorrect. Please ask the customer for the correct booking OTP.`);
    }
  };

  const handleEndTrip = () => {
    if (!activeTrip) return;
    setConfirmEndModalVisible(true);
  };

  const executeCompleteTrip = async () => {
    if (!activeTrip) return;
    setConfirmEndModalVisible(false);

    const fareEarned = activeTrip.estimatedFare;
    const distCovered = activeTrip.distanceKm;

    const session = getUserSessionSync();
    const driverId = session?.id;
    const tripId = (activeTrip as any).tripId;

    if (tripId && driverId) {
      await respondDriverRequestApi(tripId, driverId, 'complete', session?.name || driverName);
    }

    setEarningsToday(prev => prev + fareEarned);
    setEarningsBalance(prev => prev + fareEarned);
    setKmDriven(prev => parseFloat((prev + distCovered).toFixed(1)));
    setTripsCount(prev => prev + 1);

    const summary = {
      title: `${activeTrip.pickup.split(' ')[0]} ➔ ${activeTrip.drop.split(' ')[0]}`,
      pickup: activeTrip.pickup,
      drop: activeTrip.drop,
      fare: fareEarned,
      dist: distCovered,
      tourist: activeTrip.touristName || 'Passenger',
    };

    setLastCompletedTrip(summary);
    setDriverTrips(prev => [
      {
        id: `ride_${Date.now()}`,
        title: summary.title,
        time: 'Just Now',
        fare: fareEarned,
        payout: 'Settled to Wallet'
      },
      ...prev
    ]);

    setActiveTrip(null);
    setTripPhase('pickup');
    setCompletedModalVisible(true);

    sendLocalNotification(
      '🎉 Trip Completed!',
      `Trip finished! Total earnings ₹${fareEarned} added to your driver wallet.`
    );
  };

  const handleInstantPayout = async () => {
    if (earningsBalance <= 0) {
      Alert.alert('No Balance', 'Your bank payout balance is empty.');
      return;
    }
    const session = getUserSessionSync();
    setPayoutLoading(true);

    const res = await submitWithdrawalApi({
      userId: session?.id || 'd1',
      userName: session?.name || 'Anil Gowda',
      role: 'driver',
      amount: earningsBalance,
      upiId: upiId || 'driver@okaxis',
    });

    setPayoutLoading(false);

    if (res.success) {
      const paidAmt = earningsBalance;
      setEarningsBalance(0);
      Alert.alert(
        '🎉 Withdrawal Request Submitted!',
        `₹${paidAmt} withdrawal request submitted to UPI: ${upiId}.\nStatus: Pending Admin Approval.`
      );
    } else {
      Alert.alert('Error', res.message || 'Failed to submit withdrawal request.');
    }
  };

  const handleReportDispute = (issue: string) => {
    setDisputeVisible(false);
    Alert.alert(
      'Report Submitted',
      `Issue regarding "${issue}" has been reported to Admin. Verification is underway.`,
      [{ text: 'Done' }]
    );
  };

  const driverDisplayName = driverName || currentSession?.name || currentSession?.profile?.name || 'Anil Gowda (Captain)';
  const vehicleModelName = vehicleModel || currentSession?.profile?.vehicle_model || 'Innova Crysta AC';
  const vehiclePlateNum = vehicleNumber || currentSession?.profile?.vehicle_number || 'KA-01-EX-8240';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#101014' : '#F5F5F7' }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Clean Driver Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
            <Text style={[styles.headerLogo, { color: colors.amber }]}>VIBE CAPTAIN</Text>
            <View style={{ backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: isOnline ? '#10B981' : colors.border, paddingHorizontal: scale(8), paddingVertical: 2, borderRadius: scale(6) }}>
              <Text style={{ color: isOnline ? '#10B981' : colors.textMuted, fontSize: moderateFontScale(9), fontWeight: '900' }}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
          <Text style={[styles.headerGuideName, { color: colors.textPrimary, marginTop: 2 }]} numberOfLines={1}>
            {driverDisplayName} <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), fontWeight: '600' }}>({vehicleModelName} • {vehiclePlateNum})</Text>
          </Text>
        </View>

        {/* Bell Notification Icon */}
        <NotificationModal role="driver" />
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

          {/* Upcoming Advance Bookings & Pending Requests card */}
          <View style={[styles.vehicleStatusCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border, marginTop: verticalScale(14) }]}>
            <Text style={[styles.sectionTitle, { color: colors.amber }]}>Upcoming & Pending Booking Queries</Text>
            {(() => {
              const allBookingsMap = new Map();

              // 1. Load real-time PostgreSQL database trips fetched via API
              if (Array.isArray(driverTrips)) {
                driverTrips.forEach(t => {
                  allBookingsMap.set(t.id, {
                    id: t.id,
                    title: t.title || `${t.pickupName || 'Pickup'} ➔ ${t.dropName || 'Destination'}`,
                    date: t.date || 'Today',
                    time: t.time || 'Immediate',
                    price: t.price || t.amount || 1200,
                    touristName: t.touristName || t.customerName || 'Tourist Client',
                    driverOrGuideName: t.driverOrGuideName || '',
                    status: t.status || 'Pending',
                    paymentMode: t.paymentMode || 'Cash',
                    assignedToId: t.assignedToId,
                    otp: t.otp || '8240',
                  });
                });
              }

              // 2. Load client-side advance bookings
              if (adminState && Array.isArray(adminState.advanceBookings)) {
                adminState.advanceBookings.forEach(b => {
                  if (b.status !== 'Cancelled') {
                    allBookingsMap.set(b.id, {
                      id: b.id,
                      title: b.title,
                      date: b.date,
                      time: b.time,
                      price: b.price,
                      touristName: b.touristName,
                      driverOrGuideName: b.driverOrGuideName,
                      status: b.status,
                      paymentMode: b.paymentMode,
                      assignedToId: b.assignedToId,
                      otp: '8240',
                    });
                  }
                });
              }

              const combinedList = Array.from(allBookingsMap.values());

              if (combinedList.length === 0) {
                return (
                  <View style={{ padding: scale(16), alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(13) }}>
                      No active or pending bookings found for driver.
                    </Text>
                  </View>
                );
              }

              return combinedList.map(booking => {
                const isAcceptedByMe = booking.driverOrGuideName?.toLowerCase().includes(driverName.toLowerCase()) || booking.assignedToId === currentSession?.id;
                const isPending = booking.status === 'Pending' || booking.status === 'Dispatched' || booking.status === 'Confirmed';

                return (
                  <View key={booking.id} style={[styles.dailyTripLogItem, { borderColor: colors.border, backgroundColor: isDark ? '#16161B' : '#F9F9F9', marginTop: verticalScale(10) }]}>
                    <View style={styles.logHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.logTitle, { color: colors.textPrimary }]}>{booking.title}</Text>
                        <Text style={[styles.logTime, { color: colors.textMuted }]}>
                          Scheduled: {booking.date} · {booking.time}
                        </Text>
                        <Text style={[styles.logTime, { color: colors.textMuted }]}>
                          Client: {booking.touristName}
                        </Text>
                        <Text style={[styles.logTime, { color: colors.amber }]}>
                          Payment: {booking.paymentMode} | OTP: {booking.otp}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.logFare}>₹{booking.price}</Text>
                        <View style={[styles.statusBadgeCompact, { backgroundColor: booking.status === 'Accepted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245,197,24,0.1)', marginTop: verticalScale(4) }]}>
                          <Text style={{ fontSize: moderateFontScale(9), fontWeight: '700', color: booking.status === 'Accepted' ? '#10B981' : colors.amber }}>
                            {booking.status === 'Accepted' ? (isAcceptedByMe ? 'My Job' : 'Accepted') : 'Pending Request'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {isPending && (
                      <TouchableOpacity
                        style={[styles.smallPayoutBtn, { backgroundColor: colors.amber, marginTop: verticalScale(10), alignItems: 'center' }]}
                        onPress={async () => {
                          const session = getUserSessionSync();
                          const dId = session?.id || 'd1';
                          const name = session?.name || driverName || 'Shubham';
                          
                          await respondDriverRequestApi(booking.id, dId, 'accept', name);
                          await acceptTripApi(booking.id, dId, name);

                          booking.status = 'Accepted';
                          booking.driverOrGuideName = name;
                          booking.assignedToId = dId;

                          const reqObj: ActiveRequest = {
                            touristName: booking.touristName,
                            pickup: booking.title,
                            pickupLat: 12.9716,
                            pickupLng: 77.5946,
                            drop: booking.title,
                            dropLat: 12.3053,
                            dropLng: 76.6552,
                            distanceKm: 45,
                            durationMins: 60,
                            estimatedFare: Number(booking.price) || 2500,
                            paymentMode: booking.paymentMode || 'Cash',
                            otp: booking.otp || '8240',
                            tripId: booking.id,
                          } as any;

                          setActiveTrip(reqObj);
                          setTripPhase('pickup');
                          setActiveTab('active_trip');

                          sendLocalNotification(
                            '✅ Booking Accepted!',
                            `You have accepted the trip: ${booking.title}! GPS navigation active.`
                          );
                          Alert.alert('🎉 Booking Accepted!', `Trip '${booking.title}' accepted! Switched to Active Trip tab.`);
                          setUpdateTrigger(prev => prev + 1);
                        }}
                      >
                        <Text style={styles.smallPayoutBtnText}>Accept Booking Schedule</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              });
            })()}
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
                      <TouchableOpacity
                        style={[styles.navActionBtn, { backgroundColor: '#2C2C34' }]}
                        onPress={async () => {
                          const tripId = (activeTrip as any)?.tripId || 'active_trip_1';
                          const currStatus = rideStateService.getRideStatus(tripId);

                          // Safety guard check: must be STARTED to transition to ARRIVED
                          if (currStatus !== 'STARTED' && currStatus !== 'TRIP_STARTED') {
                            Alert.alert(
                              '📍 Arrived Guard',
                              'Arrived action is locked until trip state transitions to STARTED.'
                            );
                            return;
                          }

                          await rideStateService.transitionRideState(tripId, 'ARRIVED', driverName);
                          sendLocalNotification('📍 Arrived at Location!', 'Rider notified that you have arrived.');
                          Alert.alert('📍 Arrived at Location', 'Notification sent to tourist!');
                        }}
                      >
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

          {/* Captain Main Summary Card */}
          <View style={[styles.profileSectionCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border, alignItems: 'center' }]}>
            {/* Avatar Circle with Camera Upload Action */}
            <TouchableOpacity onPress={isEditMode ? handlePickImage : undefined} activeOpacity={isEditMode ? 0.7 : 1} style={{ position: 'relative', marginBottom: verticalScale(10) }}>
              <View style={{
                width: scale(74),
                height: scale(74),
                borderRadius: scale(37),
                backgroundColor: colors.amber,
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: colors.amber,
              }}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ fontSize: moderateFontScale(28), fontWeight: '900', color: '#101010' }}>
                    {driverDisplayName ? driverDisplayName[0].toUpperCase() : 'C'}
                  </Text>
                )}
              </View>
              {isEditMode && (
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: '#101010',
                  padding: scale(6),
                  borderRadius: scale(14),
                  borderWidth: 1,
                  borderColor: colors.amber,
                }}>
                  <MaterialIcons name="photo-camera" size={scale(14)} color={colors.amber} />
                </View>
              )}
            </TouchableOpacity>

            <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(18), fontWeight: '900' }}>
              {driverDisplayName}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginTop: 2 }}>
              {driverPhone}
            </Text>

            {/* Vehicle Detail Badges */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), justifyContent: 'center', marginTop: verticalScale(12) }}>
              <View style={{ backgroundColor: 'rgba(245, 197, 24, 0.12)', paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: scale(8), borderWidth: 1, borderColor: colors.amber, flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
                <FontAwesome5 name="car" size={scale(12)} color={colors.amber} />
                <Text style={{ color: colors.amber, fontSize: moderateFontScale(11), fontWeight: '700' }}>{vehicleModelName}</Text>
              </View>

              <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: scale(8), borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
                <MaterialIcons name="subtitles" size={scale(14)} color={colors.textMuted} />
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(11), fontWeight: '700' }}>{vehiclePlateNum}</Text>
              </View>

              <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: scale(8), borderWidth: 1, borderColor: '#10B981', flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
                <MaterialIcons name="verified" size={scale(14)} color="#10B981" />
                <Text style={{ color: '#10B981', fontSize: moderateFontScale(11), fontWeight: '700' }}>{vehicleType}</Text>
              </View>
            </View>

            {/* Toggle Edit Mode Button */}
            <TouchableOpacity
              style={{
                marginTop: verticalScale(16),
                paddingVertical: verticalScale(8),
                paddingHorizontal: scale(16),
                borderRadius: scale(10),
                borderWidth: 1.5,
                borderColor: colors.amber,
                backgroundColor: isEditMode ? 'rgba(245, 197, 24, 0.15)' : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: scale(6),
              }}
              onPress={() => setIsEditMode(!isEditMode)}
            >
              <MaterialIcons name={isEditMode ? 'visibility' : 'edit'} size={scale(16)} color={colors.amber} />
              <Text style={{ color: colors.amber, fontWeight: '800', fontSize: moderateFontScale(12) }}>
                {isEditMode ? 'Cancel Edit / View Profile' : 'Edit Profile & Password'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Unified Edit Card (When Edit Mode Active) */}
          {isEditMode && (
            <View style={[styles.profileSectionCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.amber, borderWidth: 1.5 }]}>
              <Text style={[styles.profileSectionTitle, { color: colors.amber }]}>Edit Captain Details</Text>

              {/* Photo Pick Action Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(245, 197, 24, 0.1)',
                  borderColor: colors.amber,
                  borderWidth: 1,
                  borderRadius: scale(10),
                  paddingVertical: verticalScale(10),
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: scale(8),
                  marginBottom: verticalScale(12),
                }}
                onPress={handlePickImage}
              >
                <MaterialIcons name="add-a-photo" size={scale(18)} color={colors.amber} />
                <Text style={{ color: colors.amber, fontWeight: '800', fontSize: moderateFontScale(12) }}>
                  Upload Profile Pic (Gallery / Camera)
                </Text>
              </TouchableOpacity>

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Full Name</Text>
              <View style={[styles.inputFieldBox, { borderColor: colors.border, marginTop: verticalScale(4) }]}>
                <MaterialIcons name="person" size={scale(18)} color={colors.amber} style={{ marginRight: scale(8) }} />
                <TextInput
                  style={[styles.textInputStyle, { color: colors.textPrimary }]}
                  value={driverName}
                  onChangeText={setDriverName}
                  placeholder="Driver Full Name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: verticalScale(10) }]}>Current Password (Required to change password)</Text>
              <View style={[styles.inputFieldBox, { borderColor: colors.border, marginTop: verticalScale(4) }]}>
                <MaterialIcons name="lock" size={scale(18)} color={colors.amber} style={{ marginRight: scale(8) }} />
                <TextInput
                  style={[styles.textInputStyle, { color: colors.textPrimary }]}
                  secureTextEntry={!showPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: verticalScale(10) }]}>New Password</Text>
              <View style={[styles.inputFieldBox, { borderColor: colors.border, marginTop: verticalScale(4) }]}>
                <MaterialIcons name="lock-open" size={scale(18)} color={colors.amber} style={{ marginRight: scale(8) }} />
                <TextInput
                  style={[styles.textInputStyle, { color: colors.textPrimary, flex: 1 }]}
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: scale(4) }}>
                  <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={scale(18)} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.detailedWalletBtn, { marginTop: verticalScale(16), backgroundColor: colors.amber, borderColor: colors.amber }]}
                onPress={handleSaveUnifiedProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color="#101014" size="small" />
                ) : (
                  <Text style={[styles.detailedWalletBtnText, { color: '#101014', fontWeight: '900' }]}>
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Wallet & Payout Card */}
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
            <TouchableOpacity
              style={[styles.detailedWalletBtn, { marginTop: verticalScale(14), borderColor: colors.amber }]}
              onPress={() => router.push('/(tabs)/driver-wallet' as any)}
            >
              <Text style={[styles.detailedWalletBtnText, { color: colors.amber }]}>View Detailed Wallet & Pay History</Text>
            </TouchableOpacity>
          </View>

          {/* PREFERENCES SECTION */}
          <View style={[styles.profileSectionCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border }]}>
            <Text style={[styles.profileSectionTitle, { color: colors.amber }]}>Preferences</Text>

            {/* Dark Theme toggle */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Dark Theme</Text>
                <Text style={[styles.toggleSubLabel, { color: colors.textMuted }]}>
                  {isDark ? 'Dark mode active' : 'Light mode active'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleAppTheme}
                trackColor={{ false: '#767577', true: colors.amber }}
                thumbColor={isDark ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            <View style={[styles.statsDivider, { backgroundColor: colors.border, marginVertical: verticalScale(10) }]} />

            {/* Kannada Language toggle switch */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Kannada Language</Text>
                <Text style={[styles.toggleSubLabel, { color: colors.textMuted }]}>
                  {appLang === 'kn' ? 'ಕನ್ನಡ ಸಕ್ರಿಯವಾಗಿದೆ' : 'English is active'}
                </Text>
              </View>
              <Switch
                value={appLang === 'kn'}
                onValueChange={(val) => {
                  const newLang = val ? 'kn' : 'en';
                  setAppLang(newLang);
                  const session = getUserSessionSync();
                  if (session?.id) saveUserSettingsApi(session.id, { language: newLang });
                  Alert.alert(
                    val ? 'ಭಾಷೆ ಬದಲಾಗಿದೆ' : 'Language Changed',
                    val ? 'ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ.' : 'Language has been changed to English.'
                  );
                }}
                trackColor={{ false: '#767577', true: colors.amber }}
                thumbColor={appLang === 'kn' ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Big Logout Button at the Bottom */}
          <TouchableOpacity
            style={{
              backgroundColor: '#ef4444',
              borderRadius: scale(14),
              paddingVertical: verticalScale(14),
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: scale(8),
              marginTop: verticalScale(10),
              marginBottom: verticalScale(20),
            }}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={scale(20)} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: moderateFontScale(14) }}>
              Logout from Account
            </Text>
          </TouchableOpacity>

          <View style={{ height: verticalScale(80) }} />
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

                <View style={[styles.popupDetailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Payment Mode</Text>
                  <Text style={[styles.popupVal, { color: colors.amber, fontWeight: '800' }]} numberOfLines={1}>
                    {(incomingRequest as any).paymentMode || 'Cash'}
                  </Text>
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

      {/* Ride Accepted Celebration Modal Pop-up */}
      <Modal visible={acceptedModalVisible} transparent={true} animationType="slide">
        {acceptedTripDetails && (
          <View style={styles.popupOverlay}>
            <View style={[styles.popupContentCard, { backgroundColor: isDark ? '#1C1C22' : '#FFFFFF', width: '90%', alignItems: 'center', padding: scale(22), borderWidth: 1.5, borderColor: '#10B981' }]}>
              {/* Checkmark Badge */}
              <View style={{ width: scale(64), height: scale(64), borderRadius: scale(32), backgroundColor: 'rgba(16, 185, 129, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(14) }}>
                <MaterialIcons name="check-circle" size={scale(40)} color="#10B981" />
              </View>

              <Text style={{ color: '#10B981', fontSize: moderateFontScale(18), fontWeight: '900', marginBottom: verticalScale(4), textAlign: 'center' }}>
                {appLang === 'kn' ? '✅ ಪ್ರವಾಸ ಸ್ವೀಕರಿಸಲಾಗಿದೆ!' : '✅ Ride Accepted!'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), textAlign: 'center', marginBottom: verticalScale(16) }}>
                Booking request from {acceptedTripDetails.touristName} accepted successfully.
              </Text>

              {/* Trip Summary Card */}
              <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F5F5F7', borderRadius: scale(14), padding: scale(14), borderWidth: 1, borderColor: colors.border, marginBottom: verticalScale(18) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(6) }}>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), fontWeight: '600' }}>ESTIMATED FARE</Text>
                  <Text style={{ color: colors.amber, fontSize: moderateFontScale(16), fontWeight: '900' }}>
                    ₹{acceptedTripDetails.estimatedFare}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: verticalScale(6) }} />

                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10), marginTop: verticalScale(2) }}>PICKUP LOCATION</Text>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700', marginTop: verticalScale(2) }} numberOfLines={1}>
                  {acceptedTripDetails.pickup}
                </Text>

                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10), marginTop: verticalScale(8) }}>DESTINATION</Text>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700', marginTop: verticalScale(2) }} numberOfLines={1}>
                  {acceptedTripDetails.drop}
                </Text>
              </View>

              <TouchableOpacity
                style={{ width: '100%', height: verticalScale(46), borderRadius: scale(14), backgroundColor: '#F5C518', alignItems: 'center', justifyContent: 'center' }}
                onPress={() => {
                  setAcceptedModalVisible(false);
                  setAcceptedTripDetails(null);
                  setActiveTab('active_trip');
                }}
              >
                <Text style={{ color: '#101010', fontWeight: '900', fontSize: moderateFontScale(13) }}>
                  Start Pickup Navigation 🚀
                </Text>
              </TouchableOpacity>
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

      {/* 1. Confirm End Trip Modal */}
      <Modal visible={confirmEndModalVisible} transparent={true} animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={[styles.popupContentCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', width: '88%', alignItems: 'center', padding: scale(22) }]}>
            <View style={{ width: scale(56), height: scale(56), borderRadius: scale(28), backgroundColor: 'rgba(245, 197, 24, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(12) }}>
              <MaterialIcons name="flag" size={scale(30)} color="#F5C518" />
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(16), fontWeight: '800', marginBottom: verticalScale(6), textAlign: 'center' }}>
              {appLang === 'kn' ? 'ಟ್ರಿಪ್ ಪೂರ್ಣಗೊಳಿಸಿ?' : 'Complete This Trip?'}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), textAlign: 'center', lineHeight: moderateFontScale(18), marginBottom: verticalScale(18) }}>
              {appLang === 'kn' ? 'ಈ ಟ್ರಿಪ್ ಪೂರ್ಣಗೊಳಿಸಲು ಮತ್ತು ಪಾವತಿಯನ್ನು ಚಾಲಕ ವಾಲೆಟ್‌ಗೆ ಸೇರಿಸಲು ನೀವು ಬಯಸುತ್ತೀರಾ?' : 'Are you sure you want to end this trip and collect payment from passenger?'}
            </Text>

            <View style={{ flexDirection: 'row', gap: scale(10), width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, height: verticalScale(42), borderRadius: scale(12), borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setConfirmEndModalVisible(false)}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: moderateFontScale(12) }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, height: verticalScale(42), borderRadius: scale(12), backgroundColor: '#F5C518', alignItems: 'center', justifyContent: 'center' }}
                onPress={executeCompleteTrip}
              >
                <Text style={{ color: '#101010', fontWeight: '900', fontSize: moderateFontScale(12) }}>Confirm End</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Celebration "Trip Completed!" Success Summary Modal */}
      <Modal visible={completedModalVisible} transparent={true} animationType="slide">
        <View style={styles.popupOverlay}>
          <View style={[styles.popupContentCard, { backgroundColor: isDark ? '#1C1C22' : '#FFFFFF', width: '90%', alignItems: 'center', padding: scale(22), borderWidth: 1.5, borderColor: '#F5C518' }]}>
            {/* Celebration Badge */}
            <View style={{ width: scale(64), height: scale(64), borderRadius: scale(32), backgroundColor: '#F5C518', alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(14), elevation: 6 }}>
              <MaterialIcons name="check-circle" size={scale(38)} color="#101010" />
            </View>

            <Text style={{ color: '#F5C518', fontSize: moderateFontScale(18), fontWeight: '900', marginBottom: verticalScale(4), textAlign: 'center' }}>
              🎉 Trip Completed!
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), textAlign: 'center', marginBottom: verticalScale(16) }}>
              Payment collected & added to your Driver Wallet
            </Text>

            {/* Trip Details Card */}
            {lastCompletedTrip && (
              <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F5F5F7', borderRadius: scale(14), padding: scale(14), borderWidth: 1, borderColor: colors.border, marginBottom: verticalScale(18) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(10) }}>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11), fontWeight: '600' }}>TOTAL FARE EARNED</Text>
                  <Text style={{ color: '#F5C518', fontSize: moderateFontScale(18), fontWeight: '900' }}>
                    ₹{lastCompletedTrip.fare}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: verticalScale(6) }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: verticalScale(4) }}>
                  <MaterialIcons name="navigation" size={scale(16)} color="#F5C518" />
                  <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(12), fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {lastCompletedTrip.title}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: verticalScale(8) }}>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>Distance Covered:</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(11), fontWeight: '700' }}>
                    {lastCompletedTrip.dist} km
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: verticalScale(4) }}>
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>Payout Status:</Text>
                  <Text style={{ color: '#10B981', fontSize: moderateFontScale(11), fontWeight: '800' }}>
                    Settled to Wallet ✅
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={{ width: '100%', height: verticalScale(46), borderRadius: scale(14), backgroundColor: '#F5C518', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => {
                setCompletedModalVisible(false);
                setLastCompletedTrip(null);
                setActiveTab('duty');
              }}
            >
              <Text style={{ color: '#101010', fontWeight: '900', fontSize: moderateFontScale(13) }}>
                Done & Return to Duty
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(4),
  },
  toggleLabel: {
    fontSize: moderateFontScale(13.5),
    fontWeight: '700',
  },
  toggleSubLabel: {
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(2),
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
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
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
  detailedWalletBtn: {
    borderWidth: 1.2,
    borderRadius: scale(10),
    paddingVertical: verticalScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  detailedWalletBtnText: {
    fontSize: moderateFontScale(11.5),
    fontWeight: '800',
  },
  statusBadgeCompact: {
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(4),
  },
});
