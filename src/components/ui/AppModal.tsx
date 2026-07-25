import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';

export type ModalVariant = 'warning' | 'error' | 'success' | 'info';

export interface AppModalProps {
  visible: boolean;
  title: string;
  description?: string;
  variant?: ModalVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function AppModal({
  visible,
  title,
  description,
  variant = 'info',
  confirmText = 'OK',
  cancelText,
  onConfirm,
  onCancel,
  onClose,
  style,
}: AppModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!visible) return null;

  const variantConfig = {
    warning: {
      icon: 'warning' as const,
      color: '#F59E0B',
      bgColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
    },
    error: {
      icon: 'error-outline' as const,
      color: '#EF4444',
      bgColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
    },
    success: {
      icon: 'check-circle-outline' as const,
      color: '#10B981',
      bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
    },
    info: {
      icon: 'info-outline' as const,
      color: '#3B82F6',
      bgColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#DBEAFE',
    },
  };

  const config = variantConfig[variant];

  const colors = {
    surface: isDark ? '#1C1C24' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textMuted: isDark ? '#9CA3AF' : '#6B7280',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    cancelBg: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
  };

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    if (onClose) onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
          {/* Icon Badge */}
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            <MaterialIcons name={config.icon} size={scale(28)} color={config.color} />
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {description ? (
            <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
          ) : null}

          {/* Buttons Row */}
          <View style={styles.buttonRow}>
            {cancelText ? (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.cancelBg, flex: 1 }]}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnText, { color: colors.textPrimary }]}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: config.color, flex: 1 }]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalCard: {
    width: '100%',
    maxWidth: scale(340),
    borderRadius: scale(20),
    padding: scale(20),
    alignItems: 'center',
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  iconContainer: {
    width: scale(54),
    height: scale(54),
    borderRadius: scale(27),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(14),
  },
  title: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: verticalScale(6),
  },
  description: {
    fontSize: moderateFontScale(12),
    textAlign: 'center',
    lineHeight: moderateFontScale(17),
    marginBottom: verticalScale(18),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: scale(10),
    width: '100%',
    marginTop: verticalScale(6),
  },
  btn: {
    height: scale(42),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(12),
  },
  btnText: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
  },
});
