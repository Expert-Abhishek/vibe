import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getUserSessionSync } from '@/constants/authStore';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/hooks/use-language';

interface GuidelinesModalProps {
  role?: 'driver' | 'tourist' | 'guide';
}

const NOTES_DATA = {
  driver: {
    en: {
      title: "Driver's Note",
      subtitle: 'Please review and acknowledge the guidelines before using Vibzz.',
      button: 'OK, I Understand',
      notes: [
        'Traffic rules should be followed, we are not responsible for your negligence.',
        "If you get trouble from customer side we need video or audio proof or else we can't help you.",
        'Unnecessary violence is not encouraged, otherwise legal action will be taken against you.',
        'If any major breakdown of vehicle happens, we arrange a substitute if you contact customer care.',
        'The substitute amount will be deducted from your ride fare, or you can arrange an alternative for customer to avoid your cut.',
        'As soon as booking is accepted by you, the platform fee will be deducted from your wallet (No refund after confirming the ride).',
        'In case of cancellation you need to call customer care for your refund (must wait at least 5 minutes).',
        'The platform fee will be refunded only in genuine verified cases.',
      ],
    },
    kn: {
      title: 'ಚಾಲಕರ ಸೂಚನೆ',
      subtitle: 'ದಯವಿಟ್ಟು ವಿಬ್ಜ್ ಬಳಸುವ ಮೊದಲು ಮಾರ್ಗಸೂಚಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಒಪ್ಪಿಕೊಳ್ಳಿ.',
      button: 'ಸರಿ, ನನಗೆ ಅರ್ಥವಾಯಿತು',
      notes: [
        'ಸಂಚಾರ ನಿಯಮಗಳನ್ನು ಕಡ್ಡಾಯವಾಗಿ ಪಾಲಿಸಬೇಕು, ನಿಮ್ಮ ನಿರ್ಲಕ್ಷ್ಯಕ್ಕೆ ನಾವು ಜವಾಬ್ದಾರರಲ್ಲ.',
        'ಗ್ರಾಹಕರಿಂದ ಯಾವುದೇ ತೊಂದರೆ ಉಂಟಾದರೆ ವಿಡಿಯೋ ಅಥವಾ ಆಡಿಯೋ ಸಾಕ್ಷ್ಯ ಅಗತ್ಯ, ಇಲ್ಲದಿದ್ದರೆ ನಾವು ಸಹಾಯ ಮಾಡಲು ಸಾಧ್ಯವಿಲ್ಲ.',
        'ಅನಗತ್ಯ ಹಿಂಸಾಚಾರವನ್ನು ಪ್ರೋತ್ಸಾಹಿಸಲಾಗುವುದಿಲ್ಲ, ತಪ್ಪಿದರೆ ನಿಮ್ಮ ವಿರುದ್ಧ ಕಾನೂನು ಕ್ರಮ ಕೈಗೊಳ್ಳಲಾಗುತ್ತದೆ.',
        'ವಾಹನದಲ್ಲಿ ಯಾವುದೇ ಪ್ರಮುಖ ದೋಷ ಉಂಟಾದರೆ, ನೀವು ಗ್ರಾಹಕ ಬೆಂಬಲವನ್ನು ಸಂಪರ್ಕಿಸಿದರೆ ಬದಲಿ ವಾಹನ ವ್ಯವಸ್ಥೆ ಮಾಡಲಾಗುತ್ತದೆ.',
        'ಬದಲಿ ಮೊತ್ತವನ್ನು ನಿಮ್ಮ ಸವಾರಿ ದರದಿಂದ ಕಡಿತಗೊಳಿಸಲಾಗುತ್ತದೆ, ಅಥವಾ ಕಡಿತವನ್ನು ತಪ್ಪಿಸಲು ನೀವೇ ಗ್ರಾಹಕರಿಗೆ ಪರ್ಯಾಯ ವ್ಯವಸ್ಥೆ ಮಾಡಬಹುದು.',
        'ಬುಕಿಂಗ್ ಸ್ವೀಕರಿಸಿದ ತಕ್ಷಣ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಶುಲ್ಕವನ್ನು ನಿಮ್ಮ ವ್ಯಾಲೆಟ್‌ನಿಂದ ಕಡಿತಗೊಳಿಸಲಾಗುತ್ತದೆ (ಸವಾರಿ ಖಚಿತಪಡಿಸಿದ ನಂತರ ಮರುಪಾವತಿ ಇರುವುದಿಲ್ಲ).',
        'ರದ್ದಾದ ಸಂದರ್ಭದಲ್ಲಿ ಮರುಪಾವತಿಗಾಗಿ ನೀವು ಗ್ರಾಹಕ ಬೆಂಬಲಕ್ಕೆ ಕರೆ ಮಾಡಬೇಕು (ಕನಿಷ್ಠ 5 ನಿಮಿಷ ಕಾಯಬೇಕು).',
        'ಕೇವಲ ನೈಜ ಪರಿಶೀಲಿಸಿದ ಸಂದರ್ಭಗಳಲ್ಲಿ ಮಾತ್ರ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಶುಲ್ಕವನ್ನು ಮರುಪಾವತಿಸಲಾಗುತ್ತದೆ.',
      ],
    },
  },
  guide: {
    en: {
      title: "Guide's Note",
      subtitle: 'Please review and acknowledge the guidelines before using Vibzz.',
      button: 'OK, I Understand',
      notes: [
        'Always ensure tourist safety and strictly adhere to local forest and heritage regulations.',
        'Be punctual and provide courteous, accurate guidance about all historical and tourist locations.',
        'In case of any dispute, trouble, or emergency, immediately notify Vibzz customer care.',
        'Unnecessary arguments or misconduct with tourists will lead to immediate suspension and legal review.',
        'Platform guidelines and professional conduct must be maintained throughout the tour.',
      ],
    },
    kn: {
      title: 'ಮಾರ್ಗದರ್ಶಿ ಸೂಚನೆ',
      subtitle: 'ದಯವಿಟ್ಟು ವಿಬ್ಜ್ ಬಳಸುವ ಮೊದಲು ಮಾರ್ಗಸೂಚಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಒಪ್ಪಿಕೊಳ್ಳಿ.',
      button: 'ಸರಿ, ನನಗೆ ಅರ್ಥವಾಯಿತು',
      notes: [
        'ಯಾವಾಗಲೂ ಪ್ರವಾಸಿಗರ ಸುರಕ್ಷತೆಯನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ ಮತ್ತು ಸ್ಥಳೀಯ ಅರಣ್ಯ ಹಾಗೂ ಸ್ಮಾರಕ ನಿಯಮಗಳನ್ನು ಪಾಲಿಸಿ.',
        'ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಹಾಜರಾಗಿ ಮತ್ತು ಎಲ್ಲಾ ಪ್ರವಾಸಿ ತಾಣಗಳ ಬಗ್ಗೆ ಸೌಜನ್ಯಯುತ, ನಿಖರವಾದ ಮಾರ್ಗದರ್ಶನ ನೀಡಿ.',
        'ಯಾವುದೇ ವಿವಾದ, ತೊಂದರೆ ಅಥವಾ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಲ್ಲಿ ತಕ್ಷಣ ವಿಬ್ಜ್ ಗ್ರಾಹಕ ಬೆಂಬಲವನ್ನು ಸಂಪರ್ಕಿಸಿ.',
        'ಪ್ರವಾಸಿಗರೊಂದಿಗೆ ಯಾವುದೇ ಅನುಚಿತ ವರ್ತನೆ ಅಥವಾ ಜಗಳ ನಡೆಸಿದರೆ ತಕ್ಷಣ ಖಾತೆ ಅಮಾನತು ಮತ್ತು ಕಾನೂನು ಕ್ರಮ ಜರುಗಿಸಲಾಗುವುದು.',
        'ಪ್ರವಾಸದ ಉದ್ದಕ್ಕೂ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ನಿಯಮಗಳು ಮತ್ತು ವೃತ್ತಿಪರ ನಡವಳಿಕೆಯನ್ನು ಕಡ್ಡಾಯವಾಗಿ ಕಾಪಾಡಿಕೊಳ್ಳಿ.',
      ],
    },
  },
  tourist: {
    en: {
      title: 'Customer Note',
      subtitle: 'Please review and acknowledge the guidelines before using Vibzz.',
      button: 'OK, I Understand',
      notes: [
        'Most sightseeing places and viewpoints are closed by 6:00 PM.',
        "Please make sure you don't spend too much time in one place to cover your planned itinerary.",
        'If tourist spots or gates are closed on arrival, Vibzz is not responsible.',
        'Do not be rude or argue with the driver or tour guide.',
        'In case of any issues, emergency, or pricing dispute, please contact Vibzz customer care immediately.',
        'After confirming a ride, cancellations and refunds can only be processed through customer care.',
      ],
    },
    kn: {
      title: 'ಗ್ರಾಹಕರ ಸೂಚನೆ',
      subtitle: 'ದಯವಿಟ್ಟು ವಿಬ್ಜ್ ಬಳಸುವ ಮೊದಲು ಮಾರ್ಗಸೂಚಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಒಪ್ಪಿಕೊಳ್ಳಿ.',
      button: 'ಸರಿ, ನನಗೆ ಅರ್ಥವಾಯಿತು',
      notes: [
        'ಹೆಚ್ಚಿನ ಪ್ರವಾಸಿ ತಾಣಗಳು ಮತ್ತು ವ್ಯೂಪಾಯಿಂಟ್‌ಗಳು ಸಂಜೆ 6:00 ಗಂಟೆಯೊಳಗೆ ಮುಚ್ಚಲ್ಪಡುತ್ತವೆ.',
        'ನಿಮ್ಮ ಯೋಜಿತ ಪ್ರವಾಸವನ್ನು ಪೂರ್ಣಗೊಳಿಸಲು ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ ಹೆಚ್ಚು ಸಮಯ ಕಳೆಯದಂತೆ ನೋಡಿಕೊಳ್ಳಿ.',
        'ಪ್ರವಾಸಿ ತಾಣಗಳು ಅಥವಾ ಗೇಟ್‌ಗಳು ಮುಚ್ಚಿದ್ದರೆ ಅದಕ್ಕೆ ವಿಬ್ಜ್ ಸಂಸ್ಥೆ ಜವಾಬ್ದಾರರಾಗಿರುವುದಿಲ್ಲ.',
        'ಚಾಲಕರು ಅಥವಾ ಟೂರ್ ಗೈಡ್ ಜೊತೆ ಅಸಭ್ಯವಾಗಿ ವರ್ತಿಸಬೇಡಿ ಅಥವಾ ಜಗಳವಾಡಬೇಡಿ.',
        'ಯಾವುದೇ ಸಮಸ್ಯೆ, ತುರ್ತು ಅಥವಾ ದರದ ಬಗ್ಗೆ ಗೊಂದಲವಿದ್ದರೆ ತಕ್ಷಣ ವಿಬ್ಜ್ ಗ್ರಾಹಕ ಬೆಂಬಲವನ್ನು ಸಂಪರ್ಕಿಸಿ.',
        'ಸವಾರಿಯನ್ನು ಖಚಿತಪಡಿಸಿದ ನಂತರ, ರದ್ದುಗೊಳಿಸುವಿಕೆ ಮತ್ತು ಮರುಪಾವತಿಯನ್ನು ಕೇವಲ ಗ್ರಾಹಕ ಬೆಂಬಲದ ಮೂಲಕ ಮಾತ್ರ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಬಹುದು.',
      ],
    },
  },
};

