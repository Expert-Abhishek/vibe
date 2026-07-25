import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, StyleProp, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { moderateFontScale, scale } from '@/constants/responsive';
import { notificationStore, useNotificationStore } from '../store/notificationStore';

interface NotificationIconProps {
  userId?: string;
  role?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  iconColor?: string;
}

export default function NotificationIcon({
  userId,
  role = 'driver',
  onPress,
  style,
  iconSize = scale(22),
  iconColor,
}: NotificationIconProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { unreadCount } = useNotificationStore();

  const handlePress = async () => {
    // 1. Trigger action to mark all notifications as read & reset unreadCount to 0
    await notificationStore.markAllAsRead(userId, role);

    // 2. Invoke optional parent onPress callback
    if (onPress) {
      onPress();
    }
  };

  const defaultIconColor = iconColor || '#F5C518';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' },
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Notifications button"
    >
      <MaterialIcons name="notifications" size={iconSize} color={defaultIconColor} />

      {/* Conditionally render red counter badge ONLY when unreadCount > 0 */}
      {unreadCount > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    top: scale(2),
    right: scale(2),
    backgroundColor: '#EF4444',
    borderRadius: scale(8),
    minWidth: scale(16),
    height: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(4),
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: moderateFontScale(9),
    fontWeight: '900',
  },
});
