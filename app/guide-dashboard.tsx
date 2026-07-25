import NotificationModal from '@/components/NotificationModal';
import { acceptTripApi, fetchPendingRequestsApi, fetchUserProfileApi, saveUserSettingsApi, submitWithdrawalApi, updatePasswordApi, updateUserProfileApi } from '@/constants/api';
import { clearUserSession, getUserSessionSync, saveUserSession } from '@/constants/authStore';
import { sendLocalNotification } from '@/constants/notifications';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
  const [appTheme, setAppTheme] = useState<'dark' | 'light'>(colorScheme === 'light' ? 'light' : 'dark');
  const isDark = appTheme === 'dark';

  const [activeTab, setActiveTab] = useState<'duty' | 'active_tour' | 'profile'>('duty');
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const [appLang, setAppLang] = useState<'en' | 'kn'>('en');

  // Daily statistics
  const [hoursOnline] = useState(5.4);
  const [tripsCount, setTripsCount] = useState(3);
  const [earningsToday, setEarningsToday] = useState(3250);
  const [earningsBalance, setEarningsBalance] = useState(1750);

  // Profile & Unified Edit state
  const currentSession = getUserSessionSync();
  const [guideName, setGuideName] = useState(currentSession?.name || currentSession?.profile?.name || 'Ramesh Gowda');
  const [guidePhone, setGuidePhone] = useState(currentSession?.phone || currentSession?.profile?.phone || '+91 98800 12345');
  const [photoUrl, setPhotoUrl] = useState(currentSession?.profile?.photo_url || currentSession?.profile?.photoUrl || '');
  const [upiId, setUpiId] = useState(currentSession?.profile?.upi_id || currentSession?.profile?.upiId || 'ramesh.guide@okaxis');

  // Unified Edit Mode & Password toggle
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    async function loadGuideBackendData() {
      const session = getUserSessionSync();
      const guideId = session?.id || 'g1';

      const userRes = await fetchUserProfileApi(guideId);
      if (userRes && userRes.success && userRes.user) {
        const u = userRes.user;
        const p = u.profile || {};
        if (u.name) setGuideName(u.name);
        if (u.phone) setGuidePhone(u.phone);
        if (p.photo_url || p.photoUrl) setPhotoUrl(p.photo_url || p.photoUrl);
        if (p.upi_id || p.upiId) setUpiId(p.upi_id || p.upiId);
      }
    }
    loadGuideBackendData();
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
    const userId = session?.id || session?.profile?.user_id || 'g1';

    setIsSavingProfile(true);

    // 1. Update Profile
    const apiRes = await updateUserProfileApi(userId, {
      name: guideName,
      phone: guidePhone,
      photo_url: photoUrl,
      photoUrl: photoUrl,
      upiId: upiId,
      role: 'guide',
    });

    if (!apiRes?.success) {
      setIsSavingProfile(false);
      Alert.alert('Update Failed', apiRes?.message || 'Could not save your profile. Please try again.');
      return;
    }

    // 2. Update Password if entered
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

      if (!passRes || !passRes.success) {
        setIsSavingProfile(false);
        Alert.alert('🔐 Password Error', passRes?.message || 'Current password invalid. Failed to update password.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
    }

    setIsSavingProfile(false);

    const updatedSession = {
      ...(session || { id: userId, role: 'guide', status: 'Active' }),
      id: apiRes?.user?.id || session?.id || userId,
      name: guideName,
      phone: guidePhone,
      profile: {
        ...(session?.profile || {}),
        ...(apiRes?.user?.profile || {}),
        name: guideName,
        phone: guidePhone,
        photo_url: photoUrl,
        photoUrl: photoUrl,
        upiId: upiId,
      }
    };
    await saveUserSession(updatedSession as any);
    setIsEditMode(false);

    Alert.alert('Profile updated successfully!');
  };

  // Guide-specific work settings
  const [spokenLangs, setSpokenLangs] = useState({ en: true, hi: true, kn: true, te: false });
  const [expertise, setExpertise] = useState({ history: true, food: false, shopping: true, adventure: false });

  // Toolkit QR / Alert settings
  const [qrVisible, setQrVisible] = useState(false);
  const [alertVolume, setAlertVolume] = useState(80); // %
  const [selectedRingtone, setSelectedRingtone] = useState<'classic' | 'loud' | 'pulse'>('loud');

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
      duty: 'Duty Status',
      activeTour: 'Active Tour',
      profile: 'Account & Settings',
      todayStats: 'Today Stats',
      wallet: 'Guide Wallet & Bank Settlement',
      payout: 'Instant Settlement payout',
      workSettings: 'Guide Work Suitability Settings',
      toolkit: 'Audio Guide & Toolkit Controls',
      tickets: 'Digital Entry Tickets & Passes',
      emergency: 'Emergency Contact Sync',
      pref: 'Notification & Tone Preferences',
      ringtone: 'Trip Alert Ringtone',
      vol: 'Alert ringtone volume',
    },
    kn: {
      duty: 'ಡ್ಯೂಟಿ ಸ್ಥಿತಿ',
      activeTour: 'ಸಕ್ರಿಯ ಪ್ರವಾಸ',
      profile: 'ಖಾತೆ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್ಸ್',
      todayStats: 'ಇಂದಿನ ಅಂಕಿಅಂಶಗಳು',
      wallet: 'ಗೈಡ್ ವಾಲೆಟ್ ಮತ್ತು ಬ್ಯಾಂಕ್ ವರ್ಗಾವಣೆ',
      payout: 'ತಕ್ಷಣದ ಬ್ಯಾಂಕ್ ವರ್ಗಾವಣೆ',
      workSettings: 'ಗೈಡ್ ಕೆಲಸದ ಸೆಟ್ಟಿಂಗ್ಸ್',
      toolkit: 'ಟೂಲ್ಕಿಟ್ ಮತ್ತು ಪ್ರವೇಶ ಟಿಕೆಟ್',
      tickets: 'ಡಿಜಿಟಲ್ ಪ್ರವೇಶ ಟಿಕೆಟ್ / ಪಾಸ್',
      emergency: 'ತುರ್ತು ಸಹಾಯವಾಣಿ ಸಂಪರ್ಕ',
      pref: 'ರಿಂಗ್ಟೋನ್ ಮತ್ತು ವಾಲ್ಯೂಮ್ ಆದ್ಯತೆಗಳು',
      ringtone: 'ಅಲರ್ಟ್ ಟೋನ್ ಆಯ್ಕೆ',
      vol: 'ಅಲರ್ಟ್ ಟೋನ್ ವಾಲ್ಯೂಮ್',
    }
  }[appLang];

  // Online Live Pending Requests Polling
  useEffect(() => {
    if (!isOnline || activeTour) return;
    const pollGuideRequests = async () => {
      const pendingList = await fetchPendingRequestsApi('guide');
      if (pendingList && pendingList.length > 0 && !activeTour && !incomingRequest) {
        const req = pendingList[0];
        const guideReq: ActiveRequest = {
          touristName: req.touristName || 'Tourist Client',
          pickup: req.pickup || 'Heritage City Pickup',
          pickupLat: req.pickupLat || 12.9982,
          pickupLng: req.pickupLng || 77.5920,
          spots: [
            { name: req.drop || 'Guided Sightseeing Spot', lat: req.dropLat || 12.9982, lng: req.dropLng || 77.5920 },
            { name: 'Heritage Palace Landmark', lat: 12.9912, lng: 77.5890 },
          ],
          durationHrs: req.durationHrs || 4,
          estimatedFare: req.estimatedFare || 1800,
          language: 'English & Kannada',
          groupSize: 2,
          otp: req.otp || '8240',
        };
        (guideReq as any).tripId = req.id;
        setIncomingRequest(guideReq);
        setTimerSeconds(30);
        setRequestVisible(true);

        sendLocalNotification(
          '🚩 New Guide Tour Request!',
          `Tourist ${req.touristName || 'Client'} requested a guided tour: ${req.pickup} (Fare: ₹${req.estimatedFare || 1800})`
        );
      }
    };

    pollGuideRequests();
    const interval = setInterval(pollGuideRequests, 3000);
    return () => clearInterval(interval);
  }, [isOnline, activeTour, incomingRequest]);

  // Request countdown timer
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

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;
    const session = getUserSessionSync();
    const guideId = session?.id || 'g1';
    const tripId = (incomingRequest as any).tripId;

    if (tripId) {
      await acceptTripApi(tripId, guideId, guideName);
    }

    setRequestVisible(false);
    setActiveTour(incomingRequest);
    setTourPhase('pickup');
    setCurrentSpotIndex(0);
    setIncomingRequest(null);
    setActiveTab('active_tour');

    sendLocalNotification(
      '🚩 Tour Accepted!',
      `You accepted the guide booking for ${incomingRequest.touristName}. Proceed to pickup spot.`
    );
  };

  const handleRejectRequest = () => {
    setRequestVisible(false);
    setIncomingRequest(null);
  };

  const handleVerifyOtp = () => {
    if (!activeTour) return;
    if (enteredOtp === activeTour.otp) {
      setOtpVisible(false);
      setEnteredOtp('');
      setTourPhase('tour');
      setCurrentSpotIndex(0);
      Alert.alert('Verification Success!', 'OTP code matched. Sightseeing tour started.');
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
      'Are you sure you want to end this tour?',
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
                title: activeTour.pickup.split(' ')[0] + ' Heritage Tour',
                time: 'Just Now',
                fare: fareEarned,
                payout: 'Paid to Wallet',
                rating: 5
              },
              ...dailyTours
            ]);
            setActiveTour(null);
            setTourPhase('pickup');
            setActiveTab('profile');
            Alert.alert('Tour Complete!', `₹${fareEarned} added to your balance.`);
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Guide Logout',
      'Are you sure you want to log out of Guide Dashboard?',
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

  const handleInstantPayout = async () => {
    if (earningsBalance <= 0) {
      Alert.alert('No Balance', 'Your bank payout balance is empty.');
      return;
    }
    const session = getUserSessionSync();
    setPayoutLoading(true);

    const res = await submitWithdrawalApi({
      userId: session?.id || 'g1',
      userName: session?.name || 'Ramesh Gowda',
      role: 'guide',
      amount: earningsBalance,
      upiId: upiId || 'guide@upi',
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
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#101014' : '#F5F5F7' }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header bar */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
          <View style={styles.partnerBadgeIcon}>
            <MaterialIcons name="verified-user" size={scale(20)} color={colors.amber} />
          </View>
          <View>
            <Text style={[styles.headerLogo, { color: colors.amber }]}>VIBZZ PARTNER</Text>
            <Text style={[styles.headerGuideName, { color: colors.textPrimary }]}>{guideName}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
          <View style={styles.onlineHeaderPill}>
            <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#10B981' : '#EF4444' }]} />
            <Text style={[styles.onlinePillText, { color: isOnline ? '#10B981' : '#EF4444' }]}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
          <NotificationModal role="guide" />
        </View>
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

          {/* Live Heatmap Area */}
          <View style={styles.mapSectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.amber }]}>Live Tourist Demand Heatmap</Text>
            <View style={[styles.mapContainerBox, { borderColor: colors.border }]}>
              {Platform.OS === 'web' || !MapView ? (
                <View style={styles.webMapVisual}>
                  <View style={styles.gridCanvasOverlay} />
                  <View style={styles.demandLabelBox}>
                    <Text style={styles.demandTitle}>HIGH DEMAND AREA</Text>
                    <Text style={styles.demandDetail}>1. Bengaluru Palace (4 requests/hr)</Text>
                    <Text style={styles.demandDetail}>2. Majestic Metro (6 requests/hr)</Text>
                  </View>
                  <View style={[styles.heatmapCircleVisual, { backgroundColor: 'rgba(245,197,24,0.3)', width: scale(80), height: scale(80), borderRadius: scale(40) }]} />
                </View>
              ) : (
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
                  <Circle
                    center={{ latitude: 12.9982, longitude: 77.5920 }}
                    radius={300}
                    strokeColor="rgba(245,197,24,0.5)"
                    fillColor="rgba(245,197,24,0.25)"
                  />
                  <Marker
                    coordinate={{ latitude: 12.9982, longitude: 77.5920 }}
                    title="Bengaluru Palace Area"
                  />
                </MapView>
              )}
            </View>
          </View>

          {/* Upcoming Advance Bookings card */}
          <View style={[styles.profileSectionCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border, marginTop: verticalScale(14) }]}>
            <Text style={[styles.profileSectionTitle, { color: colors.amber }]}>Upcoming Advance Booking Schedules</Text>
            {adminState.advanceBookings
              .filter(b => b.type === 'guide' && b.status !== 'Cancelled')
              .map(booking => {
                const isAcceptedByMe = booking.assignedToId === 'g1';
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
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.logFare}>₹{booking.price}</Text>
                        <View style={[styles.statusBadgeCompact, { backgroundColor: booking.status === 'Accepted' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245,197,24,0.1)', marginTop: verticalScale(4) }]}>
                          <Text style={{ fontSize: moderateFontScale(9), fontWeight: '700', color: booking.status === 'Accepted' ? '#10B981' : colors.amber }}>
                            {booking.status === 'Accepted' ? (isAcceptedByMe ? 'My Job' : 'Accepted') : 'Available'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {booking.status === 'Pending' && (
                      <TouchableOpacity
                        style={[styles.smallPayoutBtn, { backgroundColor: colors.amber, marginTop: verticalScale(10), alignItems: 'center' }]}
                        onPress={() => {
                          booking.status = 'Accepted';
                          booking.assignedToId = 'g1';
                          booking.driverOrGuideName = 'Anil Gowda';
                          Alert.alert('Booking Claimed!', `You have accepted the guided tour reservation: ${booking.title} on ${booking.date}.`);
                          setUpdateTrigger(prev => prev + 1);
                        }}
                      >
                        <Text style={styles.smallPayoutBtnText}>Accept Advance Schedule</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
          </View>
        </ScrollView>
      )}

      {activeTab === 'active_tour' && (
        <View style={styles.activeTourTabPanel}>
          {activeTour ? (
            <View style={{ flex: 1 }}>
              <View style={[styles.activeTourMapFrame, { borderBottomColor: colors.border }]}>
                {Platform.OS === 'web' || !MapView ? (
                  <View style={styles.webMapVisual}>
                    <View style={styles.gridCanvasOverlay} />
                    <View style={styles.hudNavBox}>
                      <Text style={styles.hudNavTitle}>GUIDE NAVIGATION ACTIVE</Text>
                      <Text style={styles.hudNavText}>Phase: {tourPhase.toUpperCase()}</Text>
                      {tourPhase === 'pickup' ? (
                        <Text style={styles.hudNavText}>Pickup Target: {activeTour.pickup}</Text>
                      ) : (
                        <Text style={styles.hudNavText}>Spot {currentSpotIndex + 1}: {activeTour.spots[currentSpotIndex].name}</Text>
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
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }}
                  >
                    <Marker
                      coordinate={{ latitude: activeTour.pickupLat, longitude: activeTour.pickupLng }}
                      title="Tourist Pickup Location"
                      pinColor={colors.amber}
                    />
                  </MapView>
                )}
              </View>

              <View style={[styles.navDrawerBlock, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF' }]}>
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
                  <View style={styles.phasePanelBlock}>
                    <Text style={[styles.phaseTitleText, { color: colors.textPrimary }]}>Phase 1: Pickup Tourist</Text>
                    <View style={styles.phaseAddressCard}>
                      <MaterialIcons name="pin-drop" size={scale(16)} color={colors.amber} style={{ marginRight: scale(6) }} />
                      <Text style={[styles.phaseAddressVal, { color: colors.textPrimary }]} numberOfLines={1}>{activeTour.pickup}</Text>
                    </View>

                    <View style={styles.actionBtnGrid}>
                      <TouchableOpacity style={[styles.navActionBtn, { backgroundColor: '#2C2C34' }]} onPress={() => Alert.alert('Arrived', 'Tourist has been notified.')}>
                        <Text style={styles.navActionTextCancel}>Arrived</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.navActionBtn, { backgroundColor: colors.amber }]} onPress={() => setOtpVisible(true)}>
                        <Text style={styles.navActionTextConfirm}>Start Tour (OTP)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
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
                          <Text style={styles.navActionTextCancel}>Next Spot</Text>
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

      {activeTab === 'profile' && (
        <ScrollView contentContainerStyle={styles.tabScrollContent} showsVerticalScrollIndicator={false}>

          {/* Captain / Guide Main Summary Card */}
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
                    {guideName ? guideName[0].toUpperCase() : 'G'}
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
              {guideName}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginTop: 2 }}>
              {guidePhone}
            </Text>

            {/* Badges */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), justifyContent: 'center', marginTop: verticalScale(12) }}>
              <View style={{ backgroundColor: 'rgba(245, 197, 24, 0.12)', paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: scale(8), borderWidth: 1, borderColor: colors.amber, flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
                <MaterialIcons name="verified" size={scale(14)} color={colors.amber} />
                <Text style={{ color: colors.amber, fontSize: moderateFontScale(11), fontWeight: '700' }}>Certified Tour Guide</Text>
              </View>

              <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: scale(8), borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
                <MaterialIcons name="translate" size={scale(14)} color={colors.textMuted} />
                <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(11), fontWeight: '700' }}>EN / HI / KN</Text>
              </View>

              <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: scale(10), paddingVertical: verticalScale(4), borderRadius: scale(8), borderWidth: 1, borderColor: '#10B981', flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
                <MaterialIcons name="star" size={scale(14)} color="#10B981" />
                <Text style={{ color: '#10B981', fontSize: moderateFontScale(11), fontWeight: '700' }}>4.9 ★ Rating</Text>
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
              <Text style={[styles.profileSectionTitle, { color: colors.amber }]}>Edit Guide Details</Text>

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
                  value={guideName}
                  onChangeText={setGuideName}
                  placeholder="Guide Full Name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: verticalScale(10) }]}>Current Password (Required to change password)</Text>
              <View style={[styles.inputFieldBox, { borderColor: colors.border, marginTop: verticalScale(4) }]}>
                <MaterialIcons name="lock" size={scale(18)} color={colors.amber} style={{ marginRight: scale(8) }} />
                <TextInput
                  style={[styles.textInputStyle, { color: colors.textPrimary, flex: 1 }]}
                  secureTextEntry={!showPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: scale(4) }}>
                  <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={scale(18)} color={colors.textMuted} />
                </TouchableOpacity>
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

          {/* 1. Bank Account & Wallet (Paisa Section) */}
          <View style={[styles.profileSectionCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border }]}>
            <Text style={[styles.profileSectionTitle, { color: colors.amber }]}>{trans.wallet}</Text>

            <View style={styles.payoutBalanceRow}>
              <View>
                <Text style={[styles.payoutAmtVal, { color: colors.textPrimary }]}>₹{earningsBalance}</Text>
                <Text style={[styles.payoutAmtSub, { color: colors.textMuted }]}>Available balance to settle</Text>
              </View>
              <TouchableOpacity
                style={[styles.smallPayoutBtn, { backgroundColor: colors.amber }]}
                onPress={handleInstantPayout}
                disabled={payoutLoading}
              >
                {payoutLoading ? <ActivityIndicator size="small" color="#101010" /> : <Text style={styles.smallPayoutBtnText}>Settle Now</Text>}
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
                placeholder="ramesh@upi"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>

            <TouchableOpacity
              style={[styles.detailedWalletBtn, { marginTop: verticalScale(14), borderColor: colors.amber }]}
              onPress={() => router.push('/(tabs)/guide-wallet' as any)}
            >
              <Text style={[styles.detailedWalletBtnText, { color: colors.amber }]}>View Detailed Wallet & Pay History</Text>
            </TouchableOpacity>
          </View>

          {/* App Appearance & Language (Matching Driver Profile) */}
          <View style={[styles.profileSectionCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', borderColor: colors.border }]}>
            <Text style={[styles.profileSectionTitle, { color: colors.amber }]}>App Appearance & Language</Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: verticalScale(6) }]}>App Display Theme</Text>
            <View style={[styles.vehiclePillsRow, { marginBottom: verticalScale(14) }]}>
              <TouchableOpacity
                style={[styles.langPill, isDark && styles.langPillActive, { borderColor: colors.border }]}
                onPress={() => setAppTheme('dark')}
              >
                <MaterialIcons name="dark-mode" size={scale(14)} color={isDark ? '#101010' : colors.textPrimary} style={{ marginRight: scale(4) }} />
                <Text style={[styles.langPillText, { color: isDark ? '#101010' : colors.textPrimary }]}>Dark Mode </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.langPill, !isDark && styles.langPillActive, { borderColor: colors.border }]}
                onPress={() => setAppTheme('light')}
              >
                <MaterialIcons name="light-mode" size={scale(14)} color={!isDark ? '#101010' : colors.textPrimary} style={{ marginRight: scale(4) }} />
                <Text style={[styles.langPillText, { color: !isDark ? '#101010' : colors.textPrimary }]}>Light Mode </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: verticalScale(6) }]}>Select App Language / ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ</Text>
            <View style={styles.vehiclePillsRow}>
              <TouchableOpacity
                style={[styles.langPill, appLang === 'en' && styles.langPillActive, { borderColor: colors.border }]}
                onPress={() => {
                  setAppLang('en');
                  const session = getUserSessionSync();
                  if (session?.id) saveUserSettingsApi(session.id, { language: 'en' });
                }}
              >
                <Text style={[styles.langPillText, { color: appLang === 'en' ? '#101010' : colors.textPrimary }]}>English</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.langPill, appLang === 'kn' && styles.langPillActive, { borderColor: colors.border }]}
                onPress={() => {
                  setAppLang('kn');
                  const session = getUserSessionSync();
                  if (session?.id) saveUserSettingsApi(session.id, { language: 'kn' });
                }}
              >
                <Text style={[styles.langPillText, { color: appLang === 'kn' ? '#101010' : colors.textPrimary }]}>ಕನ್ನಡ (Kannada)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Big Logout Button at the Bottom (Matching Driver Profile) */}
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

        <TouchableOpacity style={styles.tabBarItem} onPress={() => setActiveTab('active_tour')}>
          <View style={[styles.tabIconWrapper, activeTab === 'active_tour' && styles.tabIconWrapperActive]}>
            <MaterialIcons name="navigation" size={scale(22)} color={activeTab === 'active_tour' ? '#101010' : colors.textMuted} />
          </View>
          <Text style={[styles.tabBarLabel, { color: activeTab === 'active_tour' ? colors.amber : colors.textMuted }]}>
            {appLang === 'kn' ? 'ಸಕ್ರಿಯ ಪ್ರವಾಸ' : 'Active Tour'}
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
                <Text style={styles.popupTimerText}>INCOMING INSTANT BOOKING ({timerSeconds}s)</Text>
              </View>

              <View style={styles.popupMainDetails}>
                <View style={styles.touristNameBadge}>
                  <MaterialIcons name="person-pin" size={scale(22)} color={colors.amber} style={{ marginRight: scale(8) }} />
                  <View>
                    <Text style={[styles.touristNameVal, { color: colors.textPrimary }]}>{incomingRequest.touristName}</Text>
                    <Text style={[styles.touristMetaVal, { color: colors.textMuted }]}>Prefer: {incomingRequest.language} · {incomingRequest.groupSize} Pax</Text>
                  </View>
                </View>

                <View style={[styles.popupDetailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Tourist Pickup</Text>
                  <Text style={[styles.popupVal, { color: colors.textPrimary }]} numberOfLines={1}>{incomingRequest.pickup}</Text>
                </View>

                <View style={[styles.popupDetailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.popupLabel, { color: colors.textMuted }]}>Spots to Tour</Text>
                  <Text style={[styles.popupVal, { color: colors.textPrimary }]} numberOfLines={1}>
                    {incomingRequest.spots.map(s => s.name).join(' ➔ ')}
                  </Text>
                </View>

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
      <Modal visible={otpVisible} transparent={true} animationType="fade">
        {activeTour && (
          <View style={styles.popupOverlay}>
            <View style={[styles.otpContentCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF' }]}>
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

      {/* Digital Tickets QR Code Modal Popup */}
      <Modal visible={qrVisible} transparent={true} animationType="fade">
        <View style={styles.popupOverlay}>
          <View style={[styles.otpContentCard, { backgroundColor: isDark ? '#1E1E24' : '#FFFFFF', width: '90%' }]}>
            <Text style={[styles.otpTitle, { color: colors.textPrimary, marginBottom: scale(6) }]}>Monument Entry Passes</Text>
            <Text style={[styles.otpSub, { color: colors.textMuted, marginBottom: scale(14) }]}>QR Codes synced from customer bookings</Text>

            <View style={styles.qrCodeDrawBox}>
              {/* Symmetrical QR representation */}
              <FontAwesome5 name="qrcode" size={scale(180)} color={colors.textPrimary} style={{ marginVertical: verticalScale(14) }} />
            </View>

            <View style={styles.passDetailsInfo}>
              <Text style={[styles.passInfoTitle, { color: colors.textPrimary }]}>Mysuru Palace Entrance Pass</Text>
              <Text style={[styles.passInfoMeta, { color: colors.textMuted }]}>Pass Count: 3 Adults | Valid: Today Only</Text>
            </View>

            <TouchableOpacity style={[styles.popupBtn, { backgroundColor: '#2C2C34', width: '100%', marginTop: scale(10) }]} onPress={() => setQrVisible(false)}>
              <Text style={styles.popupBtnCancelText}>Close Pass Drawer</Text>
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
  checkboxWrapperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(14),
    marginTop: verticalScale(6),
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  checkboxLabel: {
    fontSize: moderateFontScale(12.5),
    fontWeight: '700',
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
  ringtonePillsRow: {
    flexDirection: 'row',
    gap: scale(6),
  },
  ringTonePill: {
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: scale(8),
    paddingVertical: verticalScale(4),
    paddingHorizontal: scale(8),
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  ringTonePillActive: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },
  ringPillText: {
    fontSize: moderateFontScale(10.5),
    fontWeight: '800',
  },
  volumeAdjustBtns: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(8),
  },
  volStepBtn: {
    width: scale(32),
    height: scale(28),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volStepText: {
    color: '#ffffff',
    fontSize: moderateFontScale(14),
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
  vehiclePillsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(4),
  },
  qrCodeDrawBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: scale(16),
    padding: scale(10),
    marginBottom: verticalScale(14),
  },
  passDetailsInfo: {
    alignItems: 'center',
    marginBottom: verticalScale(14),
  },
  passInfoTitle: {
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  passInfoMeta: {
    fontSize: moderateFontScale(11.5),
    fontWeight: '600',
    marginTop: verticalScale(2),
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
  partnerBadgeIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(245,197,24,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  onlineDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  onlinePillText: {
    fontSize: moderateFontScale(11),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  captainHeaderCard: {
    padding: scale(16),
    borderRadius: scale(16),
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: verticalScale(14),
  },
  captainAvatarContainer: {
    position: 'relative',
    marginBottom: verticalScale(10),
  },
  captainAvatarImg: {
    width: scale(84),
    height: scale(84),
    borderRadius: scale(42),
    borderWidth: 2,
    borderColor: '#F5C518',
  },
  captainAvatarPlaceholder: {
    width: scale(84),
    height: scale(84),
    borderRadius: scale(42),
    backgroundColor: 'rgba(245,197,24,0.12)',
    borderWidth: 2,
    borderColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadgeBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#F5C518',
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  captainNameText: {
    fontSize: moderateFontScale(20),
    fontWeight: '900',
    marginBottom: verticalScale(2),
  },
  captainPhoneText: {
    fontSize: moderateFontScale(13),
    fontWeight: '600',
    marginBottom: verticalScale(10),
  },
  vehicleBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
    justifyContent: 'center',
    marginBottom: verticalScale(14),
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: 'rgba(245,197,24,0.1)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
  },
  badgePillText: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    color: '#F5C518',
  },
  toggleEditModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    borderWidth: 1.5,
  },
  toggleEditModeBtnText: {
    fontSize: moderateFontScale(12),
    fontWeight: '800',
  },
  editProfileCard: {
    padding: scale(16),
    borderRadius: scale(16),
    borderWidth: 1.5,
    marginBottom: verticalScale(14),
  },
  editCardTitle: {
    fontSize: moderateFontScale(15),
    fontWeight: '900',
    marginBottom: verticalScale(12),
  },
  photoPickerTile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(10),
    backgroundColor: 'rgba(245,197,24,0.06)',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.25)',
  },
  photoPickerPreview: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
  },
  photoPickerPlaceholder: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: 'rgba(245,197,24,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPickerTitle: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
  photoPickerSub: {
    fontSize: moderateFontScale(11),
    fontWeight: '500',
  },
  saveProfileBtn: {
    marginTop: verticalScale(16),
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveProfileBtnText: {
    fontSize: moderateFontScale(14),
    fontWeight: '900',
    color: '#101010',
  },
  bottomLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: '#EF4444',
    paddingVertical: verticalScale(14),
    borderRadius: scale(14),
    marginTop: verticalScale(16),
    marginBottom: verticalScale(30),
    elevation: 3,
  },
  bottomLogoutBtnText: {
    color: '#FFFFFF',
    fontSize: moderateFontScale(15),
    fontWeight: '900',
  },
});
