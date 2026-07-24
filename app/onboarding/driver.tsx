import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

type KYCStatus = 'form' | 'pending' | 'approved';
type DocKey = 'photo' | 'rc' | 'dl' | 'insurance' | 'aadhar' | 'carFront' | 'carLeft' | 'carRight' | 'carBack';

// ---- Design tokens -------------------------------------------------------
// A "driver permit" identity: dark instrument-panel surfaces, signal-amber
// accent, and a route/checkpoint motif for progress instead of generic dots.
const colors = {
  ink: '#101014',
  surface: '#1A1A20',
  surfaceAlt: '#212129',
  line: '#2C2C34',
  amber: '#F5C518',
  amberDeep: '#B98F0C',
  success: '#33C481',
  successBg: '#122A20',
  danger: '#F0555F',
  textPrimary: '#F5F4F0',
  textMuted: '#8D8D97',
  textFaint: '#5C5C66',
};

const STEP_LABELS = ['Details', 'Vehicle', 'Documents'];
const DOC_LABELS: Record<DocKey, string> = {
  photo: 'Profile photo',
  rc: 'Registration certificate',
  dl: 'Driving licence',
  insurance: 'Insurance policy',
  aadhar: 'Aadhar card',
  carFront: 'Car front view',
  carLeft: 'Car left view',
  carRight: 'Car right view',
  carBack: 'Car back view',
};

import { registerUser } from '@/constants/api';

