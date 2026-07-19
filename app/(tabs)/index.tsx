import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminState } from '../admin-state';

const rides = [
  { key: '5seater', name: '5 Seater', desc: 'Comfort & Style', image: require('@/assets/images/sedan.png') },
  { key: '7seater', name: '7 Seater', desc: 'Compact & Swift', image: require('@/assets/images/hatch.png') },
  { key: '4x4jeep', name: '4*4 Jeep', desc: 'Rugged Offroad', image: require('@/assets/images/thar.png') },
  { key: 'auto', name: 'Auto', desc: 'Local Explorer', image: require('@/assets/images/auto.png') },
];

export default function HomeScreen() {
  const router = useRouter();
  const [selectedRide, setSelectedRide] = useState<string>('4x4jeep');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Instant Booking Switch (global state sync)
  const [instantEnabled, setInstantEnabled] = useState<boolean>(adminState.instantBookingEnabled);

  const slideAnim = React.useRef(new Animated.Value(adminState.instantBookingEnabled ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: instantEnabled ? 1 : 0,
      tension: 60,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [instantEnabled]);

  const handleToggle = (val: boolean) => {
    setInstantEnabled(val);
    adminState.instantBookingEnabled = val;
  };

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: verticalScale(110) }]} showsVerticalScrollIndicator={false}>

        {/* BRAND LOGO, NAME & INSTANT TOGGLE HEADER */}
        <View style={styles.brandHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.logoWrapper}>
              <MaterialIcons name="local-taxi" size={scale(18)} color="#101014" />
            </View>
            <Text style={[styles.brandName, { color: colors.textPrimary }]}>Vibzz</Text>
          </View>


        </View>

        {/* TOP BAR: Search Bar (100%) */}
        <View style={styles.topActionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.searchBarFull, { borderColor: colors.border }]}
            onPress={() => router.push('/search-location' as any)}
          >
            <MaterialIcons name="search" size={scale(20)} color={colors.amber} style={styles.searchIcon} />
            <Text style={{ color: colors.textMuted, fontSize: moderateFontScale(13), marginLeft: scale(6), flex: 1 }} numberOfLines={1}>
              Where to? Search location...
            </Text>
          </TouchableOpacity>
        </View>

        {/* INSTANT / PRE-BOOKING TOGGLE */}
        <View style={styles.bookingTypeRow}>
          <Animated.View
            style={[
              styles.bookingActiveBg,
              {
                left: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['1%', '51%'],
                }),
              },
            ]}
          />
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.bookingTab}
            onPress={() => handleToggle(false)}
          >
            <Text
              style={[
                styles.bookingLabel,
                !instantEnabled
                  ? { color: colors.amber, fontSize: moderateFontScale(15), fontWeight: '800' }
                  : { color: colors.textMuted, fontSize: moderateFontScale(13), fontWeight: '600' }
              ]}
            >
              Pre Booking
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.bookingTab}
            onPress={() => handleToggle(true)}
          >
            <Text
              style={[
                styles.bookingLabel,
                instantEnabled
                  ? { color: colors.amber, fontSize: moderateFontScale(15), fontWeight: '800' }
                  : { color: colors.textMuted, fontSize: moderateFontScale(13), fontWeight: '600' }
              ]}
            >
              Instant
            </Text>
          </TouchableOpacity>
        </View>

        {/* Guides & Custom Trip Side-by-Side (50% each) */}
        <View style={styles.servicesGridRow}>
          {/* Guide Card (50%) */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.halfCard}
            onPress={() => router.push('/guides' as any)}
          >
            <ImageBackground
              source={require('@/assets/images/guide_bg.png')}
              style={styles.halfCardBg}
              imageStyle={{ borderRadius: scale(20) }}
            >
              <View style={styles.overlay} />
              <View style={styles.compassBadge}>
                <MaterialIcons name="explore" size={scale(18)} color="#F5C518" />
              </View>
              <View style={styles.halfCardTextCol}>
                <Text style={styles.halfCardTitle}>Need a Guide</Text>
                <Text style={styles.halfCardSubtitle}>Local experts</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          {/* Make Your Own Trip Card (50%) */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.halfCard}
            onPress={() => router.push('/make-trip' as any)}
          >
            <ImageBackground
              source={require('@/assets/images/karnataka_bg.png')}
              style={styles.halfCardBg}
              imageStyle={{ borderRadius: scale(20) }}
            >
              <View style={styles.overlay} />
              <View style={styles.halfCardTextCol}>
                <Text style={styles.halfCardTitle}>Custom Trip</Text>
                <Text style={styles.halfCardSubtitle}>Plan Itinerary</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        {/* EXPLORE KARNATAKA BANNER (Explore Karnataka / Plan Route banner) */}
        <View style={styles.karnatakaBanner}>
          <ImageBackground
            source={require('@/assets/images/karnataka_bg.png')}
            style={styles.karnatakaBannerBg}
            imageStyle={{ borderRadius: scale(24) }}
          >
            <View style={styles.overlayStrong} />
            <View style={styles.karnatakaContent}>
              <Text style={styles.karnatakaText}>{"Let's explore the beauty or thrill in Karnataka"}</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.planRouteBtn}
                onPress={() => router.push('/plan-route' as any)}
              >
                <Text style={styles.planRouteBtnText}>Plan Route</Text>
              </TouchableOpacity>
            </View>
            {/* Cutout SUV graphic placed overlapping on bottom right */}
            <Image
              source={require('@/assets/images/thar.png')}
              style={styles.karnatakaSUVGraphic}
              resizeMode="contain"
            />
          </ImageBackground>
        </View>

        {/* CHOOSE YOUR RIDE */}
        <View style={styles.chooseRideHeader}>
          <Text style={styles.sectionTitleNoMargin}>Choose Your Ride</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.rideSlider}
          contentContainerStyle={styles.rideSliderContent}
        >
          {rides.map((ride) => {
            const isSelected = selectedRide === ride.key;
            return (
              <TouchableOpacity
                key={ride.key}
                activeOpacity={0.9}
                style={[
                  styles.rideCard,
                  { backgroundColor: colors.surfaceCard, borderColor: isSelected ? '#F5C518' : colors.border },
                ]}
                onPress={() => {
                  setSelectedRide(ride.key);
                  router.push({ pathname: '/cars' as any, params: { selectedRide: ride.key } });
                }}
              >
                {isSelected && <View style={styles.selectedDot} />}
                <View style={styles.carImageWrapper}>
                  <Image
                    source={ride.image}
                    style={styles.carCutoutImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.rideCardName, isSelected ? { color: '#F5C518' } : { color: colors.textPrimary }]}>
                  {ride.name}
                </Text>
                <Text style={[styles.rideCardDesc, isSelected ? { color: 'rgba(245,197,24,0.7)' } : { color: colors.textMuted }]}>
                  {isSelected ? 'Selected' : ride.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>



        {/* VIBE WITH US FOOTER CARD */}
        <View style={styles.footerVibeCard}>
          <View style={styles.waveOverlay} />
          <Text style={styles.vibeCardTitle}>#MAKE YOUR OWN VIBE WITH US</Text>
          <Text style={styles.vibeCardSub}>Made in India</Text>
          <Text style={styles.vibeCardCrafted}>Crafted in Karnataka</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101014',
  },
  scrollContent: {
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(110),
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(14),
    marginBottom: verticalScale(18),
    gap: scale(6),
  },
  searchBarCol: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: scale(25),
    paddingHorizontal: scale(14),
    height: verticalScale(44),
    flex: 0.9,
  },
  searchIcon: {
    marginRight: scale(6),
  },
  bookingTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(20),
    backgroundColor: 'rgba(255,255,255,0.03)',
    width: '100%',
    height: verticalScale(48),
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
    padding: scale(4),
  },
  bookingTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  bookingActiveBg: {
    position: 'absolute',
    top: scale(4),
    bottom: scale(4),
    width: '48%',
    borderRadius: scale(20),
    backgroundColor: 'rgba(245, 197, 24, 0.12)',
    borderWidth: 1.2,
    borderColor: 'rgba(245, 197, 24, 0.35)',
    shadowColor: '#F5C518',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 1,
  },
  bookingLabel: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },

  servicesGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    height: verticalScale(140),
    marginBottom: verticalScale(20),
  },
  halfCard: {
    width: '48.5%',
    height: '100%',
  },
  halfCardBg: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: scale(14),
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 16, 20, 0.55)',
    borderRadius: scale(20),
  },
  overlayStrong: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 16, 20, 0.65)',
    borderRadius: scale(24),
  },
  compassBadge: {
    position: 'absolute',
    top: scale(12),
    right: scale(12),
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(16, 16, 20, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfCardTextCol: {
    zIndex: 2,
  },
  halfCardTitle: {
    color: '#ffffff',
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  halfCardSubtitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    marginTop: verticalScale(2),
  },
  karnatakaBanner: {
    width: '100%',
    height: verticalScale(160),
    marginBottom: verticalScale(24),
  },
  karnatakaBannerBg: {
    flex: 1,
    padding: scale(20),
    justifyContent: 'center',
  },
  karnatakaContent: {
    zIndex: 2,
    width: '70%',
  },
  karnatakaText: {
    color: '#ffffff',
    fontSize: moderateFontScale(20),
    fontWeight: '800',
    lineHeight: moderateFontScale(26),
  },
  planRouteBtn: {
    backgroundColor: '#F5C518',
    borderRadius: scale(18),
    paddingVertical: verticalScale(7),
    paddingHorizontal: scale(16),
    alignSelf: 'flex-start',
    marginTop: verticalScale(10),
  },
  planRouteBtnText: {
    color: '#101010',
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  karnatakaSUVGraphic: {
    position: 'absolute',
    right: scale(-10),
    bottom: verticalScale(-8),
    width: scale(150),
    height: verticalScale(110),
    zIndex: 3,
  },
  chooseRideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(14),
  },
  sectionTitleNoMargin: {
    color: '#F5C518',
    fontSize: moderateFontScale(18),
    fontWeight: '700',
  },
  rideSlider: {
    marginBottom: verticalScale(14),
  },
  rideSliderContent: {
    paddingRight: scale(20),
  },
  rideCard: {
    width: scale(140),
    marginRight: scale(12),
    backgroundColor: '#16161B',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: scale(22),
    padding: scale(14),
    alignItems: 'center',
  },
  selectedDot: {
    position: 'absolute',
    top: scale(10),
    right: scale(10),
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#F5C518',
  },
  carImageWrapper: {
    width: '90%',
    height: verticalScale(56),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  carCutoutImage: {
    width: '100%',
    height: '100%',
  },
  rideCardName: {
    color: '#ffffff',
    fontSize: moderateFontScale(14),
    fontWeight: '700',
  },
  rideCardDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(2),
  },

  footerVibeCard: {
    backgroundColor: '#0A0A0C',
    borderRadius: scale(24),
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: scale(20),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    height: verticalScale(140),
  },
  waveOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderWidth: scale(2),
    borderColor: 'rgba(245, 197, 24, 0.06)',
    borderRadius: scale(24),
  },
  vibeCardTitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(22),
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  vibeCardSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: verticalScale(8),
    letterSpacing: 1,
  },
  vibeCardCrafted: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: moderateFontScale(10),
    marginTop: verticalScale(4),
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: verticalScale(16),
    marginBottom: verticalScale(2),
  },
  logoWrapper: {
    backgroundColor: '#F5C518',
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(8),
  },
  brandName: {
    fontSize: moderateFontScale(20),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSwitchCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(2),
  },
  searchBarFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: scale(25),
    paddingHorizontal: scale(14),
    height: verticalScale(44),
    flex: 1,
  },
  bookingModeBadge: {
    borderWidth: 1,
    borderRadius: scale(12),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
  },
  bookingModeText: {
    fontSize: moderateFontScale(10),
    fontWeight: '800',
  },
});
