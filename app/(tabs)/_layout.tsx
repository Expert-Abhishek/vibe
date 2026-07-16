import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function TabIconButton({ routeName, isFocused, activeColor, inactiveColor }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.25 : 1,
        useNativeDriver: true,
        bounciness: 9,
        speed: 12,
      }),
      Animated.spring(bounceAnim, {
        toValue: isFocused ? -verticalScale(4) : 0,
        useNativeDriver: true,
        bounciness: 8,
        speed: 12,
      })
    ]).start();
  }, [isFocused]);

  const getIconName = (name: string) => {
    if (name === 'index') return 'home';
    if (name === 'trips') return 'navigation';
    if (name === 'wallet') return 'account-balance-wallet';
    if (name === 'driver-wallet') return 'drive-eta';
    if (name === 'guide-wallet') return 'explore';
    if (name === 'profile') return 'person';
    return 'home';
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }, { translateY: bounceAnim }], alignItems: 'center' }}>
      <MaterialIcons
        name={getIconName(routeName)}
        size={scale(24)}
        color={isFocused ? activeColor : inactiveColor}
      />
    </Animated.View>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = {
    background: isDark ? 'rgba(26, 26, 32, 0.85)' : 'rgba(255, 255, 255, 0.85)',
    border: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    inactive: isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(16, 16, 20, 0.5)',
    active: '#F5C518',
  };

  const visibleRoutes = state.routes.filter((route: any) => {
    const { options } = descriptors[route.key];
    return options.href !== null;
  });

  const tabWidth = (SCREEN_WIDTH - scale(40)) / visibleRoutes.length;

  const activeRoute = state.routes[state.index];
  const visibleActiveIndex = visibleRoutes.findIndex((r: any) => r.key === activeRoute.key);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visibleActiveIndex !== -1) {
      Animated.spring(slideAnim, {
        toValue: visibleActiveIndex * tabWidth,
        useNativeDriver: true,
        bounciness: 8,
        speed: 12,
      }).start();
    }
  }, [visibleActiveIndex, tabWidth]);

  return (
    <View style={[
      styles.tabBarContainer,
      {
        backgroundColor: colors.background,
        borderColor: colors.border,
      }
    ]}>
      {/* Sliding water-drop background pill */}
      <Animated.View style={[
        styles.waterDrop,
        {
          width: tabWidth - scale(16),
          transform: [{ translateX: Animated.add(slideAnim, scale(8)) }],
          backgroundColor: isDark ? 'rgba(245, 197, 24, 0.15)' : 'rgba(245, 197, 24, 0.18)',
        }
      ]} />

      {visibleRoutes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = visibleActiveIndex === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const label = options.title !== undefined ? options.title : route.name;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            activeOpacity={0.8}
            style={styles.tabButton}
          >
            <TabIconButton
              routeName={route.name}
              isFocused={isFocused}
              activeColor={colors.active}
              inactiveColor={colors.inactive}
            />
            <Text style={[
              styles.tabLabel,
              { color: isFocused ? colors.active : colors.inactive }
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
        }}
      />
      <Tabs.Screen
        name="driver-wallet"
        options={{
          title: 'Dr. Wallet',
        }}
      />
      <Tabs.Screen
        name="guide-wallet"
        options={{
          title: 'Gu. Wallet',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: scale(20),
    left: scale(20),
    right: scale(20),
    borderWidth: 1,
    borderRadius: scale(28),
    height: verticalScale(66),
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  waterDrop: {
    position: 'absolute',
    height: verticalScale(48),
    borderRadius: scale(24),
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  tabLabel: {
    fontSize: moderateFontScale(10),
    fontWeight: '700',
    marginTop: verticalScale(2),
  },
});
