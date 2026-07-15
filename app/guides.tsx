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
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Guide {
  id: string;
  name: string;
  city: string;
  experience: number;
  rating: number;
  languages: string[];
  specialty: string;
  description: string;
  avatarColor: string;
  image: string;
}

const mockGuides: Guide[] = [
  {
    id: '1',
    name: 'Somanna Gowda',
    city: 'Hampi',
    experience: 15,
    rating: 4.9,
    languages: ['Kannada', 'English', 'Telugu', 'French'],
    specialty: 'UNESCO Ruins & Architecture',
    description: 'Born and raised around the ruins of Vijayanagara, I have spent 15 years studying every stone of Hampi. Join me to unlock the secrets of the Virupaksha Temple, Vitthala chariot, and hidden royal enclosures.',
    avatarColor: '#E07A5F',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  },
  {
    id: '2',
    name: 'Ananya Shastri',
    city: 'Mysuru',
    experience: 10,
    rating: 4.8,
    languages: ['Kannada', 'English', 'Sanskrit', 'Hindi'],
    specialty: 'Palace History & Heritage Walks',
    description: 'Experience Mysuru like royalty. I specialize in historical narratives of the Wodeyar dynasty, palace secrets, and local heritage food trails. Certified yoga practitioner as well!',
    avatarColor: '#3D405B',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  },
  {
    id: '3',
    name: 'Ramesh Kumar',
    city: 'Bengaluru',
    experience: 12,
    rating: 4.7,
    languages: ['Kannada', 'English', 'Hindi'],
    specialty: 'City Heritage & Garden Walks',
    description: 'Discover Bengaluru beyond the IT hub. We will explore the historical Bengaluru Palace, Tipu Sultan’s Summer Palace, and the botanical marvels of Lalbagh Gardens.',
    avatarColor: '#81B29A',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  },
  {
    id: '4',
    name: 'Kavitha Hegde',
    city: 'Coorg',
    experience: 8,
    rating: 4.9,
    languages: ['Kannada', 'English', 'Kodava'],
    specialty: 'Coffee Plantation & Forest Treks',
    description: 'Let me guide you through the misty hills of Coorg (Kodagu). Learn about coffee harvesting, hike the peaks of Mandalpatti, and enjoy authentic Kodava hospitality.',
    avatarColor: '#F4F1DE',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
  },
  {
    id: '5',
    name: 'Manjunath Naik',
    city: 'Gokarna',
    experience: 6,
    rating: 4.6,
    languages: ['Kannada', 'English', 'Konkani'],
    specialty: 'Beach Trekking & Mythological Trails',
    description: 'Explore the cliffs and sandy shores of Gokarna. I guide tourists along the famous Five Beach Trek (Kudle, Om, Half Moon, Paradise, Gokarna) and share regional legendary tales.',
    avatarColor: '#E29578',
    image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
  },
  {
    id: '6',
    name: 'Chethan Swamy',
    city: 'Bandipur',
    experience: 9,
    rating: 4.9,
    languages: ['Kannada', 'English', 'Tamil'],
    specialty: 'Wildlife Tracking & Bird Watching',
    description: 'A certified naturalist. I help tourists identify flora, fauna, and track pugmarks in the buffer zones of Bandipur National Park. High safety standards guaranteed.',
    avatarColor: '#DDBDF1',
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  },
  {
    id: '7',
    name: 'Basavaraj Patil',
    city: 'Badami',
    experience: 11,
    rating: 4.8,
    languages: ['Kannada', 'English', 'Hindi'],
    specialty: 'Cave Temples & Chaluyan Art',
    description: 'Expert on early Chalukya architecture. I cover the red sandstone cave temples of Badami, the temple complex of Pattadakal (UNESCO), and the ancient fort of Aihole.',
    avatarColor: '#F2CC8F',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
  },
  {
    id: '8',
    name: 'Divya Rao',
    city: 'Chikmagalur',
    experience: 7,
    rating: 4.7,
    languages: ['Kannada', 'English'],
    specialty: 'Peak Trekking & Waterfalls',
    description: 'Adventure guide for Western Ghats. I lead hiking trips to Mullayanagiri Peak (highest in Karnataka), Kemmangundi, and secret waterfalls around the Baba Budangiri hills.',
    avatarColor: '#A8DADC',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
  },
  {
    id: '9',
    name: 'Shanthi Prasad',
    city: 'Shravanabelagola',
    experience: 14,
    rating: 4.9,
    languages: ['Kannada', 'English', 'Hindi'],
    specialty: 'Jain Heritage & History',
    description: 'I guide visitors up the Vindhyagiri hill to see the colossal 57-foot statue of Lord Bahubali, explaining the history of Ganga dynasty and ancient inscriptions on the rock.',
    avatarColor: '#E63946',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
  },
  {
    id: '10',
    name: 'Sunil Fernandes',
    city: 'Mangaluru',
    experience: 5,
    rating: 4.5,
    languages: ['Kannada', 'English', 'Tulu', 'Konkani'],
    specialty: 'Coastal Food & History Tours',
    description: 'Discover Mangalorean culture! I run seafood walks, visits to the St. Aloysius Chapel paintings, Kadri temple, and share Mangaluru port historical stories.',
    avatarColor: '#457B9D',
    image: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150',
  },
];