export default function GuidelinesModal({ role = 'tourist' }: GuidelinesModalProps) {
  const colorScheme = useColorScheme();
  const [appLang] = useLanguage();
  const isDark = colorScheme === 'dark';
  const [visible, setVisible] = useState(true);

  const colors = {
    surface: isDark ? '#1C1C22' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#1E293B',
    textMuted: isDark ? '#9CA3AF' : '#64748B',
    amber: '#F5C518',
    border: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
    cardBg: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
  };

  const handleAccept = () => {
    setVisible(false);
  };

  const session = getUserSessionSync();
  const currentRole = (session?.role || role) as 'driver' | 'guide' | 'tourist';
  const roleCategory = currentRole === 'driver' ? 'driver' : currentRole === 'guide' ? 'guide' : 'tourist';
  const langKey = appLang === 'kn' ? 'kn' : 'en';

  const roleNotesData = NOTES_DATA[roleCategory] || NOTES_DATA.tourist;
  const content = roleNotesData[langKey] || roleNotesData.en;

  const getHeaderIcon = () => {
    if (roleCategory === 'driver') return 'local-taxi';
    if (roleCategory === 'guide') return 'map';
    return 'info-outline';
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleAccept}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.amber }]}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialIcons name={getHeaderIcon()} size={scale(24)} color="#101010" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{content.title}</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {content.subtitle}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {content.notes.map((item, index) => (
              <View key={index} style={[styles.noteRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={styles.badgeNumber}>
                  <Text style={styles.badgeText}>{index + 1}</Text>
                </View>
                <Text style={[styles.noteText, { color: colors.textPrimary }]}>{item}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.okButton} activeOpacity={0.85} onPress={handleAccept}>
            <Text style={styles.okButtonText}>{content.button}</Text>
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

