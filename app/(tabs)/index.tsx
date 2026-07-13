import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';

export default function HomeScreen() {
  const [selectedRide, setSelectedRide] = useState<'sedan' | 'offroad'>('offroad');
  const [isAc, setIsAc] = useState<boolean>(true);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER ROW */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn}>
          <MaterialIcons name="menu" size={scale(24)} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.brandText}>Vibzz</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <MaterialIcons name="notifications-none" size={scale(24)} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={scale(20)} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where to, explorer?"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
        </View>

        {/* PREMIUM SERVICES */}
        <Text style={styles.sectionTitle}>Premium Services</Text>
        
        {/* Row 1: Need a Guide */}
        <TouchableOpacity activeOpacity={0.9} style={styles.largeCardWrapper}>
          <ImageBackground
            source={require('@/assets/images/guide_bg.png')}
            style={styles.largeCardBg}
            imageStyle={{ borderRadius: scale(20) }}
          >
            <View style={styles.overlay} />
            <View style={styles.compassBadge}>
              <MaterialIcons name="explore" size={scale(18)} color="#F5C518" />
            </View>
            <View style={styles.largeCardTextCol}>
              <Text style={styles.largeCardTitle}>Need a Guide</Text>
              <Text style={styles.largeCardSubtitle}>Certified local experts</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* Row 2: Jungle Safari & Column components */}
        <View style={styles.servicesGridRow}>
          {/* Left card: Jungle Safari */}
          <TouchableOpacity activeOpacity={0.9} style={styles.leftSafariCard}>
            <ImageBackground
              source={require('@/assets/images/safari_bg.png')}
              style={styles.safariCardBg}
              imageStyle={{ borderRadius: scale(20) }}
            >
              <View style={styles.overlay} />
              <View style={styles.safariCardTextCol}>
                <Text style={styles.safariCardTitle}>Jungle Safari in 4×4</Text>
                <Text style={styles.safariCardSubtitle}>Book Now</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          {/* Right column: Make Trip & All Services */}
          <View style={styles.rightServicesCol}>
            <TouchableOpacity activeOpacity={0.9} style={styles.makeTripCard}>
              <MaterialIcons name="map" size={scale(20)} color="#F5C518" style={{ marginBottom: verticalScale(4) }} />
              <Text style={styles.makeTripTitle}>Make Your Own Trip</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} style={styles.allServicesCard}>
              <View style={styles.allServicesRow}>
                <Text style={styles.allServicesText}>All Services</Text>
                <MaterialIcons name="arrow-forward" size={scale(18)} color="#101010" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* EXPLORE KARNATAKA BANNER */}
        <TouchableOpacity activeOpacity={0.9} style={styles.karnatakaBanner}>
          <ImageBackground
            source={require('@/assets/images/karnataka_bg.png')}
            style={styles.karnatakaBannerBg}
            imageStyle={{ borderRadius: scale(24) }}
          >
            <View style={styles.overlayStrong} />
            <View style={styles.karnatakaContent}>
              <Text style={styles.karnatakaText}>{"Let's explore the beauty or thrill in Karnataka"}</Text>
              <View style={styles.planRouteBtn}>
                <Text style={styles.planRouteBtnText}>Plan Route</Text>
              </View>
            </View>
            {/* Cutout SUV graphic placed overlapping on bottom right */}
            <Image
              source={require('@/assets/images/offroad_cutout.png')}
              style={styles.karnatakaSUVGraphic}
              resizeMode="contain"
            />
          </ImageBackground>
        </TouchableOpacity>

        {/* CHOOSE YOUR RIDE */}
        <View style={styles.chooseRideHeader}>
          <Text style={styles.sectionTitleNoMargin}>Choose Your Ride</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rideCardsRow}>
          {/* Sedan card */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.rideCard, selectedRide === 'sedan' && styles.rideCardSelected]}
            onPress={() => setSelectedRide('sedan')}
          >
            <View style={styles.carImageWrapper}>
              <Image
                source={require('@/assets/images/sedan_cutout.png')}
                style={styles.carCutoutImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.rideCardName}>Sedan</Text>
            <Text style={styles.rideCardDesc}>Comfort & Style</Text>
          </TouchableOpacity>

          {/* 4x4 Offroad card */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.rideCard, selectedRide === 'offroad' && styles.rideCardSelected]}
            onPress={() => setSelectedRide('offroad')}
          >
            {selectedRide === 'offroad' && <View style={styles.selectedDot} />}
            <View style={styles.carImageWrapper}>
              <Image
                source={require('@/assets/images/offroad_cutout.png')}
                style={styles.carCutoutImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.rideCardName, selectedRide === 'offroad' && { color: '#F5C518' }]}>4×4 Offroad</Text>
            <Text style={[styles.rideCardDesc, selectedRide === 'offroad' && { color: 'rgba(245,197,24,0.7)' }]}>Selected</Text>
          </TouchableOpacity>
        </View>

        {/* AC / NON-AC FILTERS */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.filterPill, isAc && styles.filterPillSelected]}
            onPress={() => setIsAc(true)}
          >
            <Text style={[styles.filterPillText, isAc && styles.filterPillTextSelected]}>AC Rides</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, !isAc && styles.filterPillSelected]}
            onPress={() => setIsAc(false)}
          >
            <Text style={[styles.filterPillText, !isAc && styles.filterPillTextSelected]}>Non-AC</Text>
          </TouchableOpacity>
        </View>

        {/* VIBE WITH US FOOTER CARD */}
        <View style={styles.footerVibeCard}>
          {/* Waves background using styled border/graphics */}
          <View style={styles.waveOverlay} />
          <Text style={styles.vibeCardTitle}>#VIBE with us</Text>
          <Text style={styles.vibeCardSub}>Made in India</Text>
          <Text style={styles.vibeCardCrafted}>Crafted in Karnataka</Text>
        </View>
      </ScrollView>

      {/* FLOATING LOCATION BUTTON */}
      <TouchableOpacity activeOpacity={0.9} style={styles.floatingLocationBtn}>
        <MaterialIcons name="my-location" size={scale(22)} color="#101010" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101014',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(10),
    backgroundColor: '#101014',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconBtn: {
    padding: scale(6),
  },
  brandText: {
    color: '#ffffff',
    fontSize: moderateFontScale(18),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(80), // extra padding for bottom tab spacing
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: scale(25),
    paddingHorizontal: scale(16),
    height: verticalScale(44),
    marginTop: verticalScale(14),
    marginBottom: verticalScale(18),
  },
  searchIcon: {
    marginRight: scale(10),
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: moderateFontScale(14),
    height: '100%',
    padding: 0,
  },
  sectionTitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(18),
    fontWeight: '700',
    marginBottom: verticalScale(14),
  },
  sectionTitleNoMargin: {
    color: '#F5C518',
    fontSize: moderateFontScale(18),
    fontWeight: '700',
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
  largeCardWrapper: {
    width: '100%',
    height: verticalScale(130),
    marginBottom: verticalScale(12),
  },
  largeCardBg: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: scale(16),
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
  largeCardTextCol: {
    zIndex: 2,
  },
  largeCardTitle: {
    color: '#ffffff',
    fontSize: moderateFontScale(17),
    fontWeight: '800',
  },
  largeCardSubtitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(12),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  servicesGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    height: verticalScale(154),
    marginBottom: verticalScale(20),
  },
  leftSafariCard: {
    width: '48.5%',
    height: '100%',
  },
  safariCardBg: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: scale(14),
  },
  safariCardTextCol: {
    zIndex: 2,
  },
  safariCardTitle: {
    color: '#ffffff',
    fontSize: moderateFontScale(15),
    fontWeight: '800',
    lineHeight: moderateFontScale(20),
  },
  safariCardSubtitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    marginTop: verticalScale(4),
  },
  rightServicesCol: {
    width: '48.5%',
    height: '100%',
    justifyContent: 'space-between',
  },
  makeTripCard: {
    flex: 0.58,
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: scale(20),
    paddingHorizontal: scale(14),
    justifyContent: 'center',
  },
  makeTripTitle: {
    color: '#ffffff',
    fontSize: moderateFontScale(13),
    fontWeight: '700',
    lineHeight: moderateFontScale(18),
  },
  allServicesCard: {
    flex: 0.36,
    backgroundColor: '#F5C518',
    borderRadius: scale(20),
    paddingHorizontal: scale(14),
    justifyContent: 'center',
  },
  allServicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allServicesText: {
    color: '#101010',
    fontSize: moderateFontScale(13),
    fontWeight: '700',
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
  viewAllText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: moderateFontScale(13),
    fontWeight: '600',
  },
  rideCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: verticalScale(14),
  },
  rideCard: {
    width: '48.5%',
    backgroundColor: '#16161B',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: scale(22),
    padding: scale(14),
    alignItems: 'center',
  },
  rideCardSelected: {
    borderColor: '#F5C518',
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
  filterPillsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: verticalScale(24),
  },
  filterPill: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(18),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'transparent',
  },
  filterPillSelected: {
    backgroundColor: '#F5C518',
    borderColor: '#F5C518',
  },
  filterPillText: {
    color: '#ffffff',
    fontSize: moderateFontScale(13),
    fontWeight: '600',
  },
  filterPillTextSelected: {
    color: '#101010',
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
  floatingLocationBtn: {
    position: 'absolute',
    bottom: verticalScale(18),
    right: scale(18),
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    backgroundColor: '#F5C518',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },
});
