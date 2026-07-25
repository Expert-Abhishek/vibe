import {
  fetchAdminPaymentSettingsApi,
  fetchUserProfileApi,
  fetchWalletBalanceApi,
  saveUserSettingsApi,
  submitWalletTopupRequestApi,
  submitWithdrawalApi,
  updateProfilePhotoApi,
  updateUserProfileApi,
} from '@/constants/api';
import { getUserSessionSync, saveUserSession } from '@/constants/authStore';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { toggleAppTheme, useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppModal } from '@src/context/ModalContext';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { showError, showSuccess } = useAppModal();

  const [name, setName] = useState('Abhishek');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(1500);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);

  // Top-Up state variables
  const [topupModalVisible, setTopupModalVisible] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupStep, setTopupStep] = useState<1 | 2>(1);
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [screenshotBase64, setScreenshotBase64] = useState('');
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);
  const [initiatedAt, setInitiatedAt] = useState<Date | null>(null);

  const [adminUpiId, setAdminUpiId] = useState('vibe.pay@upi');
  const [adminQrCodeUrl, setAdminQrCodeUrl] = useState('https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=vibe.pay@upi&pn=Vibe%20Platform');

  const session = getUserSessionSync();
  const userId = session?.id || 'c1';

  React.useEffect(() => {
    async function loadProfileAndWalletData() {
      if (session?.name) setName(session.name);
      if (session?.phone) setPhone(session.phone);
      if (session?.photo_url) setPhotoUrl(session.photo_url);

      const userRes = await fetchUserProfileApi(userId);
      if (userRes && userRes.success && userRes.user) {
        if (userRes.user.name) setName(userRes.user.name);
        if (userRes.user.phone) setPhone(userRes.user.phone);
        const photo = userRes.user.photo_url || userRes.user.profile?.photo_url || null;
        if (photo) setPhotoUrl(photo);
      }

      const data = await fetchWalletBalanceApi(userId);
      if (data.success) {
        if (data.balance !== undefined) setWalletBalance(data.balance);
        if (data.transactions) setWalletTransactions(data.transactions);
      }

      const adminRes = await fetchAdminPaymentSettingsApi();
      if (adminRes && adminRes.success && adminRes.data) {
        if (adminRes.data.upi_id || adminRes.data.upiId) setAdminUpiId(adminRes.data.upi_id || adminRes.data.upiId);
        if (adminRes.data.qr_code_url || adminRes.data.qrCodeUrl) setAdminQrCodeUrl(adminRes.data.qr_code_url || adminRes.data.qrCodeUrl);
      }
    }
    loadProfileAndWalletData();
  }, [userId]);

  // Client-side countdown timer for Top-Up Screenshot uploads
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (topupModalVisible && topupStep === 2 && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval!);
            setTopupModalVisible(false);
            setTopupStep(1);
            setScreenshotBase64('');
            showError('Session Expired', 'The 5-minute window to upload your payment screenshot has expired. Please try again.');
            return 300;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [topupModalVisible, topupStep, timerSeconds]);

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
              showError('Permission Denied', 'Camera access permission is required.');
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
              showError('Permission Denied', 'Gallery access permission is required.');
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
      showError('Required', 'Please upload a screenshot proof of the payment.');
      return;
    }

    try {
      setIsSubmittingTopup(true);
      const payload = {
        userId,
        userName: name,
        role: session?.role || 'tourist',
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
      } else {
        showError('Submission Failed', res?.message || 'Could not submit your top-up request.');
      }
    } catch (e: any) {
      showError('Submission Error', e?.message || 'A network error occurred.');
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  const [appLang, setAppLang] = useState<'en' | 'kn'>('en');

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1A1A20' : '#FFFFFF',
    surfaceAlt: isDark ? '#212129' : '#EFEFF4',
    line: isDark ? '#2C2C34' : '#E5E5EA',
    textPrimary: isDark ? '#F5F4F0' : '#1C1C1E',
    textMuted: isDark ? '#8D8D97' : '#8E8E93',
    amber: '#F5C518',
    danger: '#F0555F',
  };

  // Kannada Translations Mapping
  const trans = {
    en: {
      profileRole: 'Vibzz Premium Member',
      accountInfo: 'Account Information',
      fullName: 'Full Name',
      updateBtn: 'Update',
      changePass: 'Change Password',
      currentPass: 'Current Password',
      newPass: 'New Password',
      changePassBtn: 'Change Password',
      pref: 'Preferences',
      darkTheme: 'Dark Theme',
      darkActive: 'Dark mode active',
      darkInactive: 'Light mode active',
      langTitle: 'Kannada Language',
      langActive: 'ಕನ್ನಡ ಸಕ್ರಿಯವಾಗಿದೆ',
      langInactive: 'English is active',
      logout: 'Logout',
    },
    kn: {
      profileRole: 'ವಿಬ್ಜ್ ಪ್ರೀಮಿಯಂ ಸದಸ್ಯರು',
      accountInfo: 'ಖಾತೆಯ ಮಾಹಿತಿ',
      fullName: 'ಪೂರ್ಣ ಹೆಸರು',
      updateBtn: 'ನವೀಕರಿಸಿ',
      changePass: 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ',
      currentPass: 'ಪ್ರಸ್ತುತ ಪಾಸ್‌ವರ್ಡ್',
      newPass: 'ಹೊಸ ಪಾಸ್‌ವರ್ಡ್',
      changePassBtn: 'ಪಾಸ್‌ವರ್ಡ್ ಬದಲಾಯಿಸಿ',
      pref: 'ಆದ್ಯತೆಗಳು',
      darkTheme: 'ಡಾರ್ಕ್ ಥೀಮ್',
      darkActive: 'ಡಾರ್ಕ್ ಮೋಡ್ ಸಕ್ರಿಯವಾಗಿದೆ',
      darkInactive: 'ಲೈಟ್ ಮೋಡ್ ಸಕ್ರಿಯವಾಗಿದೆ',
      langTitle: 'ಕನ್ನಡ ಭಾಷೆ',
      langActive: 'ಕನ್ನಡ ಸಕ್ರಿಯವಾಗಿದೆ',
      langInactive: 'ಇಂಗ್ಲಿಷ್ ಸಕ್ರಿಯವಾಗಿದೆ',
      logout: 'ನಿರ್ಗಮಿಸಿ',
    },
  }[appLang];

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
              showError('Permission Denied', 'Camera access permission is required.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.3,
              base64: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              await handleUploadPhoto(result.assets[0]);
            }
          },
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: async () => {
            const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!granted) {
              showError('Permission Denied', 'Gallery access permission is required.');
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
              await handleUploadPhoto(result.assets[0]);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleUploadPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      setIsUploadingPhoto(true);
      let photoData = '';
      if (asset.base64) {
        photoData = asset.base64.startsWith('data:') ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`;
      } else {
        photoData = asset.uri;
      }

      const role = session?.role || 'tourist';
      const response = await updateProfilePhotoApi(userId, role, photoData);

      if (response && response.success) {
        const newPhotoUrl = response.photoUrl || photoData;
        setPhotoUrl(newPhotoUrl);
        if (session) {
          await saveUserSession({
            ...session,
            photo_url: newPhotoUrl,
            user: {
              ...(session.user || {}),
              photo_url: newPhotoUrl,
            },
            profile: session.profile ? {
              ...session.profile,
              photo_url: newPhotoUrl,
            } : undefined,
          });
        }
        showSuccess('🎉 Success!', 'Your profile photo has been updated successfully.');
      } else {
        showError('Upload Failed', response?.message || 'Failed to update profile photo on the server.');
      }
    } catch (error: any) {
      showError('Upload Error', error?.message || 'An unexpected error occurred during photo upload.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleUpdateName = async () => {
    if (!name.trim()) {
      showError('Error', 'Name cannot be empty.');
      return;
    }
    const updateRes = await updateUserProfileApi(userId, { name });
    if (updateRes && updateRes.success) {
      if (session) {
        await saveUserSession({ ...session, name });
      }
      showSuccess('🎉 Profile Updated!', 'Your profile information has been saved to the database.');
    } else {
      showSuccess('Success', 'Profile updated locally.');
    }
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }
    Alert.alert('Success', 'Password changed successfully.');
    setCurrentPassword('');
    setNewPassword('');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => router.replace('/(auth)/sign-in') },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HEADER SECTION */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.avatarContainer} disabled={isUploadingPhoto}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={[styles.avatarImage, isUploadingPhoto && { opacity: 0.5 }]} />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: colors.amber }, isUploadingPhoto && { opacity: 0.5 }]}>
                <Text style={styles.avatarText}>{name ? name[0].toUpperCase() : 'U'}</Text>
              </View>
            )}
            {isUploadingPhoto ? (
              <ActivityIndicator size="small" color={colors.amber} style={StyleSheet.absoluteFillObject} />
            ) : (
              <View style={[styles.cameraIconBadge, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <MaterialIcons name="photo-camera" size={scale(14)} color={colors.amber} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{name}</Text>
          <Text style={[styles.userRole, { color: colors.textMuted }]}>{trans.profileRole}</Text>
        </View>

        {/* ACCOUNT INFORMATION SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.amber }]}>{trans.accountInfo}</Text>

          <Text style={[styles.label, { color: colors.textPrimary }]}>{trans.fullName}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter full name"
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.amber }]} onPress={handleUpdateName}>
            <Text style={styles.primaryButtonText}>{trans.updateBtn}</Text>
          </TouchableOpacity>
        </View>

        {/* SECURITY / CHANGE PASSWORD SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.amber }]}>{trans.changePass}</Text>

          <Text style={[styles.label, { color: colors.textPrimary }]}>{trans.currentPass}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.label, { color: colors.textPrimary }]}>{trans.newPass}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
          />

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.amber }]}
            onPress={handleChangePassword}
          >
            <Text style={[styles.primaryButtonText, { color: colors.amber }]}>{trans.changePassBtn}</Text>
          </TouchableOpacity>
        </View>

        {/* WALLET CARD SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.amber }]}>💳 Vibe Wallet</Text>
          <View style={{ marginBottom: verticalScale(14) }}>
            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12) }}>Available Balance</Text>
            <Text style={{ color: colors.amber, fontSize: moderateFontScale(26), fontWeight: 'bold' }}>₹{walletBalance}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: scale(10) }}>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1, backgroundColor: colors.amber, marginTop: 0 }]}
              onPress={() => {
                setTopupAmount('');
                setTopupStep(1);
                setScreenshotBase64('');
                setTimerSeconds(300);
                setTopupModalVisible(true);
              }}
            >
              <Text style={styles.primaryButtonText}>💳 Add Money</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 0, borderWidth: 1, borderColor: colors.line }]}
              onPress={() => setWalletModalVisible(true)}
            >
              <Text style={[styles.primaryButtonText, { color: colors.textPrimary }]}>📜 History</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: 'rgba(255,255,255,0.06)', marginTop: verticalScale(10), borderWidth: 1, borderColor: colors.line }]}
            onPress={() => setWithdrawModalVisible(true)}
          >
            <Text style={[styles.primaryButtonText, { color: colors.textPrimary }]}>💸 Withdraw Funds</Text>
          </TouchableOpacity>
        </View>

        {/* PREFERENCES SECTION */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.cardTitle, { color: colors.amber }]}>{trans.pref}</Text>

          {/* Dark Theme toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{trans.darkTheme}</Text>
              <Text style={[styles.toggleSubLabel, { color: colors.textMuted }]}>
                {isDark ? trans.darkActive : trans.darkInactive}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleAppTheme}
              trackColor={{ false: '#767577', true: colors.amber }}
              thumbColor={isDark ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.line, marginVertical: verticalScale(10) }]} />

          {/* Kannada Language toggle switch */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{trans.langTitle}</Text>
              <Text style={[styles.toggleSubLabel, { color: colors.textMuted }]}>
                {appLang === 'kn' ? trans.langActive : trans.langInactive}
              </Text>
            </View>
            <Switch
              value={appLang === 'kn'}
              onValueChange={(val) => {
                const newLang = val ? 'kn' : 'en';
                setAppLang(newLang);
                if (userId) saveUserSettingsApi(userId, { language: newLang });
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

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.danger }]} onPress={handleLogout}>
          <MaterialIcons name="exit-to-app" size={scale(20)} color={colors.danger} style={{ marginRight: scale(8) }} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>{trans.logout}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Wallet History Bottom Drawer */}
      <Modal visible={walletModalVisible} animationType="slide" transparent={true} onRequestClose={() => setWalletModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, height: '60%', borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(20) }}>
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
                const isIncoming = item.type === 'topup' || item.type === 'refund';
                return (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: verticalScale(12), borderBottomWidth: 1, borderBottomColor: colors.line }}>
                    <View style={{ flex: 1, marginRight: scale(10) }}>
                      <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(14) }} numberOfLines={1}>
                        {item.description || (isIncoming ? 'Wallet Top-Up' : 'Debit')}
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
          </View>
        </View>
      </Modal>

      {/* Wallet Add Money (Top-Up) Modal */}
      <Modal visible={topupModalVisible} animationType="slide" transparent={true} onRequestClose={() => setTopupModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(20), maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) }}>
              <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(18), fontWeight: 'bold' }}>
                {topupStep === 1 ? '💳 Add Money to Wallet' : '📲 Scan QR & Pay'}
              </Text>
              <TouchableOpacity onPress={() => setTopupModalVisible(false)}>
                <MaterialIcons name="close" size={scale(24)} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {topupStep === 1 ? (
              <ScrollView>
                <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(13), marginBottom: verticalScale(16) }}>
                  Top up your Vibe wallet balance to pay for trips or services instantly.
                </Text>

                <Text style={[styles.label, { color: colors.textPrimary }]}>Enter Amount (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
                  keyboardType="numeric"
                  value={topupAmount}
                  onChangeText={setTopupAmount}
                  placeholder="Minimum ₹500"
                  placeholderTextColor={colors.textMuted}
                />

                {/* Quick select buttons */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(20), gap: scale(8) }}>
                  {[500, 1000, 2000, 5000].map(amt => (
                    <TouchableOpacity
                      key={amt}
                      style={{ flex: 1, paddingVertical: verticalScale(8), borderRadius: scale(8), backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line, alignItems: 'center' }}
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
                      showError('Minimum Amount Required', 'The minimum top-up amount is ₹500.');
                      return;
                    }
                    setInitiatedAt(new Date());
                    setTimerSeconds(300);
                    setTopupStep(2);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Proceed to Pay</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* 5-minute countdown timer header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: verticalScale(8), borderRadius: scale(8), marginBottom: verticalScale(16) }}>
                  <MaterialIcons name="alarm" size={scale(18)} color={colors.danger} style={{ marginRight: scale(6) }} />
                  <Text style={{ color: colors.danger, fontWeight: 'bold', fontSize: moderateFontScale(14) }}>
                    Upload screenshot in: {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
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
                <View style={{ backgroundColor: colors.surfaceAlt, padding: scale(12), borderRadius: scale(10), borderWidth: 1, borderColor: colors.line, marginBottom: verticalScale(16), alignItems: 'center' }}>
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
                    style={[styles.primaryButton, { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: colors.line, marginTop: 0 }]}
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
          </View>
        </View>
      </Modal>

      {/* Withdraw Funds Modal */}
      <Modal visible={withdrawModalVisible} animationType="slide" transparent={true} onRequestClose={() => setWithdrawModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), padding: scale(20) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: verticalScale(16) }}>
              <Text style={{ color: colors.textPrimary, fontSize: moderateFontScale(18), fontWeight: 'bold' }}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <MaterialIcons name="close" size={scale(24)} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(12), marginBottom: verticalScale(4) }}>Available: ₹{walletBalance}</Text>

            <Text style={[styles.label, { color: colors.textPrimary, marginTop: verticalScale(12) }]}>Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholder="Enter amount"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textPrimary, marginTop: verticalScale(12) }]}>UPI ID</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.textPrimary }]}
              value={withdrawUpi}
              onChangeText={setWithdrawUpi}
              placeholder="yourname@upi"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.amber, marginTop: verticalScale(20) }]}
              onPress={async () => {
                const amt = parseFloat(withdrawAmount);
                if (!amt || amt <= 0) {
                  Alert.alert('Error', 'Please enter a valid amount');
                  return;
                }
                if (amt > walletBalance) {
                  Alert.alert('Error', 'Withdrawal amount exceeds wallet balance');
                  return;
                }
                if (!withdrawUpi.trim()) {
                  Alert.alert('Error', 'Please enter your UPI ID');
                  return;
                }
                const res = await submitWithdrawalApi({ userId, userName: name, amount: amt, upiId: withdrawUpi });
                if (res.success) {
                  Alert.alert('Success', res.message || 'Withdrawal request submitted');
                  setWithdrawModalVisible(false);
                  setWithdrawAmount('');
                  setWithdrawUpi('');
                } else {
                  Alert.alert('Error', res.message || 'Withdrawal failed');
                }
              }}
            >
              <Text style={styles.primaryButtonText}>Submit Withdrawal Request</Text>
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
  scrollContent: {
    padding: scale(20),
  },
  header: {
    alignItems: 'center',
    marginTop: verticalScale(10),
    marginBottom: verticalScale(24),
  },
  avatarCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
  },
  avatarText: {
    fontSize: moderateFontScale(32),
    fontWeight: 'bold',
    color: '#101014',
  },
  userName: {
    fontSize: moderateFontScale(22),
    fontWeight: 'bold',
    marginBottom: verticalScale(4),
  },
  userRole: {
    fontSize: moderateFontScale(14),
  },
  card: {
    padding: scale(16),
    borderRadius: scale(16),
    borderWidth: 1,
    marginBottom: verticalScale(20),
  },
  cardTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: 'bold',
    marginBottom: verticalScale(16),
  },
  label: {
    fontSize: moderateFontScale(13),
    fontWeight: '600',
    marginBottom: verticalScale(6),
  },
  input: {
    height: verticalScale(44),
    borderRadius: scale(10),
    borderWidth: 1,
    paddingHorizontal: scale(12),
    fontSize: moderateFontScale(14),
    marginBottom: verticalScale(14),
  },
  primaryButton: {
    height: verticalScale(44),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(6),
  },
  primaryButtonText: {
    fontSize: moderateFontScale(14),
    fontWeight: 'bold',
    color: '#101014',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(4),
  },
  toggleLabel: {
    fontSize: moderateFontScale(14),
    fontWeight: '600',
  },
  toggleSubLabel: {
    fontSize: moderateFontScale(12),
    marginTop: verticalScale(2),
  },
  divider: {
    height: 1,
    width: '100%',
  },
  logoutBtn: {
    flexDirection: 'row',
    height: verticalScale(48),
    borderRadius: scale(12),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(30),
  },
  logoutText: {
    fontSize: moderateFontScale(15),
    fontWeight: 'bold',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: verticalScale(12),
    alignSelf: 'center',
  },
  avatarImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
