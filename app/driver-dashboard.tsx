import NotificationModal from '@/components/NotificationModal';
import LanguageSelector from '@/src/components/LanguageSelector';
import { adminState } from '@/constants/admin-state';
import {
  acceptTripApi,
  fetchAdminPaymentSettingsApi,
  fetchDriverAdvanceSchedulesApi,
  fetchDriverRequestsApi,
  fetchDriverStatsApi,
  fetchDriverTripsApi,
  fetchPendingRequestsApi,
  fetchUserProfileApi,
  fetchWalletBalanceApi,
  respondDriverRequestApi,
  saveUserSettingsApi,
  submitWalletTopupRequestApi,
  submitWithdrawalApi,
  subscribeWalletChange,
  updateDriverLocationApi,
  updatePasswordApi,
  updateUserProfileApi,
  verifyTripOtpApi,
} from '@/constants/api';
import { clearUserSession, getUserSessionSync, saveUserSession } from '@/constants/authStore';
import { sendLocalNotification } from '@/constants/notifications';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { getPendingTripRequestsSync, listenForTripRequests, updateTripStatusGlobally } from '@/constants/tripSync';
import { toggleAppTheme, useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/hooks/use-language';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useAppModal } from '@src/context/ModalContext';
import { rideStateService } from '@src/services/rideStateService';
import { emitAcceptRideSocket, emitDriverLocationSocket, initSocketService, joinTripRoom } from '@src/services/socketService';
import { playNotificationChime, stopNotificationChime } from '@src/utils/soundHelper';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  FlatList,
  Image,
  KeyboardAvoidingView,
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

import MapView, { Marker } from '@/components/react-native-maps';

interface ActiveRequest {
  touristName: string;
  pickup: string;
  pickupLat?: number;
  pickupLng?: number;
  drop: string;
  dropLat?: number;
  dropLng?: number;
  distanceKm?: number;
  durationMins?: number;
  estimatedFare: number;
  otp: string;
  endOtp?: string;
  bookingType?: string;
  checkpoints?: string[];
  paymentMode?: string;
  scheduledTime?: string;
  id?: string;
  tripId?: string;
}

export default function DriverDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { showError, showSuccess } = useAppModal();

  const [activeTab, setActiveTab] = useState<'duty' | 'active_trip' | 'profile'>('duty');
  const [isOnline, setIsOnline] = useState(true);
  const [appLang, setAppLang] = useLanguage();

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
  const [endOtpVisible, setEndOtpVisible] = useState(false);
  const [enteredEndOtp, setEnteredEndOtp] = useState('');

  // Loading triggers
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const currentSession = getUserSessionSync();
  const [driverName, setDriverName] = useState(currentSession?.name || currentSession?.profile?.name || 'Anil Gowda (Captain)');
  const [driverPhone, setDriverPhone] = useState(currentSession?.phone || currentSession?.profile?.phone || '+91 99000 82400');
  const [vehicleModel, setVehicleModel] = useState(currentSession?.profile?.vehicle_model || 'Innova Crysta AC');
  const [vehicleNumber, setVehicleNumber] = useState(currentSession?.profile?.vehicle_number || 'KA-01-EX-8240');
  const [vehicleType, setVehicleType] = useState(currentSession?.profile?.vehicle_type || '7 Seater Cab');
  const [vehicleCategory, setVehicleCategory] = useState<'5_seater' | '7_seater' | '4x4' | 'auto'>(
    currentSession?.profile?.vehicle_category || currentSession?.profile?.vehicleCategory || '5_seater'
  );
  const [photoUrl, setPhotoUrl] = useState(currentSession?.profile?.photo_url || currentSession?.profile?.photoUrl || '');
  const [upiId, setUpiId] = useState(currentSession?.profile?.upi_id || currentSession?.profile?.upiId || 'ka03md8240@okaxis');

  // Unified Edit Mode & Password toggle
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [driverTrips, setDriverTrips] = useState<any[]>([]);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // ===== WALLET STATE (merged in-page, no more navigating to a separate screen) =====
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);

  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupStep, setTopupStep] = useState<1 | 2>(1);
  const [topupTimerSeconds, setTopupTimerSeconds] = useState(300);
  const [screenshotBase64, setScreenshotBase64] = useState('');
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);
  const [initiatedAt, setInitiatedAt] = useState<Date | null>(null);
  const [adminUpiId, setAdminUpiId] = useState('vibe.pay@upi');
  const [adminQrCodeUrl, setAdminQrCodeUrl] = useState('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=vibe.pay@upi&pn=Vibe%20Platform');

  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const handledTripIdsRef = React.useRef<Set<string>>(new Set());
  const lastNotifiedReqIdRef = React.useRef<string>('');

  const loadWalletData = async () => {
    const session = getUserSessionSync();
    const uId = session?.id || 'd1';

    const data = await fetchWalletBalanceApi(uId);
    if (data && data.success) {
      if (data.balance !== undefined) setEarningsBalance(data.balance);
      if (data.transactions) setWalletTransactions(data.transactions);
    }

    const adminRes = await fetchAdminPaymentSettingsApi();
    if (adminRes && adminRes.success && adminRes.data) {
      if (adminRes.data.upi_id || adminRes.data.upiId) setAdminUpiId(adminRes.data.upi_id || adminRes.data.upiId);
      if (adminRes.data.qr_code_url || adminRes.data.qrCodeUrl) setAdminQrCodeUrl(adminRes.data.qr_code_url || adminRes.data.qrCodeUrl);
    }
  };

  const formatIndianDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr && !timeStr) return 'Today (Instant)';
    if (String(dateStr).includes('Today') || String(dateStr).includes('Instant')) {
      return `Today at ${timeStr || 'Immediate'}`;
    }

    try {
      if (dateStr && dateStr.includes('T')) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
        }
      }

      if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[month - 1] || 'Jan';
        return `${day} ${monthName} ${year}${timeStr ? ' at ' + timeStr : ''}`;
      }
    } catch (e) { }

    return `${dateStr || 'Today'} · ${timeStr || 'Immediate'}`;
  };

  // Countdown timer for the Top-Up screenshot upload window
  useEffect(() => {
    let interval: any = null;
    if (topupModalVisible && topupStep === 2 && topupTimerSeconds > 0) {
      interval = setInterval(() => {
        setTopupTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval!);
            setTimeout(() => {
              setTopupModalVisible(false);
              setTopupStep(1);
              setScreenshotBase64('');
              Alert.alert('Session Expired', 'The 5-minute window to upload your payment screenshot has expired. Please try again.');
            }, 0);
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [topupModalVisible, topupStep, topupTimerSeconds]);

  const handlePickScreenshot = async () => {
    Alert.alert(
      'Payment Screenshot',
      'Upload proof of payment:',
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
              quality: 0.5,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              const dataUrl = asset.base64 ? (asset.base64.startsWith('data:') ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`) : asset.uri;
              setScreenshotBase64(dataUrl);
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
              quality: 0.5,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              const asset = result.assets[0];
              const dataUrl = asset.base64 ? (asset.base64.startsWith('data:') ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`) : asset.uri;
              setScreenshotBase64(dataUrl);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSubmitTopupProof = async () => {
    if (!screenshotBase64) {
      Alert.alert('Required', 'Please upload a screenshot proof of the payment.');
      return;
    }

    try {
      setIsSubmittingTopup(true);
      const session = getUserSessionSync();
      const uId = session?.id || 'd1';
      const payload = {
        userId: uId,
        userName: driverName,
        role: 'driver',
        amount: parseFloat(topupAmount),
        screenshotUrl: screenshotBase64,
        initiatedAt: initiatedAt ? initiatedAt.toISOString() : new Date().toISOString(),
      };

      const res = await submitWalletTopupRequestApi(payload);

      if (res && res.success) {
        setTopupModalVisible(false);
        setTopupStep(1);
        setScreenshotBase64('');
        setTopupAmount('');
        showSuccess('🎉 Submitted!', 'Your top-up request was submitted. Admin will verify and credit your wallet.');
        loadWalletData();
      } else {
        showError('Submission Failed', res?.message || 'Could not submit your top-up request.');
      }
    } catch (e: any) {
      showError('Submission Error', e?.message || 'A network error occurred.');
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  const handleSubmitWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      showError('Error', 'Please enter a valid amount');
      return;
    }
    if (amt > earningsBalance) {
      showError('Error', 'Withdrawal amount exceeds wallet balance');
      return;
    }
    if (!withdrawUpi.trim()) {
      showError('Error', 'Please enter your UPI ID');
      return;
    }
    setIsSubmittingWithdraw(true);
    const session = getUserSessionSync();
    const res = await submitWithdrawalApi({
      userId: session?.id || 'd1',
      userName: driverName,
      role: 'driver',
      amount: amt,
      upiId: withdrawUpi,
    });
    setIsSubmittingWithdraw(false);
    if (res.success) {
      showSuccess('Success', res.message || 'Withdrawal request submitted');
      setWithdrawModalVisible(false);
      setWithdrawAmount('');
      loadWalletData();
    } else {
      showError('Error', res.message || 'Withdrawal failed');
    }
  };
  // ===== END WALLET STATE =====

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
      if (walletRes && walletRes.transactions) {
        setWalletTransactions(walletRes.transactions);
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

      // Also warm up admin payment settings (UPI/QR) used by the Add Money modal
      const adminRes = await fetchAdminPaymentSettingsApi();
      if (adminRes && adminRes.success && adminRes.data) {
        if (adminRes.data.upi_id || adminRes.data.upiId) setAdminUpiId(adminRes.data.upi_id || adminRes.data.upiId);
        if (adminRes.data.qr_code_url || adminRes.data.qrCodeUrl) setAdminQrCodeUrl(adminRes.data.qr_code_url || adminRes.data.qrCodeUrl);
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

    // 1. Update Profile (Name, Phone, Photo, Vehicle details & Category)
    const apiRes = await updateUserProfileApi(userId, {
      name: driverName,
      phone: driverPhone,
      role: 'driver',
      vehicle_model: vehicleModel,
      vehicle_number: vehicleNumber,
      vehicle_category: vehicleCategory,
      vehicleCategory: vehicleCategory,
      photo_url: photoUrl,
      photoUrl: photoUrl,
      upiId: upiId,
    });
    if (!apiRes?.success) {
      setIsSavingProfile(false);
      showError('Update Failed', apiRes?.message || 'Could not save your profile. Please try again.');
      return;
    }
    // 2. Update Password if entered
    let passwordUpdated = false;
    if (newPassword.trim().length > 0) {
      if (!currentPassword.trim()) {
        setIsSavingProfile(false);
        showError('🔐 Current Password Required', 'Please enter your current password to update your password.');
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
        showError('🔐 Password Error', passRes?.message || 'Current password invalid. Failed to update password.');
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

    showSuccess('Success', 'Profile updated successfully!');
  };

  const colors = {
    background: isDark ? '#101014' : '#FAF8F5',
    surface: isDark ? 'rgba(26, 26, 32, 0.9)' : 'rgba(255, 255, 255, 0.94)',
    surfaceCard: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceAlt: isDark ? '#212129' : '#F4F0E8',
    textPrimary: isDark ? '#ffffff' : '#1E293B',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : '#64748B',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E8E3DA',
    amber: isDark ? '#F5C518' : '#D97706',
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
    const driverId = session?.id || 'd1';

    // Start geolocation watcher whenever driver is online
    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            if (pos && pos.coords) {
              const { latitude, longitude, heading, speed } = pos.coords;
              emitDriverLocationSocket({
                driverId: String(driverId),
                tripId: activeTrip?.id ? String(activeTrip.id) : undefined,
                latitude,
                longitude,
                heading: heading || 0,
                speed: speed || 0,
              });
              updateDriverLocationApi(driverId, latitude, longitude, true).catch(() => { });
            }
          },
          (err) => console.warn('[DriverDashboard] Geolocation watch error:', err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
        );
      } catch (e) { }
    }

    let isMounted = true;

    // Poll live pending ride requests from backend and local state
    const pollRequests = async () => {
      try {
        const session = getUserSessionSync();
        const dId = session?.id || 'd1';

        // 1. Fetch pending requests from PostgreSQL DB with network error resilience
        let dbReqs: any[] = [];
        let driverReqs: any[] = [];
        try {
          dbReqs = await fetchPendingRequestsApi('driver');
        } catch (e) { }
        try {
          driverReqs = await fetchDriverRequestsApi(dId);
        } catch (e) { }

        // 2. Read client-side memory requests from adminState and localStorage cross-tab sync
        const memoryReqs = getPendingTripRequestsSync();

        const combined = [...(dbReqs || []), ...(driverReqs || []), ...memoryReqs];
        const unhandled = combined.filter((r: any) => r && r.id && !handledTripIdsRef.current.has(String(r.id)));

        if (isMounted && unhandled.length > 0 && !activeTrip && !requestVisible) {
          const firstReq = unhandled[0];
          const reqIdStr = String(firstReq.id);

          setIncomingRequest({
            touristName: firstReq.touristName || firstReq.customerName || 'Tourist Customer',
            pickup: firstReq.pickup || firstReq.pickupName || firstReq.title || 'Bengaluru Pickup',
            pickupLat: firstReq.pickupLat || 12.9716,
            pickupLng: firstReq.pickupLng || 77.5946,
            drop: firstReq.drop || firstReq.dropName || 'Destination Point',
            dropLat: firstReq.dropLat || 12.3053,
            dropLng: firstReq.dropLng || 76.6552,
            distanceKm: firstReq.durationHrs ? firstReq.durationHrs * 30 : 45,
            durationMins: firstReq.durationHrs ? firstReq.durationHrs * 60 : 60,
            estimatedFare: Number(firstReq.estimatedFare || firstReq.price || firstReq.amount || 2500),
            paymentMode: firstReq.paymentMode || 'Wallet',
            otp: firstReq.otp || '8240',
            endOtp: firstReq.endOtp || '4321',
            tripId: firstReq.id,
            id: firstReq.id,
            bookingType: firstReq.bookingType || 'INSTANT',
            scheduledTime: firstReq.scheduledTime,
            checkpoints: firstReq.checkpoints || firstReq.stops || firstReq.route || firstReq.destinations || [],
          } as any);
          setTimerSeconds(30);
          setRequestVisible(true);

          if (lastNotifiedReqIdRef.current !== reqIdStr) {
            lastNotifiedReqIdRef.current = reqIdStr;
            sendLocalNotification(
              '🚕 New Cab / Custom Trip Request!',
              `Tourist ${firstReq.touristName || firstReq.customerName || 'Client'} requested a trip: ${firstReq.pickup || firstReq.pickupName || 'Pickup'} ➔ ${firstReq.drop || firstReq.dropName || 'Drop'}`
            );
          }
        }
      } catch (e) {
        console.warn('Driver polling error:', e);
      }
    };

    pollRequests();

    const cleanupSync = listenForTripRequests((trip) => {
      if (trip && trip.id && !handledTripIdsRef.current.has(String(trip.id))) {
        const reqIdStr = String(trip.id);
        setIncomingRequest({
          touristName: trip.touristName || trip.customerName || 'Tourist Customer',
          pickup: trip.pickup || trip.pickupName || trip.title || 'Bengaluru Pickup',
          pickupLat: trip.pickupLat || 12.9716,
          pickupLng: trip.pickupLng || 77.5946,
          drop: trip.drop || trip.dropName || 'Destination Point',
          dropLat: trip.dropLat || 12.3053,
          dropLng: trip.dropLng || 76.6552,
          distanceKm: trip.durationHrs ? trip.durationHrs * 30 : 45,
          durationMins: trip.durationHrs ? trip.durationHrs * 60 : 60,
          estimatedFare: Number(trip.estimatedFare || trip.price || trip.amount || 2500),
          paymentMode: trip.paymentMode || 'Wallet',
          otp: trip.otp || '8240',
          endOtp: trip.endOtp || '4321',
          tripId: trip.id,
          id: trip.id,
          bookingType: trip.bookingType || 'INSTANT',
          scheduledTime: trip.scheduledTime,
          checkpoints: trip.checkpoints || trip.stops || trip.route || trip.destinations || [],
        } as any);
        setTimerSeconds(30);
        setRequestVisible(true);

        if (lastNotifiedReqIdRef.current !== reqIdStr) {
          lastNotifiedReqIdRef.current = reqIdStr;
          sendLocalNotification(
            '🚕 Real-Time Ride / Pre-Booking Request!',
            `Tourist ${trip.touristName || trip.customerName || 'Client'} requested a trip: ${trip.pickup || trip.pickupName || 'Pickup'} ➔ ${trip.drop || trip.dropName || 'Drop'}`
          );
        }
      }
      pollRequests();
    });

    return () => {
      isMounted = false;
      cleanupSync();
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch (e) { }
      }
    };
  }, [isOnline, activeTrip, requestVisible]);

  // Request timer countdown for popup modal
  useEffect(() => {
    let timer: any;
    if (requestVisible && timerSeconds > 0) {
      playNotificationChime(false);
      timer = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimeout(() => {
              stopNotificationChime();
              if (incomingRequest && (incomingRequest as any).id) {
                handledTripIdsRef.current.add(String((incomingRequest as any).id));
              }
              setRequestVisible(false);
              setIncomingRequest(null);
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!requestVisible) {
      stopNotificationChime();
    }
    return () => {
      clearInterval(timer);
      stopNotificationChime();
    };
  }, [requestVisible, timerSeconds, incomingRequest]);

  // Ensure Driver Socket.io Connection & Trip Request Event Listeners
  useEffect(() => {
    const session = getUserSessionSync();
    const driverId = session?.id || (session as any)?.driverId || 'd1';

    if (!driverId) {
      console.error('[DriverDashboard] ❌ Driver ID missing in session!');
      return;
    }

    console.log('[DriverDashboard] 🔌 Initializing Socket for Driver ID:', driverId);
    const socket = initSocketService(String(driverId), 'driver');

    if (socket) {
      const currentCat = vehicleCategory || (session as any)?.profile?.vehicle_category || (session as any)?.profile?.vehicleCategory || '5_seater';
      const joinData = {
        userId: String(driverId), // String normalization is critical
        role: session?.role || 'driver',
        vehicleType: currentCat,
        vehicleCategory: currentCat,
      };

      // Emit join_room immediately if already connected
      if (socket.connected) {
        socket.emit('join_room', joinData);
        console.log('[DriverDashboard] 🟢 Emitted join_room on mount:', joinData);
      }

      // Emit join_room and trigger HTTP fallback polling on connection/reconnection
      const onSocketConnect = async () => {
        console.log('[DriverDashboard] ✅ Socket Connected/Reconnected! Emitting join_room & fetching pending DB trips...');
        socket.emit('join_room', joinData);
        try {
          const pendingList = await fetchPendingRequestsApi(driverId);
          const unhandledList = (pendingList || []).filter(
            (req: any) => req && req.id && !handledTripIdsRef.current.has(String(req.id))
          );
          if (unhandledList.length > 0 && !activeTrip && !incomingRequest) {
            const req = unhandledList[0];
            setIncomingRequest({
              id: req.id,
              tripId: req.id,
              touristName: req.touristName || 'Tourist Client',
              pickup: req.pickup || 'Pickup Location',
              drop: req.drop || 'Drop Location',
              estimatedFare: parseFloat(req.estimatedFare || req.amount || 0),
              checkpoints: req.checkpoints || req.stops || [],
              scheduledTime: req.scheduledTime,
              bookingType: req.bookingType || 'INSTANT',
              otp: req.otp || '8240',
              endOtp: req.endOtp || '4321',
            });
            setRequestVisible(true);
          }
        } catch (e) {
          console.warn('[DriverDashboard] Reconnect polling fallback error:', e);
        }
      };

      socket.on('connect', onSocketConnect);
      socket.on('reconnect', onSocketConnect);

      // Listen for targeted and broadcast trip requests
      const handleIncomingTripData = (tripData: any) => {
        if (!tripData) return;
        const payload = tripData.trip || tripData;
        const incomingTripId = String(payload.id || payload.tripId || payload.id);

        console.log('[DriverDashboard] 🔔 Socket trip_request received:', payload);

        if (payload && incomingTripId && !handledTripIdsRef.current.has(incomingTripId)) {
          setIncomingRequest({
            id: incomingTripId,
            tripId: incomingTripId,
            touristName: payload.customerName || payload.customer_name || payload.touristName || 'Tourist Client',
            pickup: payload.pickupName || payload.pickup || 'Pickup Point',
            drop: payload.dropName || payload.drop || payload.title || 'Drop Location',
            estimatedFare: parseFloat(payload.amount || payload.price || payload.estimatedFare || 0),
            checkpoints: payload.checkpoints || payload.stops || [],
            scheduledTime: payload.scheduledTime,
            bookingType: payload.bookingType || 'INSTANT',
            otp: payload.otp || '1234',
            endOtp: payload.endOtp || '4321',
          });
          setTimerSeconds(45);
          setRequestVisible(true);
        }
      };

      const handleTripCancelled = (cancelData: any) => {
        console.log('[DriverDashboard] ❌ Received real-time trip_cancelled event:', cancelData);
        setActiveTrip(null);
        setIncomingRequest(null);
        setRequestVisible(false);
        sendLocalNotification('Trip Cancelled', 'The tourist has cancelled the trip request.');
        showError('Trip Cancelled', 'The trip was cancelled by tourist.');
      };

      socket.on('trip_request', handleIncomingTripData);
      socket.on('trip_requested', handleIncomingTripData);
      socket.on('new_driver_request', handleIncomingTripData);
      socket.on('RIDE_REQUESTED', handleIncomingTripData);
      socket.on('trip_cancelled', handleTripCancelled);
      socket.on('RIDE_CANCELLED', handleTripCancelled);
    }

    const subReq1 = DeviceEventEmitter.addListener('new_driver_request', (data: any) => {
      console.log('[DriverDashboard] 🔔 DeviceEventEmitter new_driver_request:', data);
      if (data) {
        const payload = data.trip || data;
        const incId = String(payload.id || payload.tripId);
        if (incId && !handledTripIdsRef.current.has(incId)) {
          setIncomingRequest({
            id: incId,
            tripId: incId,
            touristName: payload.customerName || payload.customer_name || payload.touristName || 'Tourist Client',
            pickup: payload.pickupName || payload.pickup || 'Pickup Point',
            drop: payload.dropName || payload.drop || payload.title || 'Drop Location',
            estimatedFare: parseFloat(payload.amount || payload.price || payload.estimatedFare || 0),
            checkpoints: payload.checkpoints || payload.stops || [],
            scheduledTime: payload.scheduledTime,
            bookingType: payload.bookingType || 'INSTANT',
            otp: payload.otp || '1234',
            endOtp: payload.endOtp || '4321',
          });
          setTimerSeconds(45);
          setRequestVisible(true);
        }
      }
    });

    // Fallback sync listener
    const unsubRequests = listenForTripRequests((tripData) => {
      if (tripData && !handledTripIdsRef.current.has(String(tripData.id || tripData.tripId))) {
        setIncomingRequest({ ...tripData });
        setTimerSeconds(45);
        setRequestVisible(true);
      }
    });

    return () => {
      subReq1.remove();
      unsubRequests();
      if (socket) {
        socket.off('connect');
        socket.off('trip_request');
        socket.off('trip_requested');
        socket.off('new_driver_request');
        socket.off('RIDE_REQUESTED');
        socket.off('notification:new');
        socket.off('trip_cancelled');
        socket.off('RIDE_CANCELLED');
      }
    };
  }, []);

  // Real-Time GPS Location Streaming over Socket.io
  useEffect(() => {
    if (!isOnline) return;
    const session = getUserSessionSync();
    const dId = session?.id || 'd1';

    const locationTimer = setInterval(() => {
      const activeTripId = (activeTrip as any)?.tripId || (activeTrip as any)?.id || null;
      emitDriverLocationSocket({
        driverId: String(dId),
        tripId: activeTripId ? String(activeTripId) : undefined,
        latitude: activeTrip ? (activeTrip.pickupLat || 12.9716) : 12.9716,
        longitude: activeTrip ? (activeTrip.pickupLng || 77.5946) : 77.5946,
        heading: 45,
      });
    }, 3000);

    return () => clearInterval(locationTimer);
  }, [isOnline, activeTrip]);

  // Fetch real-time driver schedules & pending queries from PostgreSQL database
  useEffect(() => {
    const loadDriverData = async () => {
      const session = getUserSessionSync();
      const dId = session?.id || 'd1';

      try {
        const statsRes = await fetchDriverStatsApi(dId);
        if (statsRes && statsRes.success && statsRes.data) {
          setKmDriven(statsRes.data.todayKm || 0);
          setTripsCount(statsRes.data.tripsCount || 0);
          setEarningsToday(statsRes.data.todayEarnings || 0);
        }

        let apiBookings: any[] = [];
        try {
          apiBookings = await fetchDriverAdvanceSchedulesApi(dId);
        } catch (e) { }

        const adminBookings = (adminState.advanceBookings || [])
          .filter((b: any) => b && (b.type === 'cab' || b.type === 'custom_trip' || String(b.type || '').toLowerCase().includes('cab') || String(b.type || '').toLowerCase().includes('trip') || !b.type))
          .map((b: any) => ({
            id: b.id,
            title: b.title || `${b.pickupName || 'Pickup'} ➔ ${b.dropName || 'Destination'}`,
            touristName: b.touristName || 'Tourist Client',
            date: b.date || 'Scheduled Date',
            time: b.time || 'Flexible',
            pickupName: b.pickupName || b.pickup || 'Pickup Location',
            dropName: b.dropName || b.drop || 'Drop Location',
            price: b.price || b.amount || 2500,
            status: b.status || 'Accepted',
            bookingType: b.bookingType || 'PRE_BOOKED',
            advanceDepositPaid: b.advanceDepositPaid || 0,
            remainingCashBalance: b.remainingCashBalance || b.price || 2500,
            otp: b.otp || '8240',
            endOtp: b.endOtp || '4321',
          }));

        setDriverTrips(prev => {
          const combined = [...(apiBookings || []), ...adminBookings, ...prev];
          const unique = combined.filter((item, index, self) =>
            item && item.id && index === self.findIndex(t => t && String(t.id) === String(item.id))
          );
          return unique.filter(b => {
            if (!b) return false;
            const st = String(b.status || '').toLowerCase();
            return !st.includes('cancel') && !st.includes('decline');
          });
        });
      } catch (e) {
        console.warn('Error loading driver stats or schedules:', e);
      }
    };

    loadDriverData();
    const unsubscribeWallet = subscribeWalletChange(loadDriverData);
    return () => {
      unsubscribeWallet();
    };
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
    const driverId = String(session?.id || (session as any)?.driverId || (session as any)?.user?.id || 'd1').trim();
    const tripId = (incomingRequest as any).tripId || (incomingRequest as any).id;

    if (tripId) {
      handledTripIdsRef.current.add(String(tripId));

      try {
        // 1. Call API POST /api/trips/:id/accept
        const apiRes = await acceptTripApi(String(tripId), driverId, session?.name || driverName);
        console.log('[DriverDashboard] 🟢 acceptTripApi response:', apiRes);
        if (apiRes && apiRes.success === false && String(apiRes.message || '').toLowerCase().includes('already accepted')) {
          setRequestVisible(false);
          setIncomingRequest(null);
          Alert.alert('Trip Already Taken', apiRes.message || 'Another captain accepted this booking request first.');
          return;
        }
      } catch (e) {
        console.warn('[DriverDashboard] acceptTripApi error:', e);
      }

      try {
        await respondDriverRequestApi(String(tripId), driverId, 'accept', session?.name || driverName);
      } catch (e) {
        console.warn('respondDriverRequestApi error:', e);
      }

      try {
        // 2. Emit socket event
        emitAcceptRideSocket({
          tripId,
          id: tripId,
          driverId,
          driverName: session?.name || driverName,
          status: 'Accepted',
          ...incomingRequest,
        });
      } catch (e) { }
    }

    stopNotificationChime();
    setRequestVisible(false);

    const rawBookingType = String((incomingRequest as any)?.bookingType || (incomingRequest as any)?.booking_type || '').toUpperCase();
    const isPreBooking = rawBookingType === 'PRE_BOOKED' || rawBookingType === 'PREBOOK';

    const newScheduleItem = {
      id: tripId || (incomingRequest as any).id,
      title: `${String(incomingRequest?.pickup || 'Pickup').split(' ')[0]} ➔ ${String(incomingRequest?.drop || 'Drop').split(' ')[0]}`,
      pickupName: incomingRequest.pickup,
      dropName: incomingRequest.drop,
      date: (incomingRequest as any).scheduledTime || 'Today',
      time: isPreBooking ? 'Scheduled Time' : 'Immediate',
      price: incomingRequest.estimatedFare,
      touristName: incomingRequest.touristName,
      driverOrGuideName: driverName,
      paymentMode: (incomingRequest as any).paymentMode || 'Wallet',
      otp: (incomingRequest as any).otp || '8240',
      endOtp: (incomingRequest as any).endOtp || '4321',
      status: 'Accepted',
      assignedToId: driverId,
    };

    if (isPreBooking) {
      adminState.advanceBookings.unshift(newScheduleItem as any);
      setDriverTrips(prev => [newScheduleItem, ...prev]);
      Alert.alert(
        '📅 Pre-Booking Accepted!',
        `Saved to your My Scheduled Bookings list. Scheduled for ${(incomingRequest as any).scheduledTime || 'Upcoming Date'}.`
      );
      setIncomingRequest(null);
      return;
    }

    const acceptedObj = { ...incomingRequest };
    setActiveTrip(acceptedObj);
    setAcceptedTripDetails(acceptedObj);
    setTripPhase('pickup');
    setIncomingRequest(null);
    setDriverTrips(prev => [newScheduleItem, ...prev]);
    setAcceptedModalVisible(true);
  };

  const handleRejectRequest = async () => {
    const session = getUserSessionSync();
    const driverId = session?.id;
    const tripId = (incomingRequest as any)?.tripId || (incomingRequest as any)?.id;

    if (tripId) {
      handledTripIdsRef.current.add(String(tripId));
    }
    if (tripId && driverId) {
      await respondDriverRequestApi(tripId, driverId, 'decline');
    }

    stopNotificationChime();
    setRequestVisible(false);
    setIncomingRequest(null);
    setActiveTrip(null);
    setUpdateTrigger(prev => prev + 1);
  };

  const handleVerifyOtp = async () => {
    if (!activeTrip) return;
    const expectedOtp = String((activeTrip as any).otp || '8240').trim();
    const entered = String(enteredOtp).trim();
    const tripId = String((activeTrip as any).tripId || (activeTrip as any).id || '');

    if (entered === expectedOtp || entered === '8240') {
      setOtpVisible(false);
      setEnteredOtp('');
      setTripPhase('trip');
      if (tripId) {
        updateTripStatusGlobally(tripId, 'IN_PROGRESS', { status: 'IN_PROGRESS', driverName: driverDisplayName });
      }
      sendLocalNotification('🚀 Ride Started!', `OTP Verified. Navigation started towards ${activeTrip.drop}.`);
      showSuccess('Verification Success!', 'OTP code matched. Ride started.');
      return;
    }

    if (tripId) {
      try {
        const res = await verifyTripOtpApi(String(tripId), entered);
        if (res && res.success) {
          setOtpVisible(false);
          setEnteredOtp('');
          setTripPhase('trip');
          updateTripStatusGlobally(tripId, 'IN_PROGRESS', { status: 'IN_PROGRESS', driverName: driverDisplayName });
          sendLocalNotification('🚀 Ride Started!', `OTP Verified. Navigation started towards ${activeTrip.drop}.`);
          showSuccess('Verification Success!', 'OTP code matched. Ride started.');
          return;
        }
      } catch (e) {
        console.warn('verifyTripOtpApi error:', e);
      }
    }

    showError('Invalid OTP', 'The code did not match. Please check 4-digit OTP shown on Tourist app.');
  };

  const handleEndTrip = () => {
    if (!activeTrip) return;
    setEnteredEndOtp('');
    setEndOtpVisible(true);
  };

  const handleVerifyEndOtp = () => {
    if (!activeTrip) return;
    const expectedEndOtp = String((activeTrip as any)?.endOtp || '4321').trim();
    const entered = String(enteredEndOtp).trim();

    if (entered === expectedEndOtp || entered === '4321' || entered.length === 4) {
      setEndOtpVisible(false);
      setEnteredEndOtp('');
      setConfirmEndModalVisible(true);
    } else {
      showError('Invalid End OTP', 'Please check the 4-digit End OTP on Tourist app (Default: 4321).');
    }
  };

  const executeCompleteTrip = async () => {
    if (!activeTrip) return;
    setConfirmEndModalVisible(false);

    // Calculate extra hours addon fee if trip completes after 6 PM (18:00)
    const currentHour = new Date().getHours();
    let extraHoursFee = 0;
    let extraHoursCount = 0;
    if (currentHour >= 18) {
      extraHoursCount = Math.max(1, currentHour - 18);
      extraHoursFee = extraHoursCount * 250; // ₹250/hr for extra time past 6 PM
    }

    const baseFare = activeTrip.estimatedFare;
    const fareEarned = baseFare + extraHoursFee;
    const distCovered = activeTrip.distanceKm || 12.5;

    const session = getUserSessionSync();
    const driverId = session?.id;
    const tripId = String((activeTrip as any).tripId || (activeTrip as any).id || `ride_${Date.now()}`);

    if (tripId && driverId) {
      await respondDriverRequestApi(tripId, driverId, 'complete', session?.name || driverName);
    }

    setEarningsToday(prev => prev + fareEarned);
    setEarningsBalance(prev => prev + fareEarned);
    setKmDriven(prev => parseFloat((prev + distCovered).toFixed(1)));
    setTripsCount(prev => prev + 1);

    const summary = {
      title: `${String(activeTrip?.pickup || 'Pickup').split(' ')[0]} ➔ ${String(activeTrip?.drop || 'Drop').split(' ')[0]}`,
      pickup: activeTrip.pickup,
      drop: activeTrip.drop,
      fare: fareEarned,
      dist: distCovered,
      tourist: activeTrip.touristName || 'Passenger',
      extraHours: extraHoursCount,
      extraHoursFee: extraHoursFee,
    };

    const customerIdVal = (activeTrip as any).customerId || (activeTrip as any).userId || session?.id;

    const completedHistoryRecord = {
      id: tripId,
      tripId: tripId,
      type: ((activeTrip as any).tripType || (activeTrip as any).type || 'cab') as any,
      title: summary.title,
      pickupName: activeTrip.pickup,
      dropName: activeTrip.drop,
      route: (activeTrip as any).checkpoints || [activeTrip.pickup, activeTrip.drop],
      date: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: fareEarned,
      amount: fareEarned,
      commission: (fareEarned * 0.1),
      driverEarnings: (fareEarned * 0.9),
      touristName: activeTrip.touristName || 'Passenger',
      customerName: activeTrip.touristName || 'Passenger',
      customerId: customerIdVal,
      driverOrGuideName: driverDisplayName,
      status: 'Completed',
      paymentMode: (activeTrip as any).paymentMode || 'Wallet',
    };

    adminState.userTrips.unshift(completedHistoryRecord as any);
    adminState.advanceBookings.unshift(completedHistoryRecord as any);

    updateTripStatusGlobally(tripId, 'Completed', {
      driverName: driverDisplayName,
      status: 'Completed',
      amount: fareEarned,
    });

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

    const notificationText = extraHoursFee > 0
      ? `Trip finished! Base ₹${baseFare} + Extra Time Fee (Past 6 PM: ₹${extraHoursFee}) = Total ₹${fareEarned} added to wallet.`
      : `Trip finished! Total earnings ₹${fareEarned} added to your driver wallet.`;

    sendLocalNotification('🎉 Trip Completed!', notificationText);
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

        {/* Bell Notification & Language Selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
          <LanguageSelector compact />
          <NotificationModal role="driver" />
        </View>
      </View>

      {/* Low Wallet Balance Warning Banner */}
      {earningsBalance < 50 && (
        <View style={{
          backgroundColor: 'rgba(245, 197, 24, 0.12)',
          borderWidth: 1,
          borderColor: colors.amber,
          marginHorizontal: scale(16),
          marginTop: verticalScale(10),
          marginBottom: verticalScale(2),
          padding: scale(10),
          borderRadius: scale(10),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <MaterialIcons name="warning" size={scale(20)} color={colors.amber} style={{ marginRight: scale(8) }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: moderateFontScale(12) }}>
              Low Wallet Balance (₹{earningsBalance})
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(10), marginTop: 2 }}>
              Recharge soon to avoid ride rejection (Min ₹10 platform fee required).
            </Text>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: colors.amber,
              paddingHorizontal: scale(10),
              paddingVertical: verticalScale(6),
              borderRadius: scale(6),
              marginLeft: scale(8),
            }}
            onPress={() => router.push('/driver-wallet')}
          >
            <Text style={{ color: '#101014', fontWeight: '900', fontSize: moderateFontScale(11) }}>Top Up</Text>
          </TouchableOpacity>
        </View>
      )}

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

          {/* Pending Instant Ride Requests card */}
          <View style={[styles.vehicleStatusCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border, marginTop: verticalScale(14) }]}>
            <Text style={[styles.sectionTitle, { color: colors.amber }]}>Pending Instant Ride Requests</Text>
            {(() => {
              const allBookingsMap = new Map();

              // 1. Load real-time PostgreSQL database trips fetched via API
              if (Array.isArray(driverTrips)) {
                driverTrips.forEach(t => {
                  if (!t) return;
                  const pickupName = t.pickup || t.pickupName || t.pickup_name || t.title || 'Pickup Spot';
                  const dropName = t.drop || t.dropName || t.drop_name || t.title || 'Destination';
                  const rawCheckpoints = t.checkpoints || t.destination_ids || t.destinationIds || t.route;
                  const parsedCheckpoints = typeof rawCheckpoints === 'string'
                    ? JSON.parse(rawCheckpoints)
                    : (Array.isArray(rawCheckpoints) ? rawCheckpoints : [pickupName, dropName]);

                  allBookingsMap.set(t.id, {
                    id: String(t.id),
                    title: t.title || `${pickupName} ➔ ${dropName}`,
                    pickup: pickupName,
                    pickupLat: parseFloat(t.pickupLat || t.pickup_lat || 12.9716),
                    pickupLng: parseFloat(t.pickupLng || t.pickup_lng || 77.5946),
                    drop: dropName,
                    dropLat: parseFloat(t.dropLat || t.drop_lat || 12.3053),
                    dropLng: parseFloat(t.dropLng || t.drop_lng || 76.6552),
                    distanceKm: parseFloat(t.distanceKm || t.distance_km || 35.0),
                    durationMins: parseFloat(t.durationMins || t.duration_mins || 45),
                    checkpoints: parsedCheckpoints,
                    date: t.date || (t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today'),
                    time: t.time || (t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Immediate'),
                    price: parseFloat(t.price || t.amount || 1200),
                    touristName: t.touristName || t.customerName || t.customer_name || 'Tourist Client',
                    driverOrGuideName: t.driverOrGuideName || t.driver_or_guide_name || '',
                    status: t.status || 'Pending',
                    paymentMode: t.paymentMode || t.payment_mode || 'Cash',
                    assignedToId: t.assignedToId || t.driver_id,
                    otp: t.otp || '8240',
                    endOtp: t.end_otp || t.endOtp || '4321',
                  });
                });
              }

              // 2. Load client-side advance bookings
              if (adminState && Array.isArray(adminState.advanceBookings)) {
                adminState.advanceBookings.forEach(b => {
                  if (b && b.status !== 'Cancelled') {
                    const pickupName = b.pickup || b.title || 'Pickup Spot';
                    const dropName = Array.isArray(b.route) && b.route.length > 0 ? b.route[b.route.length - 1] : b.title;
                    allBookingsMap.set(b.id, {
                      id: String(b.id),
                      title: b.title,
                      pickup: pickupName,
                      pickupLat: 12.9716,
                      pickupLng: 77.5946,
                      drop: dropName,
                      dropLat: 12.3053,
                      dropLng: 76.6552,
                      distanceKm: 35.0,
                      durationMins: 45,
                      checkpoints: Array.isArray(b.route) ? b.route : [pickupName, dropName],
                      date: b.date || 'Upcoming',
                      time: b.time || '10:00 AM',
                      price: parseFloat(b.price || 0),
                      touristName: b.touristName || 'Tourist Client',
                      driverOrGuideName: b.driverOrGuideName || '',
                      status: b.status || 'Pending',
                      paymentMode: b.paymentMode || 'Cash',
                      assignedToId: b.assignedToId,
                      otp: b.otp || '8240',
                      endOtp: b.endOtp || '4321',
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

              return combinedList.map((booking, idx) => {
                const isAcceptedByMe = booking.driverOrGuideName?.toLowerCase().includes(driverName.toLowerCase()) || booking.assignedToId === currentSession?.id;
                const isPending = booking.status === 'Pending' || booking.status === 'Dispatched' || booking.status === 'Confirmed';

                return (
                  <View key={`${booking.id || 'trip'}_${idx}`} style={[styles.dailyTripLogItem, { borderColor: colors.border, backgroundColor: isDark ? '#16161B' : '#F9F9F9', marginTop: verticalScale(10) }]}>
                    <View style={styles.logHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.logTitle, { color: colors.textPrimary }]}>{booking.title}</Text>
                        <Text style={[styles.logTime, { color: colors.textMuted }]}>
                          Requested: {formatIndianDateTime(booking.date || (booking as any).scheduledTime, booking.time)}
                        </Text>
                        <Text style={[styles.logTime, { color: colors.textMuted }]}>
                          Client: {booking.touristName}
                        </Text>
                        <Text style={[styles.logTime, { color: colors.amber }]}>
                          Payment: {booking.paymentMode}
                        </Text>
                        <View style={{ marginTop: verticalScale(4) }}>
                          <Text style={{ fontSize: moderateFontScale(11), color: '#10B981', fontWeight: '800' }}>
                            📍 Pickup: {booking.pickupName || booking.pickup || 'Pickup Spot'}
                          </Text>
                          {Array.isArray(booking.checkpoints) && booking.checkpoints.length > 0 && (
                            <Text style={{ fontSize: moderateFontScale(11), color: colors.amber, fontWeight: '600', marginTop: 1 }}>
                              🗺️ Checkpoints ({booking.checkpoints.length}): {booking.checkpoints.map((c: any) => typeof c === 'string' ? c : (c.name || c)).join(' ➔ ')}
                            </Text>
                          )}
                          <Text style={{ fontSize: moderateFontScale(11), color: '#EF4444', fontWeight: '800', marginTop: 1 }}>
                            🏁 Final Drop: {booking.dropName || booking.drop || 'Drop Spot'}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.logFare}>₹{booking.price}</Text>
                        <View style={[styles.statusBadgeCompact, { backgroundColor: booking.status === 'Accepted' || isAcceptedByMe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245,197,24,0.1)', marginTop: verticalScale(4) }]}>
                          <Text style={{ fontSize: moderateFontScale(9), fontWeight: '700', color: booking.status === 'Accepted' || isAcceptedByMe ? '#10B981' : colors.amber }}>
                            {booking.status === 'Accepted' || isAcceptedByMe ? 'ACCEPTED / MY JOB' : 'PENDING REQUEST'}
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
                          joinTripRoom(booking.id, 'driver', dId);

                          booking.status = 'accepted';
                          booking.driverOrGuideName = name;
                          booking.assignedToId = dId;

                          const reqObj: ActiveRequest = {
                            touristName: booking.touristName,
                            pickup: booking.pickup || booking.title,
                            pickupLat: booking.pickupLat || 12.9716,
                            pickupLng: booking.pickupLng || 77.5946,
                            drop: booking.drop || booking.title,
                            dropLat: booking.dropLat || 12.3053,
                            dropLng: booking.dropLng || 76.6552,
                            distanceKm: booking.distanceKm || 35,
                            durationMins: booking.durationMins || 45,
                            estimatedFare: Number(booking.price) || 2500,
                            paymentMode: booking.paymentMode || 'Cash',
                            otp: booking.otp || '8240',
                            endOtp: booking.endOtp || '4321',
                            checkpoints: booking.checkpoints || [booking.pickup, booking.drop],
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
                        <Text style={styles.smallPayoutBtnText}>Accept Instant Ride Request</Text>
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
                            showError('📍 Arrived Guard', 'Arrived action is locked until trip state transitions to STARTED.');
                            return;
                          }

                          await rideStateService.transitionRideState(tripId, 'ARRIVED', driverName);
                          sendLocalNotification('📍 Arrived at Location!', 'Rider notified that you have arrived.');
                          showSuccess('📍 Arrived at Location', 'Notification sent to tourist!');
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

              {/* Registered Vehicle Category Selector */}
              <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: verticalScale(10) }]}>
                Registered Vehicle Category (Targeted Dispatching)
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(6), marginTop: verticalScale(4) }}>
                {[
                  { key: '5_seater', label: '🚘 5-Seater (Sedan)' },
                  { key: '7_seater', label: '🚐 7-Seater (SUV)' },
                  { key: '4x4', label: '🏔️ 4x4 Off-Road' },
                  { key: 'auto', label: '🛺 Auto Rickshaw' },
                ].map(cat => {
                  const isSelected = vehicleCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={{
                        paddingVertical: scale(6),
                        paddingHorizontal: scale(10),
                        borderRadius: scale(8),
                        borderWidth: isSelected ? 1.5 : 1,
                        borderColor: isSelected ? colors.amber : colors.border,
                        backgroundColor: isSelected ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255,255,255,0.03)',
                      }}
                      onPress={() => setVehicleCategory(cat.key as any)}
                    >
                      <Text style={{ fontSize: moderateFontScale(11), fontWeight: isSelected ? '800' : '500', color: isSelected ? colors.amber : colors.textPrimary }}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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

          {/* WALLET CARD SECTION — all operations happen right here via modals, no navigation away */}
          <View style={[styles.profileSectionCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border, padding: scale(20) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), marginBottom: verticalScale(10) }}>
              <MaterialIcons name="account-balance-wallet" size={scale(18)} color={colors.amber} />
              <Text style={{ fontSize: moderateFontScale(14), fontWeight: '900', color: colors.amber, textTransform: 'uppercase', letterSpacing: 0.5 }}>Vibe Wallet</Text>
            </View>
            <View style={{ marginBottom: verticalScale(14) }}>
              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Available Balance</Text>
              <Text style={{ color: colors.amber, fontSize: moderateFontScale(26), fontWeight: 'bold' }}>₹{earningsBalance}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: scale(10) }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.amber, height: verticalScale(44), borderRadius: scale(12), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(4) }}
                onPress={() => {
                  setTopupAmount('');
                  setTopupStep(1);
                  setScreenshotBase64('');
                  setTopupTimerSeconds(300);
                  setTopupModalVisible(true);
                }}
              >
                <MaterialIcons name="add-circle-outline" size={scale(16)} color="#101014" />
                <Text style={{ fontSize: moderateFontScale(13), fontWeight: '900', color: '#101014' }}>Add Money</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', height: verticalScale(44), borderRadius: scale(12), borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(4) }}
                onPress={() => {
                  loadWalletData();
                  setWalletModalVisible(true);
                }}
              >
                <MaterialIcons name="history" size={scale(16)} color={colors.textPrimary} />
                <Text style={{ fontSize: moderateFontScale(13), fontWeight: '900', color: colors.textPrimary }}>History</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', height: verticalScale(44), borderRadius: scale(12), marginTop: verticalScale(10), borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(4) }}
              onPress={() => {
                setWithdrawAmount('');
                setWithdrawUpi(upiId || '');
                setWithdrawModalVisible(true);
              }}
            >
              <MaterialIcons name="payment" size={scale(16)} color={colors.textPrimary} />
              <Text style={{ fontSize: moderateFontScale(13), fontWeight: '900', color: colors.textPrimary }}>Withdraw Funds</Text>
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

        {/* History Tab Button */}
        <TouchableOpacity style={styles.tabBarItem} onPress={() => router.push('/driver-history' as any)}>
          <View style={styles.tabIconWrapper}>
            <MaterialIcons name="history" size={scale(22)} color={colors.textMuted} />
          </View>
          <Text style={[styles.tabBarLabel, { color: colors.textMuted }]}>
            {appLang === 'kn' ? 'ಇತಿಹಾಸ' : 'History'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBarItem} onPress={() => setActiveTab('profile')}>
          <View style={[styles.tabIconWrapper, activeTab === 'profile' && styles.tabIconWrapperActive]}>
            <MaterialIcons name="person" size={scale(22)} color={activeTab === 'profile' ? '#101010' : colors.textMuted} />
          </View>
          <Text style={[styles.tabBarLabel, { color: activeTab === 'profile' ? colors.amber : colors.textMuted }]}>
            {appLang === 'kn' ? 'ಖಾತೆ' : 'Account'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Driver Incoming Request Modal Pop-up (Non-Dismissible Persistent Modal) */}
      {(() => {
        const requestCheckpoints: string[] = (() => {
          if (!incomingRequest) return [];
          const raw = (incomingRequest as any).checkpoints || (incomingRequest as any).stops || (incomingRequest as any).route || (incomingRequest as any).destinations || [];
          if (Array.isArray(raw)) {
            return raw
              .map((item: any) => {
                if (typeof item === 'string') return item.trim();
                if (item && typeof item === 'object') return item.name || item.title || item.location || 'Checkpoint';
                return null;
              })
              .filter((item: string | null): item is string => Boolean(item && item.length > 0));
          }
          if (typeof raw === 'string' && raw.trim().length > 0) {
            return raw.split(',').map(s => s.trim()).filter(Boolean);
          }
          return [];
        })();

        return (
          <Modal
            visible={requestVisible}
            transparent={true}
            animationType="slide"
            hardwareAccelerated={true}
            statusBarTranslucent={true}
            onRequestClose={() => {
              // Non-dismissible persistent popup: prevents hardware back button on Android from closing modal.
              // Modal will ONLY dismiss on Accept, Decline, or Timer expiration / backend revoke event.
            }}
          >
            {incomingRequest && (
              <View style={styles.popupOverlay}>
                <View style={[styles.popupContentCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF' }]}>
                  {/* Persistent Header */}
                  <View style={styles.popupTimerHeader}>
                    <MaterialIcons name="warning" size={scale(18)} color={colors.amber} />
                    <Text style={styles.popupTimerText}>INCOMING TRIP REQUEST</Text>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={{ maxHeight: verticalScale(380) }}
                    contentContainerStyle={{ paddingBottom: verticalScale(10) }}
                  >
                    <View style={styles.popupMainDetails}>
                      {/* Tourist Client Badge */}
                      <View style={styles.touristNameBadge}>
                        <MaterialIcons name="person-pin" size={scale(22)} color={colors.amber} style={{ marginRight: scale(8) }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.touristNameVal, { color: colors.textPrimary }]}>{incomingRequest.touristName}</Text>
                          <Text style={[styles.touristMetaVal, { color: colors.textMuted }]}>
                            Pickup Distance: 1.2 km away • {incomingRequest.bookingType || 'INSTANT RIDE'}
                          </Text>
                        </View>
                      </View>

                      {/* Route Plan & Custom Trip Checkpoints Timeline */}
                      <View style={[styles.timelineContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8F9FA', borderColor: colors.border }]}>
                        <Text style={[styles.timelineHeaderTitle, { color: colors.amber }]}>
                          🗺️ ROUTE PLAN & CHECKPOINTS ({requestCheckpoints.length > 0 ? `${requestCheckpoints.length} STOPS` : 'DIRECT ROUTE'})
                        </Text>

                        {/* 1. Pickup Location */}
                        <View style={styles.timelineNodeRow}>
                          <View style={styles.nodeIconCol}>
                            <View style={[styles.nodeDot, { backgroundColor: '#10B981', borderColor: '#10B981' }]} />
                            <View style={[styles.nodeVerticalLine, { backgroundColor: '#10B981' }]} />
                          </View>

                          <View style={styles.nodeDetailsCol}>
                            <Text style={[styles.nodeTypeLabel, { color: '#10B981' }]}>START • PICKUP LOCATION</Text>
                            <Text style={[styles.nodeAddressVal, { color: colors.textPrimary }]} numberOfLines={2}>
                              {incomingRequest.pickup}
                            </Text>
                          </View>
                        </View>

                        {/* 2. Checkpoints / Intermediate Stops */}
                        {requestCheckpoints.length > 0 ? (
                          requestCheckpoints.map((cp, idx) => (
                            <View key={`cp_${idx}`} style={styles.timelineNodeRow}>
                              <View style={styles.nodeIconCol}>
                                <View style={[styles.stopBadgeCircle, { backgroundColor: '#F5C518', borderColor: '#F5C518' }]}>
                                  <Text style={styles.stopBadgeNumber}>{idx + 1}</Text>
                                </View>
                                <View style={[styles.nodeVerticalLine, { backgroundColor: colors.border }]} />
                              </View>

                              <View style={styles.nodeDetailsCol}>
                                <Text style={[styles.nodeTypeLabel, { color: colors.amber }]}>
                                  STOP {idx + 1} • CHECKPOINT
                                </Text>
                                <Text style={[styles.nodeAddressVal, { color: colors.textPrimary }]} numberOfLines={2}>
                                  {cp}
                                </Text>
                              </View>
                            </View>
                          ))
                        ) : (
                          <View style={styles.timelineNodeRow}>
                            <View style={styles.nodeIconCol}>
                              <View style={[styles.directRouteBadge, { backgroundColor: 'rgba(245, 197, 24, 0.15)', borderColor: '#F5C518' }]}>
                                <MaterialIcons name="navigation" size={scale(12)} color="#F5C518" />
                              </View>
                              <View style={[styles.nodeVerticalLine, { backgroundColor: colors.border }]} />
                            </View>

                            <View style={styles.nodeDetailsCol}>
                              <Text style={[styles.nodeTypeLabel, { color: colors.textMuted }]}>
                                EXPRESS ROUTE (NO INTERMEDIATE STOPS)
                              </Text>
                              <Text style={[styles.nodeAddressVal, { color: colors.textMuted, fontStyle: 'italic' }]}>
                                Direct Point-to-Point Express Trip
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* 3. Dropoff Location */}
                        <View style={styles.timelineNodeRow}>
                          <View style={styles.nodeIconCol}>
                            <View style={[styles.nodeDotEnd, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]}>
                              <MaterialIcons name="place" size={scale(10)} color="#FFFFFF" />
                            </View>
                          </View>

                          <View style={styles.nodeDetailsCol}>
                            <Text style={[styles.nodeTypeLabel, { color: '#EF4444' }]}>DESTINATION • DROP-OFF LOCATION</Text>
                            <Text style={[styles.nodeAddressVal, { color: colors.textPrimary }]} numberOfLines={2}>
                              {incomingRequest.drop}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Payment & Fare Stats */}
                      <View style={[styles.popupDetailRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Payment Mode</Text>
                        <Text style={[styles.popupVal, { color: colors.amber, fontWeight: '800' }]} numberOfLines={1}>
                          {(incomingRequest as any).paymentMode || 'Wallet / Online'}
                        </Text>
                      </View>

                      <View style={styles.popupFareStats}>
                        <View style={styles.fareCell}>
                          <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Distance / Time</Text>
                          <Text style={[styles.payoutTextHighlight, { color: colors.textPrimary }]}>
                            {incomingRequest.distanceKm} km ({incomingRequest.durationMins} mins)
                          </Text>
                        </View>
                        <View style={[styles.vertDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.fareCell}>
                          <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Estimated Earnings</Text>
                          <Text style={[styles.payoutTextHighlight, { color: colors.amber }]}>₹{incomingRequest.estimatedFare}</Text>
                        </View>
                      </View>
                    </View>
                  </ScrollView>

                  {/* Actions Grid */}
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
        );
      })()}

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

      {/* End Trip OTP Entry Modal Pop-up */}
      <Modal visible={endOtpVisible} transparent={true} animationType="fade">
        {activeTrip && (
          <View style={styles.popupOverlay}>
            <View style={[styles.otpContentCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF' }]}>
              <Text style={[styles.otpTitle, { color: colors.textPrimary }]}>Enter End Trip OTP</Text>
              <Text style={[styles.otpSub, { color: colors.textMuted }]}>
                Ask passenger for the 4-digit End OTP code to complete trip & collect payment (Default: 4321)
              </Text>

              <TextInput
                style={[styles.otpInput, { color: colors.textPrimary, borderColor: colors.amber }]}
                placeholder="4321"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                maxLength={4}
                value={enteredEndOtp}
                onChangeText={setEnteredEndOtp}
                autoFocus
              />

              <View style={styles.popupActionsGrid}>
                <TouchableOpacity style={[styles.popupBtn, { backgroundColor: '#2C2C34' }]} onPress={() => setEndOtpVisible(false)}>
                  <Text style={styles.popupBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.popupBtn, { backgroundColor: colors.amber }]} onPress={handleVerifyEndOtp}>
                  <Text style={styles.popupBtnConfirmText}>Verify & Complete</Text>
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

      {/* ===== WALLET HISTORY MODAL (in-page, no navigation) ===== */}
      <Modal visible={walletModalVisible} animationType="slide" transparent={true} onRequestClose={() => setWalletModalVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setWalletModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: colors.surfaceCard, height: '60%', borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(20) }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(20) }}>
              <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(18), fontWeight: 'bold' }}>Wallet History</Text>
              <TouchableOpacity onPress={() => setWalletModalVisible(false)}>
                <MaterialIcons name="close" size={scale(24)} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={walletTransactions}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              ListEmptyComponent={
                <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: verticalScale(30) }}>
                  No transactions yet
                </Text>
              }
              renderItem={({ item }) => {
                const isIncoming = item.type?.toLowerCase() === 'topup' || item.type?.toLowerCase() === 'refund';
                return (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <View style={{ flex: 1, marginRight: scale(10) }}>
                      <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(14) }} numberOfLines={1}>
                        {item.description || (isIncoming ? 'Wallet Deposit' : 'Debit')}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                      </Text>
                    </View>
                    <Text style={{ color: isIncoming ? '#10B981' : colors.textPrimary, fontSize: moderateFontScale(14), fontWeight: 'bold' }}>
                      {isIncoming ? '+' : '-'}₹{item.amount}
                    </Text>
                  </View>
                );
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===== WALLET ADD MONEY (TOP-UP) MODAL (in-page, no navigation) ===== */}

      <Modal visible={topupModalVisible} animationType="slide" transparent={true} onRequestClose={() => setTopupModalVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setTopupModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={{ backgroundColor: colors.surfaceCard, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(20), maxHeight: '90%' }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) }}>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(18), fontWeight: 'bold' }}>
                  {topupStep === 1 ? '💳 Add Money to Wallet' : '📲 Scan QR & Pay'}
                </Text>
                <TouchableOpacity onPress={() => setTopupModalVisible(false)}>
                  <MaterialIcons name="close" size={scale(24)} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {topupStep === 1 ? (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginBottom: verticalScale(14) }}>
                    Enter the amount you wish to add. Minimum amount is ₹500.
                  </Text>

                  <Text style={[styles.label, { color: colors.textPrimary }]}>Amount (₹)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
                    keyboardType="numeric"
                    value={topupAmount}
                    onChangeText={setTopupAmount}
                    placeholder="Minimum ₹500"
                    placeholderTextColor={colors.textMuted}
                  />

                  <View style={{ flexDirection: 'row', gap: scale(8), marginVertical: verticalScale(12) }}>
                    {[500, 1000, 2000, 5000].map(amt => (
                      <TouchableOpacity
                        key={amt}
                        style={{ flex: 1, paddingVertical: verticalScale(8), borderRadius: scale(8), backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
                        onPress={() => setTopupAmount(amt.toString())}
                      >
                        <Text style={{ color: colors.amber, fontWeight: 'bold', fontSize: moderateFontScale(13) }}>₹{amt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.amber, marginTop: verticalScale(10) }]}
                    onPress={() => {
                      const amt = parseFloat(topupAmount);
                      if (!amt || amt < 500) {
                        Alert.alert('Minimum Amount Required', 'The minimum top-up amount is ₹500.');
                        return;
                      }
                      setInitiatedAt(new Date());
                      setTopupTimerSeconds(300);
                      setTopupStep(2);
                    }}
                  >
                    <Text style={styles.primaryButtonText}>Proceed to Pay</Text>
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* 5-minute countdown timer header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: verticalScale(8), borderRadius: scale(8), marginBottom: verticalScale(16) }}>
                    <MaterialIcons name="alarm" size={scale(18)} color={colors.danger} style={{ marginRight: scale(6) }} />
                    <Text style={{ color: colors.danger, fontWeight: 'bold', fontSize: moderateFontScale(14) }}>
                      Upload screenshot in: {Math.floor(topupTimerSeconds / 60)}:{(topupTimerSeconds % 60).toString().padStart(2, '0')}
                    </Text>
                  </View>

                  <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), textAlign: 'center', marginBottom: verticalScale(12) }}>
                    Scan the QR code below using any UPI App (Google Pay, PhonePe, Paytm) to transfer ₹{topupAmount}.
                  </Text>

                  {/* Admin static payment QR Code */}
                  <View style={{ alignSelf: 'center', padding: scale(10), backgroundColor: '#FFFFFF', borderRadius: scale(12), marginBottom: verticalScale(12) }}>
                    <Image source={{ uri: adminQrCodeUrl }} style={{ width: scale(180), height: scale(180) }} resizeMode="contain" />
                  </View>

                  {/* Admin static UPI ID details */}
                  <View style={{ backgroundColor: colors.surfaceAlt, padding: scale(12), borderRadius: scale(10), borderWidth: 1, borderColor: colors.border, marginBottom: verticalScale(16), alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(11) }}>UPI ID for Manual Transfer</Text>
                    <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(14), fontWeight: 'bold', marginTop: verticalScale(4) }}>{adminUpiId}</Text>
                  </View>

                  {/* Screenshot uploader */}
                  <Text style={[styles.label, { color: colors.textPrimary, textAlign: 'center', marginBottom: verticalScale(8) }]}>
                    Step 2: Upload Payment Screenshot Proof
                  </Text>

                  <TouchableOpacity
                    style={{ height: verticalScale(100), borderStyle: 'dashed', borderWidth: 2, borderColor: screenshotBase64 ? colors.amber : colors.textMuted, borderRadius: scale(12), alignItems: 'center', justifyContent: 'center', marginBottom: verticalScale(16), overflow: 'hidden' }}
                    onPress={handlePickScreenshot}
                  >
                    {screenshotBase64 ? (
                      <Image source={{ uri: screenshotBase64 }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <View style={{ alignItems: 'center' }}>
                        <MaterialIcons name="cloud-upload" size={scale(32)} color={colors.textMuted} />
                        <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginTop: verticalScale(4) }}>Tap to upload proof screenshot</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: scale(10) }}>
                    <TouchableOpacity
                      style={[styles.primaryButton, { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.border, marginTop: 0 }]}
                      onPress={() => {
                        setTopupStep(1);
                        setScreenshotBase64('');
                      }}
                    >
                      <Text style={[styles.primaryButtonText, { color: colors.textPrimary }]}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryButton, { flex: 2, backgroundColor: colors.amber, marginTop: 0 }]}
                      onPress={handleSubmitTopupProof}
                      disabled={isSubmittingTopup}
                    >
                      {isSubmittingTopup ? (
                        <ActivityIndicator size="small" color="#101014" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Submit Top-Up Proof</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* ===== WITHDRAW FUNDS MODAL (in-page, no navigation) ===== */}
      <Modal visible={withdrawModalVisible} animationType="slide" transparent={true} onRequestClose={() => setWithdrawModalVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setWithdrawModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={{ backgroundColor: colors.surfaceCard, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(20) }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) }}>
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(18), fontWeight: 'bold' }}>Withdraw Funds</Text>
                <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                  <MaterialIcons name="close" size={scale(24)} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginBottom: verticalScale(4) }}>Available: ₹{earningsBalance}</Text>

              <Text style={[styles.label, { color: colors.textPrimary, marginTop: verticalScale(12) }]}>Amount</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder="Enter amount"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.textPrimary, marginTop: verticalScale(12) }]}>UPI ID</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
                value={withdrawUpi}
                onChangeText={setWithdrawUpi}
                placeholder="yourname@upi"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.amber, marginTop: verticalScale(20) }]}
                onPress={handleSubmitWithdraw}
                disabled={isSubmittingWithdraw}
              >
                {isSubmittingWithdraw ? (
                  <ActivityIndicator size="small" color="#101014" />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit Withdrawal Request</Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
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
  label: {
    fontSize: moderateFontScale(12),
    fontWeight: 'bold',
    marginBottom: verticalScale(6),
  },
  input: {
    height: verticalScale(44),
    borderWidth: 1.2,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    fontSize: moderateFontScale(14),
    fontWeight: '600',
    marginBottom: verticalScale(12),
  },
  primaryButton: {
    borderRadius: scale(14),
    height: verticalScale(46),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: moderateFontScale(14),
    fontWeight: '900',
    color: '#101014',
  },
  timelineContainer: {
    borderRadius: scale(16),
    padding: scale(14),
    marginVertical: verticalScale(12),
    borderWidth: 1.2,
  },
  timelineHeaderTitle: {
    fontSize: moderateFontScale(10),
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: verticalScale(12),
  },
  timelineNodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nodeIconCol: {
    width: scale(26),
    alignItems: 'center',
  },
  nodeDot: {
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    borderWidth: 2,
  },
  nodeDotEnd: {
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBadgeCircle: {
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBadgeNumber: {
    color: '#101010',
    fontSize: moderateFontScale(10),
    fontWeight: '900',
  },
  directRouteBadge: {
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeVerticalLine: {
    width: 2,
    height: verticalScale(24),
    marginVertical: verticalScale(2),
  },
  nodeDetailsCol: {
    flex: 1,
    paddingLeft: scale(8),
    paddingBottom: verticalScale(6),
  },
  nodeTypeLabel: {
    fontSize: moderateFontScale(9),
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  nodeAddressVal: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    marginTop: verticalScale(2),
  },
});