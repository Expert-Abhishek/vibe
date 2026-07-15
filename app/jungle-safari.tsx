import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SafariTrip {
  id: string;
  name: string;
  reserve: string;
  vehicleName: string;
  timeRange: string;
  duration: string;
  price: string;
  route: string[]; // E.g., ['A', 'B', 'C', 'D']
  difficulty: 'Easy' | 'Moderate' | 'Adventuresome';
  slotsAvailable: number;
}

const mockSafaris: SafariTrip[] = [
  {
    id: '1',
    name: 'Bandipur Morning Tiger Quest',
    reserve: 'Bandipur Tiger Reserve',
    vehicleName: 'Open Gypsy 4x4',
    timeRange: '06:00 AM - 09:00 AM',
    duration: '3h',
    price: '₹2,800',
    route: ['Forest Gate', 'Moyar Bed', 'Tiger Path', 'Langur Trees', 'Main Exit'],
    difficulty: 'Moderate',
    slotsAvailable: 4,
  },
  {
    id: '2',
    name: 'Kabini River & Forest Trail',
    reserve: 'Kabini Forest Reserve',
    vehicleName: 'Luxury Safari Canter',
    timeRange: '03:00 PM - 06:00 PM',
    duration: '3h',
    price: '₹1,800',
    route: ['Cabin Gate', 'Backwaters', 'Elephant Cross', 'Leopard Rock', 'Exit Gate'],
    difficulty: 'Easy',
    slotsAvailable: 12,
  },
  {
    id: '3',
    name: 'Nagarhole Wildlife Expedition',
    reserve: 'Nagarhole National Park',
    vehicleName: 'Open Gypsy 4x4',
    timeRange: '06:30 AM - 09:30 AM',
    duration: '3h',
    price: '₹3,200',
    route: ['Taraka Gate', 'Bison Plains', 'River Bank', 'Tiger Canopy', 'Exit Post'],
    difficulty: 'Adventuresome',
    slotsAvailable: 2,
  },
  {
    id: '4',
    name: 'Bannerghatta Bio-Park Safari',
    reserve: 'Bannerghatta National Park',
    vehicleName: 'AC Safari Bus',
    timeRange: '11:00 AM - 01:00 PM',
    duration: '2h',
    price: '₹500',
    route: ['Main Depot', 'Bear Woods', 'Lion Valley', 'Tiger Haven', 'Rescue Hub'],
    difficulty: 'Easy',
    slotsAvailable: 25,
  },
  {
    id: '5',
    name: 'Bandipur Dusk Explorer',
    reserve: 'Bandipur Tiger Reserve',
    vehicleName: 'Safari Bolero Offroad',
    timeRange: '03:30 PM - 06:30 PM',
    duration: '3h',
    price: '₹2,500',
    route: ['Gundlupet Post', 'Sandalwood Trail', 'Elephant Waterhole', 'Vulture Hill', 'Exit Gate'],
    difficulty: 'Moderate',
    slotsAvailable: 6,
  },
  {
    id: '6',
    name: 'Kudremukh Eco-Trail Safari',
    reserve: 'Kudremukh National Park',
    vehicleName: 'Force Kruz Jeep 4x4',
    timeRange: '09:00 AM - 12:30 PM',
    duration: '3.5h',
    price: '₹2,200',
    route: ['Entrance', 'Misty Hills', 'Somawathi Falls', 'Shola Grasslands', 'Eco Hub'],
    difficulty: 'Adventuresome',
    slotsAvailable: 5,
  },
];