export default function GuidesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    surfaceCard: isDark ? '#16161B' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  const filteredGuides = searchQuery.trim() === ''
    ? mockGuides
    : mockGuides.filter(guide => 
        guide.city.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleBookGuide = (guide: Guide) => {
    setSelectedGuide(null);
    Alert.alert(
      'Guide Booked!',
      `You have successfully booked ${guide.name} for your trip to ${guide.city}. Our guide will contact you shortly.`,
      [{ text: 'Great!' }]
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Local Guides</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Prompt: Custom Way to Ask */}
        <View style={styles.askBanner}>
          <Text style={styles.askTitle}>Where is your next adventure?</Text>
          <Text style={[styles.askSubtitle, { color: colors.textMuted }]}>
            Enter the city you are planning to visit, and we will connect you with a certified local explorer.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}>
          <MaterialIcons name="search" size={scale(20)} color={colors.amber} style={styles.searchIcon} />
          <TextInput
            placeholder="Search by city (e.g. Hampi, Coorg, Mysuru)"
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

        {/* Guides List Header */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>
            {searchQuery.trim() === '' ? 'Top 10 Rated Guides' : `Guides in "${searchQuery}"`}
          </Text>
          <Text style={[styles.resultCount, { color: colors.textMuted }]}>
            {filteredGuides.length} {filteredGuides.length === 1 ? 'guide' : 'guides'} found
          </Text>
        </View>

        {/* Guides List */}
        {filteredGuides.length > 0 ? (
          filteredGuides.map((guide) => (
            <TouchableOpacity
              key={guide.id}
              activeOpacity={0.9}
              style={[styles.guideCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelectedGuide(guide)}
            >
              {/* Left Side: Avatar/Image */}
              <View style={[styles.avatarWrapper, { backgroundColor: guide.avatarColor }]}>
                <Image
                  source={{ uri: guide.image }}
                  style={styles.avatarImage}
                />
                <View style={styles.badgeRating}>
                  <MaterialIcons name="star" size={scale(10)} color="#101010" />
                  <Text style={styles.ratingText}>{guide.rating}</Text>
                </View>
              </View>

              {/* Right Side: Details */}
              <View style={styles.guideDetails}>
                <View style={styles.nameRow}>
                  <Text style={[styles.guideName, { color: colors.textPrimary }]}>{guide.name}</Text>
                  <View style={[styles.cityBadge, { backgroundColor: isDark ? 'rgba(245,197,24,0.1)' : 'rgba(245,197,24,0.15)' }]}>
                    <Text style={styles.cityBadgeText}>{guide.city}</Text>
                  </View>
                </View>

                <View style={styles.experienceRow}>
                  <MaterialIcons name="history" size={scale(14)} color={colors.amber} />
                  <Text style={[styles.experienceText, { color: colors.textMuted }]}>
                    {guide.experience} Years Experience
                  </Text>
                </View>

                <Text style={[styles.specialtyText, { color: colors.amber }]} numberOfLines={1}>
                  {guide.specialty}
                </Text>

                <View style={styles.languagesRow}>
                  {guide.languages.slice(0, 3).map((lang, idx) => (
                    <Text key={idx} style={[styles.langTag, { color: colors.textMuted, borderColor: colors.border }]}>
                      {lang}
                    </Text>
                  ))}
                  {guide.languages.length > 3 && (
                    <Text style={[styles.langTag, { color: colors.textMuted, borderColor: colors.border }]}>
                      +{guide.languages.length - 3}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noResultsCard}>
            <MaterialIcons name="explore-off" size={scale(48)} color={colors.textMuted} style={{ marginBottom: verticalScale(10) }} />
            <Text style={[styles.noResultsTitle, { color: colors.textPrimary }]}>No guides found here</Text>
            <Text style={[styles.noResultsSub, { color: colors.textMuted }]}>
              {"We are currently expanding our certified network. Try searching for \"Hampi\", \"Coorg\" or \"Mysuru\"."}
            </Text>
            <TouchableOpacity style={styles.resetButton} onPress={() => setSearchQuery('')}>
              <Text style={styles.resetButtonText}>View Top 10 Guides</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Extra spacing */}
        <View style={{ height: verticalScale(30) }} />
      </ScrollView>

      {/* Guide Detail Modal */}
      <Modal
        visible={selectedGuide !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedGuide(null)}
      >
        {selectedGuide && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              {/* Modal Drag handle indicator */}
              <View style={styles.dragHandle} />

              <View style={styles.modalHeader}>
                <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Guide Profile</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedGuide(null)}>
                  <MaterialIcons name="close" size={scale(22)} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
                {/* Large Profile Visual */}
                <View style={styles.modalProfileRow}>
                  <View style={[styles.modalAvatar, { backgroundColor: selectedGuide.avatarColor }]}>
                    <Image source={{ uri: selectedGuide.image }} style={styles.modalAvatarImage} />
                  </View>
                  <View style={styles.modalProfileText}>
                    <Text style={[styles.modalName, { color: colors.textPrimary }]}>{selectedGuide.name}</Text>
                    <View style={styles.modalBadgeRow}>
                      <View style={[styles.cityBadge, { backgroundColor: 'rgba(245,197,24,0.1)' }]}>
                        <Text style={styles.cityBadgeText}>{selectedGuide.city}</Text>
                      </View>
                      <View style={styles.modalStarRating}>
                        <MaterialIcons name="star" size={scale(16)} color={colors.amber} />
                        <Text style={[styles.modalRatingVal, { color: colors.textPrimary }]}>{selectedGuide.rating}</Text>
                      </View>
                    </View>
                    <Text style={[styles.modalExpText, { color: colors.textMuted }]}>
                      {selectedGuide.experience} years working experience
                    </Text>
                  </View>
                </View>

                {/* Specialties */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Specialty</Text>
                  <View style={styles.specialtyPill}>
                    <MaterialIcons name="verified" size={scale(16)} color={colors.amber} style={{ marginRight: scale(6) }} />
                    <Text style={styles.specialtyPillText}>{selectedGuide.specialty}</Text>
                  </View>
                </View>

                {/* Description */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Biography</Text>
                  <Text style={[styles.modalBio, { color: colors.textMuted }]}>
                    {selectedGuide.description}
                  </Text>
                </View>

                {/* Languages */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Languages Spoken</Text>
                  <View style={styles.modalLangRow}>
                    {selectedGuide.languages.map((lang, idx) => (
                      <View key={idx} style={[styles.modalLangTag, { borderColor: colors.border }]}>
                        <Text style={[styles.modalLangText, { color: colors.textPrimary }]}>{lang}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>

              {/* Bottom booking actions */}
              <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity 
                  style={[styles.contactBtn, { borderColor: colors.border }]} 
                  onPress={() => Alert.alert('Chat Initiated', `Opening chat with ${selectedGuide.name}...`)}
                >
                  <MaterialIcons name="chat" size={scale(20)} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.bookBtn} onPress={() => handleBookGuide(selectedGuide)}>
                  <Text style={styles.bookBtnText}>Book This Guide</Text>
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
  askBanner: {
    marginTop: verticalScale(10),
    marginBottom: verticalScale(16),
  },
  askTitle: {
    fontSize: moderateFontScale(22),
    fontWeight: '800',
    color: '#F5C518',
    lineHeight: moderateFontScale(28),
  },
  askSubtitle: {
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
  guideCard: {
    flexDirection: 'row',
    borderRadius: scale(20),
    borderWidth: 1.2,
    padding: scale(12),
    marginBottom: verticalScale(12),
  },
  avatarWrapper: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(16),
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeRating: {
    position: 'absolute',
    bottom: scale(4),
    right: scale(4),
    backgroundColor: '#F5C518',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(8),
    paddingHorizontal: scale(5),
    paddingVertical: verticalScale(1),
  },
  ratingText: {
    color: '#101010',
    fontSize: moderateFontScale(9),
    fontWeight: '800',
    marginLeft: scale(2),
  },
  guideDetails: {
    flex: 1,
    marginLeft: scale(14),
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guideName: {
    fontSize: moderateFontScale(15),
    fontWeight: '800',
  },
  cityBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(10),
  },
  cityBadgeText: {
    color: '#F5C518',
    fontSize: moderateFontScale(10),
    fontWeight: '700',
  },
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(4),
  },
  experienceText: {
    fontSize: moderateFontScale(12),
    marginLeft: scale(4),
  },
  specialtyText: {
    fontSize: moderateFontScale(12),
    fontWeight: '600',
    marginTop: verticalScale(4),
  },
  languagesRow: {
    flexDirection: 'row',
    gap: scale(6),
    marginTop: verticalScale(6),
  },
  langTag: {
    fontSize: moderateFontScale(9),
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: scale(8),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
  },
  noResultsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(40),
    paddingHorizontal: scale(20),
  },
  noResultsTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '700',
    marginBottom: verticalScale(6),
  },
  noResultsSub: {
    fontSize: moderateFontScale(12),
    textAlign: 'center',
    lineHeight: moderateFontScale(18),
    marginBottom: verticalScale(16),
  },
  resetButton: {
    backgroundColor: '#F5C518',
    borderRadius: scale(20),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20),
  },
  resetButtonText: {
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
    maxHeight: '85%',
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
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(10),
  },
  modalHeaderTitle: {
    fontSize: moderateFontScale(16),
    fontWeight: '800',
  },
  closeButton: {
    padding: scale(4),
  },
  modalScroll: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(30),
  },
  modalProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(14),
  },
  modalAvatar: {
    width: scale(90),
    height: scale(90),
    borderRadius: scale(20),
    overflow: 'hidden',
  },
  modalAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalProfileText: {
    flex: 1,
    marginLeft: scale(16),
    justifyContent: 'center',
  },
  modalName: {
    fontSize: moderateFontScale(19),
    fontWeight: '800',
    marginBottom: verticalScale(4),
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: verticalScale(4),
  },
  modalStarRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalRatingVal: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    marginLeft: scale(4),
  },
  modalExpText: {
    fontSize: moderateFontScale(12),
    marginTop: verticalScale(2),
  },
  modalSection: {
    marginTop: verticalScale(16),
  },
  modalSectionTitle: {
    color: '#F5C518',
    fontSize: moderateFontScale(14),
    fontWeight: '700',
    marginBottom: verticalScale(6),
  },
  specialtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 197, 24, 0.08)',
    borderRadius: scale(12),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    alignSelf: 'flex-start',
  },
  specialtyPillText: {
    color: '#ffffff',
    fontSize: moderateFontScale(13),
    fontWeight: '600',
  },
  modalBio: {
    fontSize: moderateFontScale(13),
    lineHeight: moderateFontScale(20),
  },
  modalLangRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  modalLangTag: {
    borderWidth: 1,
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
  },
  modalLangText: {
    fontSize: moderateFontScale(12),
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(14),
    borderTopWidth: 1.2,
    gap: scale(12),
  },
  contactBtn: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(14),
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtn: {
    flex: 1,
    backgroundColor: '#F5C518',
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    height: scale(50),
  },
  bookBtnText: {
    color: '#101010',
    fontSize: moderateFontScale(15),
    fontWeight: '800',
  },
});
