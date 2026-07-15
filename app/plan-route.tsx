import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface FamousPlace {
  id: string;
  name: string;
  district: string;
  distanceKm: number;
  description: string;
  image: string;
  rating: number;
  tags: string[];
}

const famousPlaces: FamousPlace[] = [
  {
    id: '1',
    name: 'Hampi Ruins',
    district: 'Vijayanagara (Ballari)',
    distanceKm: 340,
    rating: 4.9,
    description: 'The ancient capital of the Vijayanagara Empire. Explore majestic stone temples, monolithic structures, and the iconic stone chariot amidst a unique boulder-strewn landscape.',
    image: 'https://images.unsplash.com/photo-1600100397608-f010e423b971?w=400',
    tags: ['UNESCO', 'History', 'Architecture'],
  },
  {
    id: '2',
    name: 'Mysuru Palace',
    district: 'Mysuru',
    distanceKm: 145,
    rating: 4.8,
    description: 'An architectural marvel combining Hindu, Islamic, Gothic, and Rajput styles. Famous for its dazzling lighting during Dasara and rich royal heritage.',
    image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=400',
    tags: ['Palace', 'Culture', 'Heritage'],
  },
  {
    id: '3',
    name: 'Misty Coorg Hills',
    district: 'Kodagu',
    distanceKm: 250,
    rating: 4.9,
    description: 'Often called the Scotland of India. Rich coffee plantations, mist-covered valleys, Abbey Falls, and trek routes up Mandalpatti or Tadiandamol.',
    image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?w=400',
    tags: ['Nature', 'Hills', 'Coffee'],
  },
  {
    id: '4',
    name: 'Gokarna Om Beach',
    district: 'Uttara Kannada',
    distanceKm: 480,
    rating: 4.7,
    description: 'A serene beach town shaped like the auspicious Om symbol. Popular for cliff-trekking, beach camping, and spiritual visits to the Mahabaleshwar Temple.',
    image: 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?w=400',
    tags: ['Beach', 'Trekking', 'Temples'],
  },
  {
    id: '5',
    name: 'Jog Falls',
    district: 'Shivamogga',
    distanceKm: 410,
    rating: 4.6,
    description: 'One of the highest plunge waterfalls in India. Watch the Sharavathi River drop 253 meters in four distinct cascades: Raja, Rani, Roarer, and Rocket.',
    image: 'https://images.unsplash.com/photo-1598188306155-25e400eb5078?w=400',
    tags: ['Waterfall', 'Nature', 'Monsoon'],
  },
  {
    id: '6',
    name: 'Chikmagalur Peaks',
    district: 'Chikmagalur',
    distanceKm: 245,
    rating: 4.8,
    description: 'The birthplace of coffee in India. Hike to Mullayanagiri, the highest peak in Karnataka, or Bababudangiri, and explore lush rainforests.',
    image: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400',
    tags: ['Mountains', 'Trekking', 'Coffee'],
  },
  {
    id: '7',
    name: 'Bandipur Wildlife Reserve',
    district: 'Chamarajanagar',
    distanceKm: 220,
    rating: 4.9,
    description: 'Part of the Nilgiri Biosphere. Safaris through dry deciduous forest shelter leopards, Asian elephants, gaurs, and a significant Bengal tiger population.',
    image: 'https://images.unsplash.com/photo-1581852013749-bf938c92a95c?w=400',
    tags: ['Wildlife', 'Safari', 'Forest'],
  },
  {
    id: '8',
    name: 'Murudeshwar Temple & Beach',
    district: 'Uttara Kannada',
    distanceKm: 490,
    rating: 4.7,
    description: 'Home to the world’s second tallest Shiva statue (123 feet) on the Arabian Sea coast, featuring a towering 20-storied Gopura with panoramic sea views.',
    image: 'https://images.unsplash.com/photo-1601662528567-526cd06f6582?w=400',
    tags: ['Sea Statue', 'Temple', 'Scuba'],
  },
];

const rideTypes = [
  { key: 'hatchback', name: 'Compact Hatchback', ratePerKm: 12, icon: 'car-side', timeEst: 'Quick match' },
  { key: 'sedan', name: 'Premium Sedan', ratePerKm: 15, icon: 'car', timeEst: 'Highly comfortable' },
  { key: 'thar', name: '4×4 Thar Adventure', ratePerKm: 22, icon: 'truck-monster', timeEst: 'Best for offroad/hills' },
  { key: 'auto', name: 'Local Auto Explorer', ratePerKm: 8, icon: 'motorcycle', timeEst: 'Eco budget' },
];