export default function JungleSafariScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  const filteredSafaris = searchQuery.trim() === ''
    ? mockSafaris
    : mockSafaris.filter(safari =>
        safari.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        safari.reserve.toLowerCase().includes(searchQuery.toLowerCase()) ||
        safari.vehicleName.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleBookSafari = (safari: SafariTrip) => {
    Alert.alert(
      'Safari Confirmed!',
      `You have booked the ${safari.name} via ${safari.vehicleName} for ${safari.price}. Prepare for your wild adventure!`,
      [{ text: 'Jambo!' }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={scale(24)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Jungle Safari 4×4</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner header */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Track Wildlife in Wild Karnataka</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            Secure your seats in open-top 4x4 Gypsies or forest patrol vehicles. Book official reserve trips directly.
          </Text>
        </View>

        {/* Search Bar - styled EXACTLY like the Home screen search bar */}
        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
          <MaterialIcons name="search" size={scale(20)} color={colors.amber} style={styles.searchIcon} />
          <TextInput
            placeholder="Search by Reserve (e.g., Bandipur, Kabini)"
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={scale(18)} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* List Header */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>Available Safari Expeditions</Text>
          <Text style={[styles.resultCount, { color: colors.textMuted }]}>
            {filteredSafaris.length} routes found
          </Text>
        </View>

        {/* Safaris List */}
        {filteredSafaris.length > 0 ? (
          filteredSafaris.map((safari) => (
            <View
              key={safari.id}
              style={[styles.safariCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {/* Timing, Reserve & Price Header Row */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.safariName, { color: colors.textPrimary }]}>{safari.name}</Text>
                  <Text style={[styles.reserveText, { color: colors.textMuted }]}>{safari.reserve}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceVal}>{safari.price}</Text>
                  <Text style={[styles.priceUnit, { color: colors.textMuted }]}>/seat</Text>
                </View>
              </View>

              {/* Vehicle & Slot Specs */}
              <View style={[styles.specsRow, { borderBottomColor: colors.border }]}>
                <View style={styles.specItem}>
                  <FontAwesome5 name="car" size={scale(12)} color={colors.amber} />
                  <Text style={[styles.specText, { color: colors.textPrimary }]}>{safari.vehicleName}</Text>
                </View>

                <View style={styles.specItem}>
                  <MaterialIcons name="schedule" size={scale(14)} color={colors.amber} />
                  <Text style={[styles.specText, { color: colors.textPrimary }]}>{safari.timeRange} ({safari.duration})</Text>
                </View>

                <View style={styles.specItem}>
                  <MaterialIcons name="event-seat" size={scale(14)} color={colors.amber} />
                  <Text style={[styles.specText, { color: colors.textPrimary }]}>{safari.slotsAvailable} slots left</Text>
                </View>
              </View>

              {/* Route Stepper A-B-C-D-E */}
              <View style={styles.routeContainer}>
                <Text style={[styles.routeHeading, { color: colors.textMuted }]}>Expedition Route Path</Text>
                <View style={styles.stepperWrapper}>
                  {safari.route.map((stop, index) => {
                    const isLast = index === safari.route.length - 1;
                    return (
                      <View key={index} style={styles.stepNodeContainer}>
                        {/* Node layout */}
                        <View style={styles.nodeIconRow}>
                          <View style={[styles.nodeCircle, { backgroundColor: index === 0 ? colors.amber : '#2C2C34' }]}>
                            <Text style={[styles.nodeIndexText, { color: index === 0 ? '#101010' : '#ffffff' }]}>
                              {String.fromCharCode(65 + index)}
                            </Text>
                          </View>
                          {!isLast && (
                            <View style={[styles.nodeLine, { backgroundColor: colors.border }]} />
                          )}
                        </View>
                        {/* Node Label */}
                        <Text style={[styles.nodeLabelText, { color: colors.textPrimary }]} numberOfLines={1}>
                          {stop}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Book Button */}
              <TouchableOpacity
                style={styles.bookButton}
                activeOpacity={0.8}
                onPress={() => handleBookSafari(safari)}
              >
                <Text style={styles.bookButtonText}>Book Safari Seat</Text>
                <MaterialIcons name="arrow-forward" size={scale(16)} color="#101010" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.noResultsCard}>
            <MaterialIcons name="search-off" size={scale(48)} color={colors.textMuted} style={{ marginBottom: verticalScale(10) }} />
            <Text style={[styles.noResultsTitle, { color: colors.textPrimary }]}>No safaris found</Text>
            <Text style={[styles.noResultsSub, { color: colors.textMuted }]}>
              {"Try searching for \"Bandipur\", \"Kabini\", or \"Gypsy\"."}
            </Text>
          </View>
        )}

        {/* Extra spacing */}
        <View style={{ height: verticalScale(30) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(12),
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: moderateFontScale(18),
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: scale(18),
  },
  heroSection: {
    marginTop: verticalScale(10),
    marginBottom: verticalScale(16),
  },
  heroTitle: {
    fontSize: moderateFontScale(22),
    fontWeight: '800',
    color: '#F5C518',
    lineHeight: moderateFontScale(28),
  },
  heroSubtitle: {
    fontSize: moderateFontScale(13),
    marginTop: verticalScale(6),
    lineHeight: moderateFontScale(18),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: scale(25),
    paddingHorizontal: scale(16),
    height: verticalScale(46),
    marginBottom: verticalScale(20),
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateFontScale(14),
    height: '100%',
    padding: 0,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(16),
    fontWeight: '700',
  },
  resultCount: {
    fontSize: moderateFontScale(12),
    fontWeight: '500',
  },
  safariCard: {
    borderRadius: scale(20),
    borderWidth: 1.2,
    padding: scale(16),
    marginBottom: verticalScale(16),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  safariName: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
    width: scale(220),
  },
  reserveText: {
    fontSize: moderateFontScale(12),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceVal: {
    color: '#F5C518',
    fontSize: moderateFontScale(18),
    fontWeight: '800',
  },
  priceUnit: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    marginTop: verticalScale(4),
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: scale(10),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
  },
  specText: {
    fontSize: moderateFontScale(11),
    fontWeight: '600',
    marginLeft: scale(4),
  },
  routeContainer: {
    marginTop: verticalScale(12),
  },
  routeHeading: {
    fontSize: moderateFontScale(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(10),
  },
  stepperWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: scale(2),
  },
  stepNodeContainer: {
    alignItems: 'center',
    flex: 1,
  },
  nodeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  nodeCircle: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeIndexText: {
    fontSize: moderateFontScale(11),
    fontWeight: '800',
  },
  nodeLine: {
    height: verticalScale(2),
    position: 'absolute',
    left: '50%',
    right: '-50%',
    zIndex: 1,
  },
  nodeLabelText: {
    fontSize: moderateFontScale(9),
    fontWeight: '700',
    marginTop: verticalScale(6),
    textAlign: 'center',
    paddingHorizontal: scale(2),
  },
  bookButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(11),
    marginTop: verticalScale(16),
    gap: scale(6),
  },
  bookButtonText: {
    color: '#101010',
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  noResultsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(50),
  },
  noResultsTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '700',
  },
  noResultsSub: {
    fontSize: moderateFontScale(12),
    marginTop: verticalScale(4),
  },
});
