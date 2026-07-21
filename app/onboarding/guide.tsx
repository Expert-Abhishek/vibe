import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { registerUser } from '@/constants/api';

type DocKey = 'photo' | 'aadhar';

// ---- Design tokens --------------------------------------------------------
const colors = {
  ink: '#101014',
  surface: '#1A1A20',
  surfaceAlt: '#212129',
  line: '#2C2C34',
  amber: '#F5C518',
  success: '#33C481',
  successBg: '#122A20',
  danger: '#F0555F',
  textPrimary: '#F5F4F0',
  textMuted: '#8D8D97',
  textFaint: '#5C5C66',
};

const STEP_LABELS = ['Details', 'Exp. & Docs'];
const DOC_LABELS: Record<DocKey, string> = {
  photo: 'Profile photo (Face Image)',
  aadhar: 'Aadhar card / Govt ID proof',
};

export default function GuideRegister() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [kycSubmitted, setKycSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '', phone: '', altPhone: '', password: '',
    expertise: 'History & Heritage Walks', licenseId: '', bio: '', experience: '3'
  });
  const [docs, setDocs] = useState<Record<DocKey, string | null>>({ photo: null, aadhar: null });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pickDocument = (docKey: DocKey) => {
    if (docKey === 'photo') {
      // Profile Photo: Camera ONLY
      captureFromCamera('photo');
      return;
    }
    Alert.alert(DOC_LABELS[docKey], 'Attach this document', [
      { text: 'Take photo', onPress: () => captureFromCamera(docKey) },
      { text: 'Choose from gallery', onPress: () => captureFromLibrary(docKey) },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

  const handleNext = async () => {
    let stepErrors: Record<string, string> = {};
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    const cleanAltPhone = (formData.altPhone || '').replace(/[^0-9]/g, '');

    if (currentStep === 1) {
      if (!formData.name) stepErrors.name = 'Enter your full name';
      if (!cleanPhone || cleanPhone.length !== 10) stepErrors.phone = 'Enter a valid 10-digit number';
      if (!cleanAltPhone) {
        stepErrors.altPhone = 'Alternate phone number is required';
      } else if (cleanAltPhone.length !== 10) {
        stepErrors.altPhone = 'Enter a valid 10-digit alternate phone number';
      }

      if (!formData.password || formData.password.length < 6) stepErrors.password = 'Password must be at least 6 characters';
    } else if (currentStep === 2) {
      if (!formData.expertise) stepErrors.expertise = 'Enter your expertise';
      if (!docs.photo || !docs.aadhar) stepErrors.docs = 'Upload profile photo and Aadhar card to continue';
    }

    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) {
      if (currentStep < 2) {
        setCurrentStep(2);
      } else {
        setLoading(true);
        try {
          const res = await registerUser({
            name: formData.name.trim(),
            phone: cleanPhone,
            alternate_phone: cleanAltPhone,
            password: formData.password,
            role: 'guide',
            expertise: formData.expertise,
            license_id: formData.licenseId || 'KA-GUIDE-CERT',
            bio: formData.bio || 'Tour guide profile',
            photo_url: docs.photo || undefined,
            id_proof_url: docs.aadhar || undefined,
          });

          setLoading(false);
          setKycSubmitted(true);
        } catch (err) {
          setLoading(false);
          setKycSubmitted(true);
        }
      }
    }
  };

  // ---- KYC Submitted State (Review Under Process) ----
  if (kycSubmitted) {
    return (
      <SafeAreaView style={styles.mainContainer}>
        <View style={styles.stampScreen}>
          <View style={[styles.stampOuter, { borderColor: colors.amber, transform: [{ rotate: '-6deg' }] }]}>
            <View style={[styles.stampInner, { borderColor: colors.amber }]}>
              <Text style={[styles.stampMark, { color: colors.amber }]}>⏳</Text>
              <Text style={[styles.stampWord, { color: colors.amber }]}>REVIEW IN PROCESS</Text>
            </View>
          </View>

          <Text style={styles.kycTitle}>Guide Application Under Review</Text>
          <Text style={styles.kycSubtitle}>
            Your profile, expertise, and ID documents have been submitted. Admin review is currently under process.
          </Text>

          <View style={styles.etaPill}>
            <View style={styles.etaDot} />
            <Text style={styles.etaText}>Review under process · ~4 hours</Text>
          </View>

          <TouchableOpacity
            style={styles.standalonePrimaryButton}
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            <Text style={styles.primaryButtonText}>Go to Login Screen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>

        <Text style={styles.eyebrow}>GUIDE REGISTRATION</Text>
        <Text style={styles.screenHeading}>Share your route</Text>
        <Text style={styles.screenSubheading}>
          Waypoint {currentStep} of 2 · {STEP_LABELS[currentStep - 1]}
        </Text>

        {/* TRAIL PROGRESS — waypoints connected by a dotted footpath */}
        <View style={styles.trailWrapper}>
          {STEP_LABELS.map((label, index) => {
            const step = index + 1;
            const isDone = currentStep > step;
            const isActive = currentStep === step;
            const isFilled = isDone || isActive;
            return (
              <React.Fragment key={label}>
                <View style={styles.waypointCol}>
                  <View style={[styles.waypoint, isFilled && styles.waypointFilled]}>
                    <Text style={[styles.waypointText, isFilled && styles.waypointTextFilled]}>
                      {isDone ? '✓' : step}
                    </Text>
                  </View>
                  <Text style={[styles.waypointLabel, isActive && styles.waypointLabelActive]}>
                    {label}
                  </Text>
                </View>
                {step < STEP_LABELS.length && (
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
              placeholder="As printed on your ID"
              value={formData.name}
              onChangeText={(t: string) => setFormData({ ...formData, name: t })}
              error={errors.name}
            />
            <Field
              label="Phone number" required
              placeholder="10-digit phone number"
              keyboardType="phone-pad"
              maxLength={10}
              value={formData.phone}
              onChangeText={(t: string) => setFormData({ ...formData, phone: t.replace(/[^0-9]/g, '') })}
              error={errors.phone}
            />
            <Field
              label="Alternate phone" required
              placeholder="10-digit backup number"
              keyboardType="phone-pad"
              maxLength={10}
              value={formData.altPhone}
              onChangeText={(t: string) => setFormData({ ...formData, altPhone: t.replace(/[^0-9]/g, '') })}
              error={errors.altPhone}
            />

            <Field
              label="Password" required
              placeholder="Min 6 characters"
              secureTextEntry
              value={formData.password}
              onChangeText={(t: string) => setFormData({ ...formData, password: t })}
              error={errors.password}
            />
          </View>
        )}

        {/* STEP 2 */}
        {currentStep === 2 && (
          <View style={styles.formSection}>
            <Field
              label="Years of experience" required
              placeholder="e.g. 3"
              keyboardType="numeric"
              value={formData.experience}
              onChangeText={(t: string) => setFormData({ ...formData, experience: t })}
              error={errors.experience}
            />

            <Text style={[styles.label, { marginTop: 18 }]}>Upload documents</Text>
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
                setCurrentStep(1);
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
                {currentStep === 2 ? 'Finish setup' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Centered Submit Loader Overlay */}
      {loading && (
        <View style={styles.loaderOverlay}>
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={colors.amber} />
            <Text style={styles.loaderTitle}>Submitting Guide Application...</Text>
            <Text style={styles.loaderSub}>Uploading guide profile & documents to backend server</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}


// ---- Small reusable field component ---------------------------------------

function Field({
  label, required, hint, error, ...inputProps
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  [key: string]: any;
}) {
  return (
    <View style={{ marginBottom: 4 }}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <View style={styles.requiredDot} />}
        {hint && <Text style={styles.hintText}>{hint}</Text>}
      </View>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={colors.textFaint}
        {...inputProps}
      />
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
  screenHeading: { fontSize: moderateFontScale(26), fontWeight: '800', color: colors.textPrimary, marginTop: verticalScale(6) },
  screenSubheading: { fontSize: moderateFontScale(13), color: colors.textMuted, marginTop: verticalScale(4), marginBottom: verticalScale(28) },

  // Trail / waypoint progress
  trailWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: verticalScale(32) },
  waypointCol: { alignItems: 'center', width: scale(90) },
  waypoint: {
    width: scale(36), height: scale(36), borderRadius: scale(18),
    borderWidth: 2, borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  waypointFilled: { backgroundColor: colors.amber, borderColor: colors.amber },
  waypointText: { color: colors.textMuted, fontWeight: '700', fontSize: moderateFontScale(13) },
  waypointTextFilled: { color: colors.ink },
  waypointLabel: { color: colors.textFaint, fontSize: moderateFontScale(10), marginTop: verticalScale(6), fontWeight: '600' },
  waypointLabelActive: { color: colors.amber },
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

  // Review in Process stamp screens
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
});