export default function PlanRouteScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<FamousPlace | null>(null);
  const [selectedRide, setSelectedRide] = useState<string>('sedan');

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  const filteredPlaces = searchQuery.trim() === ''
    ? famousPlaces
    : famousPlaces.filter(place =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  const calculateFare = (distanceKm: number, rideKey: string) => {
    const ride = rideTypes.find(r => r.key === rideKey);
    const rate = ride ? ride.ratePerKm : 15;
    return distanceKm * rate;
  };

  const handleConfirmBooking = (place: FamousPlace) => {
    const fare = calculateFare(place.distanceKm, selectedRide);
    const rideName = rideTypes.find(r => r.key === selectedRide)?.name || 'Ride';
    setSelectedPlace(null);
    Alert.alert(
      'Booking Request Sent!',
      `Searching for a ${rideName} driver to take you from Bengaluru to ${place.name} (${place.distanceKm} km). Estimated Fare: ₹${fare.toLocaleString('en-IN')}.\n\nWe will alert you when a driver accepts.`,
      [{ text: 'Got it', onPress: () => router.replace('/(tabs)/trips') }]
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Plan Karnataka Route</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Details */}
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeTitle}>Discover Golden Karnataka</Text>
          <Text style={[styles.welcomeSub, { color: colors.textMuted }]}>
            Select a heritage site, beach, or hill station in Karnataka, and book a verified driver directly from Bengaluru.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
          <MaterialIcons name="search" size={scale(20)} color={colors.amber} style={styles.searchIcon} />
          <TextInput
            placeholder="Search destination, district, or tag (e.g. Hampi, temple, beach)"
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

        {/* List Grid Title */}
        <View style={styles.gridHeaderRow}>
          <Text style={styles.sectionTitle}>Famous Destinations</Text>
          <Text style={[styles.resultCount, { color: colors.textMuted }]}>
            {filteredPlaces.length} locations
          </Text>
        </View>

        {/* Places List */}
        {filteredPlaces.length > 0 ? (
          filteredPlaces.map((place) => (
            <View
              key={place.id}
              style={[styles.placeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              {/* Place Image */}
              <Image source={{ uri: place.image }} style={styles.placeImage} />

              <View style={styles.placeBody}>
                {/* Header row */}
                <View style={styles.placeTitleRow}>
                  <View>
                    <Text style={[styles.placeName, { color: colors.textPrimary }]}>{place.name}</Text>
                    <Text style={[styles.placeDistrict, { color: colors.textMuted }]}>
                      <MaterialIcons name="location-on" size={scale(11)} color={colors.amber} /> {place.district}
                    </Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <MaterialIcons name="star" size={scale(12)} color="#101010" />
                    <Text style={styles.ratingVal}>{place.rating}</Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={[styles.placeDesc, { color: colors.textMuted }]} numberOfLines={3}>
                  {place.description}
                </Text>

                {/* Distance and Tags */}
                <View style={styles.footerInfoRow}>
                  <View style={styles.distanceBadge}>
                    <FontAwesome5 name="road" size={scale(10)} color={colors.amber} />
                    <Text style={[styles.distanceText, { color: colors.textPrimary }]}>
                      {place.distanceKm} km from Bengaluru
                    </Text>
                  </View>
                  <View style={styles.tagsContainer}>
                    {place.tags.map((tag, idx) => (
                      <View key={idx} style={[styles.tagItem, { borderColor: colors.border }]}>
                        <Text style={[styles.tagText, { color: colors.textMuted }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Booking Action Button */}
                <TouchableOpacity
                  style={styles.bookBtn}
                  activeOpacity={0.8}
                  onPress={() => setSelectedPlace(place)}
                >
                  <Text style={styles.bookBtnText}>Book Driver to {place.name.split(' ')[0]}</Text>
                  <MaterialIcons name="chevron-right" size={scale(16)} color="#101010" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.noResults}>
            <MaterialIcons name="map" size={scale(48)} color={colors.textMuted} style={{ marginBottom: verticalScale(10) }} />
            <Text style={[styles.noResultsTitle, { color: colors.textPrimary }]}>Destination not found</Text>
            <Text style={[styles.noResultsSub, { color: colors.textMuted }]}>
              {"Try searching for popular hotspots like \"Hampi\", \"Coorg\" or \"Palace\"."}
            </Text>
            <TouchableOpacity style={styles.resetBtn} onPress={() => setSearchQuery('')}>
              <Text style={styles.resetBtnText}>Show All Places</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Spacing */}
        <View style={{ height: verticalScale(30) }} />
      </ScrollView>

      {/* Ride Selector Bottom Sheet Modal */}
      <Modal
        visible={selectedPlace !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedPlace(null)}
      >
        {selectedPlace && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.dragHandle} />

              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Choose Ride Vehicle</Text>
                  <Text style={[styles.modalHeaderSub, { color: colors.textMuted }]}>
                    Destination: {selectedPlace.name} ({selectedPlace.distanceKm} km)
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedPlace(null)}>
                  <MaterialIcons name="close" size={scale(22)} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {rideTypes.map(ride => {
                  const isSelected = selectedRide === ride.key;
                  const estimatedFare = calculateFare(selectedPlace.distanceKm, ride.key);

                  return (
                    <TouchableOpacity
                      key={ride.key}
                      style={[
                        styles.rideOptionCard,
                        {
                          backgroundColor: colors.surfaceCard,
                          borderColor: isSelected ? colors.amber : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedRide(ride.key)}
                      activeOpacity={0.9}
                    >
                      <View style={styles.rideOptionLeft}>
                        <View style={[styles.rideIconWrapper, { backgroundColor: isSelected ? 'rgba(245,197,24,0.1)' : 'rgba(255,255,255,0.04)' }]}>
                          <FontAwesome5 name={ride.icon} size={scale(18)} color={isSelected ? colors.amber : colors.textPrimary} />
                        </View>
                        <View style={styles.rideOptionDetails}>
                          <Text style={[styles.rideOptionName, { color: colors.textPrimary }]}>{ride.name}</Text>
                          <Text style={[styles.rideOptionDesc, { color: colors.textMuted }]}>{ride.timeEst}</Text>
                        </View>
                      </View>

                      <View style={styles.rideOptionRight}>
                        <Text style={styles.rideFareText}>₹{estimatedFare.toLocaleString('en-IN')}</Text>
                        <Text style={[styles.rideRateText, { color: colors.textMuted }]}>₹{ride.ratePerKm}/km</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.confirmBookingBtn}
                  onPress={() => handleConfirmBooking(selectedPlace)}
                >
                  <Text style={styles.confirmBookingText}>Confirm & Dispatch Driver</Text>
                  <MaterialIcons name="local-taxi" size={scale(20)} color="#101010" />
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
  welcomeBanner: {
    marginTop: verticalScale(10),
    marginBottom: verticalScale(16),
  },
  welcomeTitle: {
    fontSize: moderateFontScale(22),
    fontWeight: '800',
    color: '#F5C518',
    lineHeight: moderateFontScale(28),
  },
  welcomeSub: {
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
  gridHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(14),
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
  placeCard: {
    borderRadius: scale(24),
    borderWidth: 1.2,
    overflow: 'hidden',
    marginBottom: verticalScale(20),
  },
  placeImage: {
    width: '100%',
    height: verticalScale(160),
    resizeMode: 'cover',
  },
  placeBody: {
    padding: scale(16),
  },
  placeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  placeName: {
    fontSize: moderateFontScale(17),
    fontWeight: '800',
  },
  placeDistrict: {
    fontSize: moderateFontScale(12),
    fontWeight: '600',
    marginTop: verticalScale(2),
  },
  ratingBadge: {
    backgroundColor: '#F5C518',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(10),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
  },
  ratingVal: {
    color: '#101010',
    fontSize: moderateFontScale(11),
    fontWeight: '800',
    marginLeft: scale(3),
  },
  placeDesc: {
    fontSize: moderateFontScale(13),
    lineHeight: moderateFontScale(19),
    marginVertical: verticalScale(12),
  },
  footerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(14),
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  distanceText: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: scale(6),
  },
  tagItem: {
    borderWidth: 1,
    borderRadius: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
  },
  tagText: {
    fontSize: moderateFontScale(10),
    fontWeight: '600',
  },
  bookBtn: {
    backgroundColor: '#F5C518',
    borderRadius: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(12),
    gap: scale(6),
  },
  bookBtnText: {
    color: '#101010',
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(50),
    paddingHorizontal: scale(20),
  },
  noResultsTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '700',
  },
  noResultsSub: {
    fontSize: moderateFontScale(12),
    textAlign: 'center',
    lineHeight: moderateFontScale(18),
    marginTop: verticalScale(4),
    marginBottom: verticalScale(16),
  },
  resetBtn: {
    backgroundColor: '#F5C518',
    borderRadius: scale(20),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
  },
  resetBtnText: {
    color: '#101010',
    fontWeight: '700',
    fontSize: moderateFontScale(13),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    maxHeight: '80%',
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
    fontSize: moderateFontScale(18),
    fontWeight: '800',
  },
  modalHeaderSub: {
    fontSize: moderateFontScale(12),
    marginTop: verticalScale(2),
  },
  closeButton: {
    padding: scale(4),
  },
  modalScroll: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  rideOptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: scale(16),
    borderWidth: 1.5,
    padding: scale(14),
    marginBottom: verticalScale(10),
  },
  rideOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideIconWrapper: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideOptionDetails: {
    marginLeft: scale(12),
  },
  rideOptionName: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  rideOptionDesc: {
    fontSize: moderateFontScale(10),
    marginTop: verticalScale(2),
  },
  rideOptionRight: {
    alignItems: 'flex-end',
  },
  rideFareText: {
    color: '#F5C518',
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  rideRateText: {
    fontSize: moderateFontScale(10),
    marginTop: verticalScale(1),
  },
  modalActions: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(14),
    borderTopWidth: 1.2,
  },
  confirmBookingBtn: {
    backgroundColor: '#F5C518',
    borderRadius: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: scale(48),
    gap: scale(6),
  },
  confirmBookingText: {
    color: '#101010',
    fontSize: moderateFontScale(14),
    fontWeight: '800',
  },
});
