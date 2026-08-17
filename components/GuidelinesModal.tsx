import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserSessionSync } from '@/constants/authStore';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface GuidelinesModalProps {
  role?: 'driver' | 'tourist' | 'guide';
}

const DRIVER_NOTES = [
  'Traffic rules should be followed, we are not responsible for your negligence .',
  'If you got trouble from costumer side we need video or audio proof or else we can\'t help you .',
  'Unnecessary violence are not encouraged or else we may have to take the legal action against you.',
  'If any major breakdown of vechile we arrange the substitute for your help if you contact customer care.',
  'The substitute amount will be paid by your ride or else you can make your own alternative for costumer to avoid your cut',
  'As soon as booking was accepted by your side the platform fee will be deducted from your wallet ( No refund after confirming the ride).',
  'In case of cancellation you need to call customer care for your refund (atleast you need to wait for 5 min)',
  'In the only genuine case the platform fee will be refunded.',
];

const CUSTOMER_NOTES = [
  'Most of the places will be closed by 6pm.',
  'Please make sure that don\'t spend too much time in one place.',
  'If the places were closed we are not responsible for that.',
  'Do not rude with the driver.',
  'In case of any problem please contact costumer care.',
  'After confirming the ride by the driver. If want cancellation it will be only done by costumer care.',
];

export default function GuidelinesModal({ role = 'tourist' }: GuidelinesModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [visible, setVisible] = useState(false);

  const colors = {
    surface: isDark ? '#1C1C22' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#1E293B',
    textMuted: isDark ? '#9CA3AF' : '#64748B',
    amber: '#F5C518',
    border: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
    cardBg: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
  };

  useEffect(() => {
    checkGuidelinesAccepted();
  }, [role]);

  const checkGuidelinesAccepted = async () => {
    try {
      const session = getUserSessionSync();
      const userId = session?.id || 'guest';
      const userRole = session?.role || role;
      const key = 'guidelines_accepted_' + userId + '_' + userRole;
      const accepted = await AsyncStorage.getItem(key);
      if (!accepted) {
        setVisible(true);
      }
    } catch (e) {
      setVisible(true);
    }
  };

  const handleAccept = async () => {
    try {
      const session = getUserSessionSync();
      const userId = session?.id || 'guest';
      const userRole = session?.role || role;
      const key = 'guidelines_accepted_' + userId + '_' + userRole;
      await AsyncStorage.setItem(key, 'true');
    } catch (e) {}
    setVisible(false);
  };

  const session = getUserSessionSync();
  const currentRole = session?.role || role;
  const isDriver = currentRole === 'driver';
  const notesList = isDriver ? DRIVER_NOTES : CUSTOMER_NOTES;
  const titleText = isDriver ? "Driver's Note" : 'Customer Note';

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleAccept}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.amber }]}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialIcons name={isDriver ? 'local-taxi' : 'info-outline'} size={scale(24)} color="#101010" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{titleText}</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Please review and acknowledge the guidelines before using Vibzz.
              </Text>
            </View>
          </View>

          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {notesList.map((item, index) => (
              <View key={index} style={[styles.noteRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={styles.badgeNumber}>
                  <Text style={styles.badgeText}>{index + 1}</Text>
                </View>
                <Text style={[styles.noteText, { color: colors.textPrimary }]}>{item}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.okButton} activeOpacity={0.85} onPress={handleAccept}>
            <Text style={styles.okButtonText}>OK, I Understand</Text>
            <MaterialIcons name="check-circle" size={scale(20)} color="#101010" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(18),
  },
  modalCard: {
    width: '100%',
    maxHeight: '82%',
    borderRadius: scale(24),
    borderWidth: 1.5,
    padding: scale(20),
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    marginBottom: verticalScale(14),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 197, 24, 0.2)',
  },
  iconCircle: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: moderateFontScale(20),
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: moderateFontScale(11),
    lineHeight: moderateFontScale(16),
    marginTop: verticalScale(2),
  },
  scrollList: {
    marginBottom: verticalScale(16),
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: scale(12),
    borderRadius: scale(14),
    borderWidth: 1,
    marginBottom: verticalScale(10),
    gap: scale(10),
  },
  badgeNumber: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(2),
  },
  badgeText: {
    color: '#101010',
    fontSize: moderateFontScale(11),
    fontWeight: '800',
  },
  noteText: {
    flex: 1,
    fontSize: moderateFontScale(13),
    lineHeight: moderateFontScale(19),
    fontWeight: '500',
  },
  okButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(16),
    height: verticalScale(50),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
  },
  okButtonText: {
    color: '#101010',
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
});
