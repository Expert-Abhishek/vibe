import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const checkpointDetailsData: Record<string, { address: string; images: string[] }> = {
  // Bandipur
  'Forest Gate': {
    address: 'Bandipur Entrance Checkpost, NH-67',
    images: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400'
    ]
  },
  'Moyar Bed': {
    address: 'Moyar Gorge Valley Viewpoint',
    images: [
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400'
    ]
  },
  'Tiger Path': {
    address: 'Core Tiger Habitat Sanctuary Area',
    images: [
      'https://images.unsplash.com/photo-1581852013749-bf938c92a95c?w=400',
      'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400'
    ]
  },
  'Langur Trees': {
    address: 'Bamboo Canopy Walk Zone',
    images: [
      'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=400',
      'https://images.unsplash.com/photo-1533851593648-9366f7f02361?w=400'
    ]
  },
  'Main Exit': {
    address: 'Bandipur Forest Exit Outpost',
    images: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400'
    ]
  },
  // Kabini
  'Cabin Gate': {
    address: 'Kabini Forest Lodge Entrance',
    images: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400'
    ]
  },
  'Backwaters': {
    address: 'Kabini River Reservoir Shoreline',
    images: [
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400'
    ]
  },
  'Elephant Cross': {
    address: 'Watering Hole & Elephant Trail Path',
    images: [
      'https://images.unsplash.com/photo-1581852013749-bf938c92a95c?w=400',
      'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400'
    ]
  },
  'Leopard Rock': {
    address: 'Rocky Outcrop Lookout Point',
    images: [
      'https://images.unsplash.com/photo-1575550959106-5a7defe28b56?w=400',
      'https://images.unsplash.com/photo-1456926631375-92c8ce872def?w=400'
    ]
  },
  'Exit Gate': {
    address: 'Wildlife Department Forest Exit Outpost',
    images: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400'
    ]
  },
  // Nagarhole
  'Taraka Gate': {
    address: 'Taraka Dam Entrance Forest gate',
    images: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400',
      'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400'
    ]
  },
  'Bison Plains': {
    address: 'Open Grassland Bison Crossing',
    images: [
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400'
    ]
  },
  'River Bank': {
    address: 'Nagarhole Riverbank Lookout Point',
    images: [
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400'
    ]
  },
  'Tiger Canopy': {
    address: 'Core Nagarhole Predator Habitat',
    images: [
      'https://images.unsplash.com/photo-1581852013749-bf938c92a95c?w=400',
      'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400'
    ]
  },
  'Exit Post': {
    address: 'Kabini-Nagarhole Forest Border Post',
    images: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
      'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400'
    ]
  },
  // Default fallback
  'default': {
    address: 'Scenic Sanctuary Landmark Location',
    images: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400'
    ]
  }
};

export default function JungleSafariScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<{
    name: string;
    code: string;
    address: string;
    images: string[];
    description: string;
  } | null>(null);

  const getCheckpointInfo = (name: string, indexChar: string) => {
    const details = checkpointDetailsData[name] || checkpointDetailsData['default'];
    return {
      name: name,
      code: `Checkpoint ${indexChar}`,
      address: details.address,
      images: details.images,
      description: `This is the beautiful ${name} checkpoint on our jungle safari. Travelers frequently spot various wild species, exotic birds, and unique flora here. Keep your cameras ready and stay inside the vehicle!`
    };
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>4×4 Off Roading</Text>
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
                <Text style={[styles.routeHeading, { color: colors.textMuted }]}>Expedition Route Path (Tap node for details)</Text>
                <View style={styles.stepperWrapper}>
                  {safari.route.map((stop, index) => {
                    const isLast = index === safari.route.length - 1;
                    return (
                      <View key={index} style={styles.stepNodeContainer}>
                        {/* Node layout */}
                        <View style={styles.nodeIconRow}>
                          <TouchableOpacity
                            style={[styles.nodeCircle, { backgroundColor: index === 0 ? colors.amber : '#2C2C34' }]}
                            onPress={() => setSelectedCheckpoint(getCheckpointInfo(stop, String.fromCharCode(65 + index)))}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.nodeIndexText, { color: index === 0 ? '#101010' : '#ffffff' }]}>
                              {String.fromCharCode(65 + index)}
                            </Text>
                          </TouchableOpacity>
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

      {/* Checkpoint Detail Modal Drawer */}
      <Modal
        visible={selectedCheckpoint !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedCheckpoint(null)}
      >
        {selectedCheckpoint && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.dragHandle} />

              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>{selectedCheckpoint.name}</Text>
                  <Text style={[styles.modalHeaderSub, { color: colors.textMuted }]}>{selectedCheckpoint.code}</Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedCheckpoint(null)}>
                  <MaterialIcons name="close" size={scale(22)} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {/* Location Address */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Forest Landmark Address</Text>
                  <View style={styles.locationContainer}>
                    <MaterialIcons name="pin-drop" size={scale(16)} color={colors.amber} style={{ marginRight: scale(6) }} />
                    <Text style={[styles.locationText, { color: colors.textPrimary }]}>{selectedCheckpoint.address}</Text>
                  </View>
                </View>

                {/* Description */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Wild Activity Description</Text>
                  <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
                    {selectedCheckpoint.description}
                  </Text>
                </View>

                {/* Checkpoint Images */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Checkpoint Images</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageScrollContainer}>
                    {selectedCheckpoint.images.map((img, idx) => (
                      <Image key={idx} source={{ uri: img }} style={styles.checkpointCardImage} />
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>

              <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.drawerCloseBtn}
                  onPress={() => setSelectedCheckpoint(null)}
                >
                  <Text style={styles.drawerCloseText}>Close Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    maxHeight: '75%',
    paddingBottom: verticalScale(20),
  },
  dragHandle: {
    width: scale(40),
    height: verticalScale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: scale(2),
    alignSelf: 'center',
    marginTop: verticalScale(10),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(10),
  },
  modalHeaderTitle: {
    fontSize: moderateFontScale(17),
    fontWeight: '800',
  },
  modalHeaderSub: {
    fontSize: moderateFontScale(11),
    marginTop: verticalScale(2),
  },
  closeButton: {
    padding: scale(4),
  },
  modalScroll: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  modalSection: {
    marginTop: verticalScale(16),
  },
  modalSectionTitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(6),
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: scale(12),
    padding: scale(10),
  },
  locationText: {
    fontSize: moderateFontScale(13),
    fontWeight: '600',
  },
  modalDesc: {
    fontSize: moderateFontScale(13),
    lineHeight: moderateFontScale(19),
  },
  imageScrollContainer: {
    gap: scale(10),
    paddingVertical: verticalScale(4),
  },
  checkpointCardImage: {
    width: scale(200),
    height: scale(130),
    borderRadius: scale(16),
    resizeMode: 'cover',
  },
  modalActions: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(14),
    borderTopWidth: 1.2,
  },
  drawerCloseBtn: {
    backgroundColor: '#2C2C34',
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    height: scale(44),
  },
  drawerCloseText: {
    color: '#ffffff',
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
});
