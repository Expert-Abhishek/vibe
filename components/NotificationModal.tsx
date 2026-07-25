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
import { fetchNotificationsApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Props {
  role?: 'tourist' | 'driver' | 'guide';
}

export default function NotificationModal({ role = 'tourist' }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = {
    background: isDark ? '#101014' : '#F4F5F8',
    surface: isDark ? '#1C1C22' : '#FFFFFF',
    textPrimary: isDark ? '#FFFFFF' : '#111827',
    textMuted: isDark ? '#9CA3AF' : '#6B7280',
    amber: '#F5C518',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  };

  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    const session = getUserSessionSync();
    const userId = session?.id || 'guest';
    const list = await fetchNotificationsApi(userId, role);
    if (Array.isArray(list) && list.length > 0) {
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.isRead).length || list.length);
    } else {
      // Fallback default system welcome log if database has 0 records
      const defaultLogs = [
        {
          id: 'def_1',
          title: role === 'driver' ? '🚖 Driver Dashboard Active' : (role === 'guide' ? '🚩 Guide System Online' : '🎉 Welcome to VIBE!'),
          body: 'Your account is connected to real-time dispatch server. Activity updates will appear here.',
          createdAt: new Date().toISOString(),
          isRead: false,
        }
      ];
      setNotifications(defaultLogs);
      setUnreadCount(1);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, [role]);

  const handleOpen = () => {
    setVisible(true);
    setUnreadCount(0);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.bellButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <MaterialIcons name="notifications" size={scale(22)} color={colors.amber} />
        {unreadCount > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.drawerContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                <MaterialIcons name="notifications-active" size={scale(22)} color={colors.amber} />
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Activity & Booking Alerts</Text>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={scale(22)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: verticalScale(480) }} showsVerticalScrollIndicator={false}>
              {notifications.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.notificationCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FAF9F5',
                      borderColor: colors.border,
                    }
                  ]}
                >
                  <Text style={[styles.cardTitle, { color: colors.amber }]}>{item.title}</Text>
                  <Text style={[styles.cardBody, { color: colors.textPrimary }]}>{item.body}</Text>
                  <Text style={[styles.cardTime, { color: colors.textMuted }]}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
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
    paddingHorizontal: scale(3),
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: moderateFontScale(9),
    fontWeight: '900',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  drawerContent: {
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    padding: scale(20),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: verticalScale(14),
    borderBottomWidth: 1,
    marginBottom: verticalScale(14),
  },
  headerTitle: {
    fontSize: moderateFontScale(15),
    fontWeight: '800',
  },
  closeBtn: {
    padding: scale(4),
  },
  notificationCard: {
    padding: scale(14),
    borderRadius: scale(14),
    borderWidth: 1,
    marginBottom: verticalScale(10),
  },
  cardTitle: {
    fontSize: moderateFontScale(13),
    fontWeight: '800',
    marginBottom: verticalScale(4),
  },
  cardBody: {
    fontSize: moderateFontScale(12),
    lineHeight: moderateFontScale(17),
    fontWeight: '500',
  },
  cardTime: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
    marginTop: verticalScale(6),
    textAlign: 'right',
  },
});