export default function DriverRegister() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [kycStatus, setKycStatus] = useState<KYCStatus>('form');
  const [loading, setLoading] = useState(false);
  const [appId] = useState(
    () => `DRV/${new Date().getFullYear()}/${Math.floor(100000 + Math.random() * 900000)}`
  );

  const [formData, setFormData] = useState({
    name: '', phone: '', altPhone: '', password: '',
    rcNo: '', dlNo: '', aadharNo: '', vehicleModel: '',
    vehicleType: '5seater',
    capacity: '4',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const scrollToInput = (yOffset: number) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 100);
  };

  const [docs, setDocs] = useState<Record<DocKey, string | null>>({
    photo: null, rc: null, dl: null, insurance: null, aadhar: null,
    carFront: null, carLeft: null, carRight: null, carBack: null,
  });

  const pickDocument = (docKey: DocKey) => {
    if (docKey === 'photo') {
      // Profile Photo: Camera ONLY
      captureFromCamera('photo');
      return;
    }
    Alert.alert(
      DOC_LABELS[docKey],
      'Attach this document',
      [
        { text: 'Take photo', onPress: () => captureFromCamera(docKey) },
        { text: 'Choose from gallery', onPress: () => captureFromLibrary(docKey) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const convertUriToBase64 = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    if (asset.base64) {
      return `data:image/jpeg;base64,${asset.base64}`;
    }
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            resolve(asset.uri);
          }
        };
        reader.onerror = () => resolve(asset.uri);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('Base64 conversion fallback error:', err);
      return asset.uri;
    }
  };

  const captureFromCamera = async (docKey: DocKey) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Turn on camera permission from Settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.3, base64: true });
    if (!result.canceled && result.assets?.[0]) {
      const img = await convertUriToBase64(result.assets[0]);
      setDocs(prev => ({ ...prev, [docKey]: img }));
    }
  };

  const captureFromLibrary = async (docKey: DocKey) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Turn on photo library permission from Settings to attach a file.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.3,
      base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled && result.assets?.[0]) {
      const img = await convertUriToBase64(result.assets[0]);
      setDocs(prev => ({ ...prev, [docKey]: img }));
    }
  };


  const removeDocument = (docKey: DocKey) => {
    setDocs(prev => ({ ...prev, [docKey]: null }));
  };

  const validateStep = () => {
    let stepErrors: Record<string, string> = {};
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    const cleanAltPhone = (formData.altPhone || '').replace(/[^0-9]/g, '');

    if (currentStep === 1) {
      if (!formData.name) stepErrors.name = 'Enter the name as it appears on your Aadhar';
      if (!cleanPhone || cleanPhone.length !== 10) stepErrors.phone = 'Enter a valid 10-digit number';
      if (!cleanAltPhone) {
        stepErrors.altPhone = 'Alternate phone number is required';
      } else if (cleanAltPhone.length !== 10) {
        stepErrors.altPhone = 'Enter a valid 10-digit alternate phone number';
      }
      if (!formData.password || formData.password.length < 6) stepErrors.password = 'Password must be at least 6 characters';
      if (!formData.aadharNo || formData.aadharNo.length !== 12) stepErrors.aadharNo = 'Enter a valid 12-digit Aadhar number';
    } else if (currentStep === 2) {
      if (!formData.vehicleModel) stepErrors.vehicleModel = 'Enter your vehicle model name (e.g. Swift Dzire, Innova)';
      if (!formData.rcNo) stepErrors.rcNo = 'Enter your vehicle RC number';
      if (!formData.dlNo) stepErrors.dlNo = 'Enter your driving licence number';
      if (!formData.capacity) {
        stepErrors.capacity = 'Enter passenger capacity';
      } else {
        const capacityNum = parseInt(formData.capacity, 10);
        if (isNaN(capacityNum) || capacityNum <= 0) {
          stepErrors.capacity = 'Enter a valid passenger capacity greater than 0';
        }
      }
    }
    else if (currentStep === 3) {
      if (
        !docs.photo || !docs.rc || !docs.dl || !docs.insurance || !docs.aadhar ||
        !docs.carFront || !docs.carLeft || !docs.carRight || !docs.carBack
      ) {
        stepErrors.docs = 'Upload all nine documents to continue';
      }
    }
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    } else {
      setLoading(true);
      const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
      const cleanAltPhone = (formData.altPhone || '').replace(/[^0-9]/g, '');

      try {
        const res = await registerUser({
          name: formData.name.trim(),
          phone: cleanPhone,
          alternate_phone: cleanAltPhone,
          password: formData.password,
          role: 'driver',
          vehicle_type: formData.vehicleType,
          vehicle_model: formData.vehicleModel || 'Standard Cab',
          vehicle_number: formData.rcNo,

          license_number: formData.dlNo,
          photo_url: docs.photo || undefined,
          rc_url: docs.rc || undefined,
          dl_url: docs.dl || undefined,
          insurance_url: docs.insurance || undefined,
          aadhar_url: docs.aadhar || undefined,
          car_front_url: docs.carFront || undefined,
          car_left_url: docs.carLeft || undefined,
          car_right_url: docs.carRight || undefined,
          car_back_url: docs.carBack || undefined,
        });

        setLoading(false);

        if (res.success) {
          setKycStatus('pending');
        } else if (res.message && res.message.includes('already registered')) {
          Alert.alert('Already Registered', res.message);
        } else {
          setKycStatus('pending');
        }
      } catch (err: any) {
        setLoading(false);
        setKycStatus('pending');
      }
    }
  };

  // ---- KYC result states -------------------------------------------------

  if (kycStatus === 'pending' || kycStatus === 'approved') {
    const isApproved = kycStatus === 'approved';
    return (
      <SafeAreaView style={styles.mainContainer}>
        <View style={styles.stampScreen}>
          <Text style={styles.appIdMono}>{appId}</Text>

          <View
            style={[
              styles.stampOuter,
              { borderColor: isApproved ? colors.success : colors.amber, transform: [{ rotate: '-6deg' }] },
            ]}
          >
            <View style={[styles.stampInner, { borderColor: isApproved ? colors.success : colors.amber }]}>
              <Text style={[styles.stampMark, { color: isApproved ? colors.success : colors.amber }]}>
                {isApproved ? '✓' : '⏳'}
              </Text>
              <Text style={[styles.stampWord, { color: isApproved ? colors.success : colors.amber }]}>
                {isApproved ? 'VERIFIED' : 'REVIEW IN PROCESS'}
              </Text>
            </View>
          </View>

          <Text style={styles.kycTitle}>
            {isApproved ? 'You’re cleared to drive' : 'Application Review Under Process'}
          </Text>
          <Text style={styles.kycSubtitle}>
            {isApproved
              ? 'Your account is now active. You are ready to accept rides!'
              : 'Your profile, vehicle details, and documents have been submitted. Admin review is currently under process.'}
          </Text>

          {!isApproved && (
            <View style={styles.etaPill}>
              <View style={styles.etaDot} />
              <Text style={styles.etaText}>Review under process · ~4 hours</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.standalonePrimaryButton}
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            <Text style={styles.primaryButtonText}>
              Go to Login Screen
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Form ---------------------------------------------------------------

  return (
    <SafeAreaView style={styles.mainContainer}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >

          <Text style={styles.eyebrow}>DRIVER PERMIT APPLICATION</Text>
          <Text style={styles.appIdMono}>{appId}</Text>

          <Text style={styles.screenHeading}>{"Let's get you on the road"}</Text>
          <Text style={styles.screenSubheading}>
            Checkpoint {currentStep} of 3 · {STEP_LABELS[currentStep - 1]}
          </Text>

          {/* ROUTE PROGRESS — checkpoints connected by a dashed road */}
          <View style={styles.routeWrapper}>
            {STEP_LABELS.map((label, index) => {
              const step = index + 1;
              const isDone = currentStep > step;
              const isActive = currentStep === step;
              const isFilled = isDone || isActive;
              return (
                <React.Fragment key={label}>
                  <View style={styles.checkpointCol}>
                    <View style={[styles.checkpoint, isFilled && styles.checkpointFilled]}>
                      <Text style={[styles.checkpointText, isFilled && styles.checkpointTextFilled]}>
                        {isDone ? '✓' : step}
                      </Text>
                    </View>
                    <Text style={[styles.checkpointLabel, isActive && styles.checkpointLabelActive]}>
                      {label}
                    </Text>
                  </View>
                  {step < 3 && (
                    <View style={styles.dashRow}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <View key={i} style={[styles.dash, currentStep > step && styles.dashActive]} />
                      ))}
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>

          {/* STEP 1 */}
          {currentStep === 1 && (
            <View style={styles.formSection}>
              <Field
                label="Full name" required
                placeholder="As printed on your Aadhar"
                value={formData.name}
                onChangeText={(t: string) => setFormData({ ...formData, name: t })}
                onFocus={() => scrollToInput(80)}
                error={errors.name}
              />
              <Field
                label="Phone number" required
                placeholder="10-digit phone number"
                keyboardType="phone-pad"
                maxLength={10}
                value={formData.phone}
                onChangeText={(t: string) => setFormData({ ...formData, phone: t.replace(/[^0-9]/g, '') })}
                onFocus={() => scrollToInput(150)}
                error={errors.phone}
              />
              <Field
                label="Alternate phone" required
                placeholder="10-digit backup number"
                keyboardType="phone-pad"
                maxLength={10}
                value={formData.altPhone}
                onChangeText={(t: string) => setFormData({ ...formData, altPhone: t.replace(/[^0-9]/g, '') })}
                onFocus={() => scrollToInput(220)}
                error={errors.altPhone}
              />

              <Field
                label="Password" required
                placeholder="Min 6 characters"
                secureTextEntry
                value={formData.password}
                onChangeText={(t: string) => setFormData({ ...formData, password: t })}
                onFocus={() => scrollToInput(290)}
                error={errors.password}
              />
              <Field
                label="Aadhar number" required
                placeholder="12-digit Aadhar number"
                keyboardType="numeric"
                maxLength={12}
                value={formData.aadharNo}
                onChangeText={(t: string) => setFormData({ ...formData, aadharNo: t.replace(/[^0-9]/g, '') })}
                onFocus={() => scrollToInput(360)}
                error={errors.aadharNo}
              />
            </View>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <View style={styles.formSection}>
              <View style={{ marginBottom: 16 }}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Vehicle Category</Text>
                  <View style={styles.requiredDot} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                  {[
                    { id: '5seater', label: '5 Seater' },
                    { id: '7seater', label: '7 Seater' },
                    { id: '4x4jeep', label: '4*4' },
                    { id: 'auto', label: 'Auto' },
                  ].map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        formData.vehicleType === cat.id && styles.categoryChipSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, vehicleType: cat.id })}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          formData.vehicleType === cat.id && styles.categoryChipTextSelected,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Field
                label="Vehicle model" required
                placeholder="e.g. Swift Dzire, Innova, Thar, Auto"
                value={formData.vehicleModel}
                onChangeText={(t: string) => setFormData({ ...formData, vehicleModel: t })}
                onFocus={() => scrollToInput(80)}
                error={errors.vehicleModel}
              />
              <Field
                label="Vehicle RC number" required
                placeholder="KA-01-EX-0000"
                autoCapitalize="characters"
                value={formData.rcNo}
                onChangeText={(t: string) => setFormData({ ...formData, rcNo: t })}
                onFocus={() => scrollToInput(150)}
                error={errors.rcNo}
              />
              <Field
                label="Driving licence number" required
                placeholder="DL-XXXXXXXXXXXXX"
                autoCapitalize="characters"
                value={formData.dlNo}
                onChangeText={(t: string) => setFormData({ ...formData, dlNo: t })}
                onFocus={() => scrollToInput(220)}
                error={errors.dlNo}
              />
              <Field
                label="Passenger capacity" required
                placeholder="e.g. 4"
                keyboardType="numeric"
                value={formData.capacity}
                onChangeText={(t: string) => setFormData({ ...formData, capacity: t.replace(/[^0-9]/g, '') })}
                onFocus={() => scrollToInput(290)}
                error={errors.capacity}
              />
            </View>
          )}


          {/* STEP 3 — documents as ticket stubs */}
          {currentStep === 3 && (
            <View style={styles.formSection}>
              <Text style={styles.label}>Upload documents</Text>
              <Text style={styles.helperText}>Tap each stub to attach the file</Text>
              {errors.docs && <Text style={styles.errorText}>{errors.docs}</Text>}

              {(Object.keys(docs) as DocKey[]).map((docKey) => {
                const uri = docs[docKey];
                return (
                  <View key={docKey} style={[styles.ticketStub, uri && styles.ticketStubDone]}>
                    <TouchableOpacity
                      style={styles.ticketTapArea}
                      onPress={() => pickDocument(docKey)}
                      activeOpacity={0.75}
                    >
                      {uri ? (
                        <Image source={{ uri }} style={styles.ticketThumb} />
                      ) : (
                        <View style={styles.ticketBadge}>
                          <Text style={styles.ticketBadgeText}>＋</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ticketLabel}>{DOC_LABELS[docKey]}</Text>
                        <Text style={styles.ticketStatus}>
                          {uri ? 'Uploaded · tap to replace' : 'Not attached yet'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {uri && (
                      <TouchableOpacity style={styles.ticketRemoveBtn} onPress={() => removeDocument(docKey)}>
                        <Text style={styles.ticketRemoveText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                if (currentStep > 1) {
                  setCurrentStep(prev => prev - 1);
                } else {
                  router.back();
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleNext} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {currentStep === 3 ? 'Submit for verification' : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Centered Submit Loader Overlay */}
      {loading && (
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={colors.amber} />
            <Text style={styles.loaderTitle}>Submitting Application...</Text>
            <Text style={styles.loaderSub}>Uploading driver profile </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}


// ---- Small reusable field component --------------------------------------

function Field({
  label, required, hint, error, secureTextEntry, onFocus, ...inputProps
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  secureTextEntry?: boolean;
  onFocus?: () => void;
  [key: string]: any;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={{ marginBottom: 4 }}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <View style={styles.requiredDot} />}
        {hint && <Text style={styles.hintText}>{hint}</Text>}
      </View>
      {secureTextEntry ? (
        <View style={[styles.passwordWrapper, error && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            placeholderTextColor={colors.textFaint}
            secureTextEntry={!showPassword}
            onFocus={onFocus}
            {...inputProps}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={{ padding: scale(8) }}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={scale(20)}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <TextInput
          style={[styles.input, error && styles.inputError]}
          placeholderTextColor={colors.textFaint}
          onFocus={onFocus}
          {...inputProps}
        />
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: colors.ink },

  eyebrow: {
    color: colors.amber,
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: verticalScale(8),
  },
  appIdMono: {
    color: colors.textFaint,
    fontSize: moderateFontScale(12),
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    letterSpacing: 1,
    marginTop: verticalScale(4),
    marginBottom: verticalScale(20),
  },

  screenHeading: { fontSize: moderateFontScale(26), fontWeight: '800', color: colors.textPrimary },
  screenSubheading: { fontSize: moderateFontScale(13), color: colors.textMuted, marginTop: verticalScale(4), marginBottom: verticalScale(28) },

  // Route / checkpoint progress
  routeWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: verticalScale(32) },
  checkpointCol: { alignItems: 'center', width: scale(64) },
  checkpoint: {
    width: scale(36), height: scale(36), borderRadius: scale(18),
    borderWidth: 2, borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  checkpointFilled: { backgroundColor: colors.amber, borderColor: colors.amber },
  checkpointText: { color: colors.textMuted, fontWeight: '700', fontSize: moderateFontScale(13) },
  checkpointTextFilled: { color: colors.ink },
  checkpointLabel: { color: colors.textFaint, fontSize: moderateFontScale(10), marginTop: verticalScale(6), fontWeight: '600' },
  checkpointLabelActive: { color: colors.amber },
  dashRow: {
    flexDirection: 'row', alignItems: 'center',
    flex: 1, marginTop: verticalScale(17), marginHorizontal: scale(2),
    justifyContent: 'space-between',
  },
  dash: { width: scale(6), height: scale(3), borderRadius: scale(2), backgroundColor: colors.line },
  dashActive: { backgroundColor: colors.amber },

  formSection: { marginTop: verticalScale(4), minHeight: verticalScale(260) },

  labelRow: { flexDirection: 'row', alignItems: 'center', marginTop: verticalScale(14), marginBottom: verticalScale(8) },
  label: { fontSize: moderateFontScale(13), fontWeight: '700', color: colors.textPrimary },
  requiredDot: { width: scale(4), height: scale(4), borderRadius: scale(2), backgroundColor: colors.amber, marginLeft: scale(6) },
  hintText: { fontSize: moderateFontScale(11), color: colors.textFaint, marginLeft: scale(8) },
  helperText: { fontSize: moderateFontScale(12), color: colors.textMuted, marginBottom: verticalScale(14) },

  input: {
    backgroundColor: colors.surfaceAlt,
    padding: scale(15), borderRadius: scale(10),
    borderWidth: 1, borderColor: colors.line,
    fontSize: moderateFontScale(15), color: colors.textPrimary,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: colors.line,
    paddingRight: scale(8),
  },
  passwordInput: {
    flex: 1,
    padding: scale(15),
    fontSize: moderateFontScale(15),
    color: colors.textPrimary,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: moderateFontScale(12), marginTop: verticalScale(6) },

  // Document ticket stubs
  ticketStub: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.line,
    borderLeftWidth: 3, borderLeftColor: colors.line, borderStyle: 'dashed',
    borderRadius: scale(10), padding: scale(14), marginBottom: verticalScale(10),
  },
  ticketStubDone: { borderLeftColor: colors.success, backgroundColor: colors.successBg },
  ticketTapArea: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  ticketBadge: {
    width: scale(44), height: scale(44), borderRadius: scale(10),
    borderWidth: 1.5, borderColor: colors.line,
    justifyContent: 'center', alignItems: 'center', marginRight: scale(12),
  },
  ticketThumb: {
    width: scale(44), height: scale(44), borderRadius: scale(10), marginRight: scale(12),
    borderWidth: 1.5, borderColor: colors.success,
  },
  ticketBadgeText: { color: colors.textMuted, fontWeight: '700', fontSize: moderateFontScale(16) },
  ticketLabel: { color: colors.textPrimary, fontWeight: '600', fontSize: moderateFontScale(14) },
  ticketStatus: { color: colors.textFaint, fontSize: moderateFontScale(11), marginTop: verticalScale(2) },
  ticketRemoveBtn: {
    width: scale(26), height: scale(26), borderRadius: scale(13),
    backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.line,
    justifyContent: 'center', alignItems: 'center', marginLeft: scale(10),
  },
  ticketRemoveText: { color: colors.textMuted, fontSize: moderateFontScale(12), fontWeight: '700' },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: verticalScale(26), gap: scale(12) },
  primaryButton: { flex: 1, backgroundColor: colors.amber, padding: scale(16), borderRadius: scale(12), alignItems: 'center' },
  primaryButtonText: { color: colors.ink, fontSize: moderateFontScale(15), fontWeight: '800' },
  secondaryButton: {
    flex: 1, backgroundColor: 'transparent', padding: scale(16), borderRadius: scale(12),
    alignItems: 'center', borderWidth: 1.5, borderColor: colors.line,
  },
  secondaryButtonText: { color: colors.textPrimary, fontSize: moderateFontScale(15), fontWeight: '700' },

  // KYC result stamp screens
  stampScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: scale(32) },
  stampOuter: {
    width: scale(140), height: scale(140), borderRadius: scale(70),
    borderWidth: 3, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
    marginTop: verticalScale(8), marginBottom: verticalScale(28),
  },
  stampInner: {
    width: scale(112), height: scale(112), borderRadius: scale(56),
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  stampMark: { fontSize: moderateFontScale(32), marginBottom: verticalScale(4) },
  stampWord: { fontSize: moderateFontScale(12), fontWeight: '800', letterSpacing: 2 },
  kycTitle: { fontSize: moderateFontScale(22), fontWeight: '800', color: colors.textPrimary, marginBottom: verticalScale(10), textAlign: 'center' },
  kycSubtitle: { fontSize: moderateFontScale(14), color: colors.textMuted, textAlign: 'center', lineHeight: verticalScale(21), marginBottom: verticalScale(20), maxWidth: scale(300) },
  etaPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    paddingVertical: verticalScale(8), paddingHorizontal: scale(14), borderRadius: scale(20), marginBottom: verticalScale(28),
  },
  etaDot: { width: scale(6), height: scale(6), borderRadius: scale(3), backgroundColor: colors.amber, marginRight: scale(8) },
  etaText: { color: colors.textMuted, fontSize: moderateFontScale(12), fontWeight: '600' },
  standalonePrimaryButton: {
    backgroundColor: colors.amber,
    paddingHorizontal: scale(28),
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    alignItems: 'center',
    width: '100%',
    maxWidth: scale(300),
    marginTop: verticalScale(8),
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loaderBox: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: scale(16),
    padding: scale(28),
    alignItems: 'center',
    maxWidth: scale(320),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  loaderTitle: {
    color: colors.textPrimary,
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    marginTop: verticalScale(14),
    marginBottom: verticalScale(6),
  },
  loaderSub: {
    color: colors.textMuted,
    fontSize: moderateFontScale(12),
    textAlign: 'center',
    lineHeight: verticalScale(17),
  },

  // Vehicle Category chips
  categoryChip: {
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: scale(10),
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  categoryChipSelected: {
    backgroundColor: 'rgba(245, 197, 24, 0.15)',
    borderColor: colors.amber,
  },
  categoryChipText: {
    color: colors.textMuted,
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  categoryChipTextSelected: {
    color: colors.amber,
  },
});

