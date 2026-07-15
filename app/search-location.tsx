import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateFontScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';

const GOOGLE_MAPS_KEY = 'AIzaSyBDo89INLAVgmvmjCJHR9ZP66gNeE5uy7o';

interface PresetDestination {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

const popularLocations: PresetDestination[] = [
  { name: 'Kempegowda International Airport (BLR)', address: 'KIAL Road, Devanahalli, Bengaluru, Karnataka', latitude: 13.1986, longitude: 77.7066 },
  { name: 'Majestic Railway Station', address: 'Subhash Nagar, Bengaluru, Karnataka', latitude: 12.9784, longitude: 77.5694 },
  { name: 'Indiranagar 100 Feet Road', address: 'Indiranagar, Bengaluru, Karnataka', latitude: 12.9629, longitude: 77.6377 },
  { name: 'Bannerghatta Biological Park', address: 'Bannerghatta, Bengaluru, Karnataka', latitude: 12.7854, longitude: 77.5905 },
  { name: 'Nandi Hills', address: 'Chikkaballapur, Karnataka', latitude: 13.3702, longitude: 77.6835 },
  { name: 'Mysuru Palace', address: 'Mysuru, Karnataka', latitude: 12.3053, longitude: 76.6552 },
];

export default function SearchLocationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const colors = {
    background: isDark ? '#101014' : '#F5F5F7',
    surface: isDark ? '#1E1E24' : '#FFFFFF',
    textPrimary: isDark ? '#ffffff' : '#1C1C1E',
    textMuted: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)',
    border: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
    amber: '#F5C518',
  };

  useEffect(() => {
    if (searchText.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchGooglePlaces(searchText);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  const searchGooglePlaces = async (query: string) => {
    setLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${GOOGLE_MAPS_KEY}&location=12.9716,77.5946&radius=100000`;
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.predictions) {
        setSuggestions(data.predictions);
      }
    } catch (e) {
      console.error('Error fetching suggestions:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = async (placeId: string, description: string) => {
    setLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.result && data.result.geometry) {
        const { lat, lng } = data.result.geometry.location;
        navigateToBooking({
          name: data.result.name || description.split(',')[0],
          address: description,
          latitude: lat,
          longitude: lng,
        });
      }
    } catch (e) {
      console.error('Error fetching place details:', e);
      Alert.alert('Search Error', 'Failed to retrieve place coordinates.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToBooking = (destination: PresetDestination) => {
    router.push({
      pathname: '/book-cab',
      params: {
        dropName: destination.name,
        dropAddress: destination.address,
        dropLat: destination.latitude.toString(),
        dropLng: destination.longitude.toString(),
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="close" size={scale(24)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Choose Destination</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.titleText}>Where are you going?</Text>
          <Text style={[styles.subtitleText, { color: colors.textMuted }]}>
            Enter drop location address to view estimated route path and booking rates.
          </Text>
        </View>

        {/* Autocomplete Input Bar */}
        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.amber }]}>
          <MaterialIcons name="location-searching" size={scale(18)} color={colors.amber} style={styles.searchIcon} />
          <TextInput
            autoFocus
            placeholder="Type search address..."
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)'}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
          />
          {loading && <ActivityIndicator size="small" color={colors.amber} style={{ marginRight: scale(8) }} />}
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <MaterialIcons name="clear" size={scale(18)} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Suggestion list */}
        {suggestions.length > 0 && (
          <View style={[styles.suggestionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectSuggestion(item.place_id, item.description)}
              >
                <MaterialIcons name="location-on" size={scale(18)} color={colors.textMuted} style={{ marginRight: scale(10) }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.suggestionName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {item.structured_formatting?.main_text || item.description.split(',')[0]}
                  </Text>
                  <Text style={[styles.suggestionSub, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.structured_formatting?.secondary_text || item.description}
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward" size={scale(16)} color={colors.amber} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Popular Locations Presets */}
        {suggestions.length === 0 && (
          <View style={styles.popularSection}>
            <Text style={[styles.sectionTitle, { color: colors.amber }]}>Popular Karnataka Destinations</Text>
            {popularLocations.map((loc, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.presetRow, { borderBottomColor: colors.border }]}
                onPress={() => navigateToBooking(loc)}
              >
                <View style={[styles.presetIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                  <MaterialIcons name="star" size={scale(16)} color={colors.amber} />
                </View>
                <View style={styles.presetDetails}>
                  <Text style={[styles.presetName, { color: colors.textPrimary }]}>{loc.name}</Text>
                  <Text style={[styles.presetAddress, { color: colors.textMuted }]} numberOfLines={1}>
                    {loc.address}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Spacing */}
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
  titleSection: {
    marginTop: verticalScale(10),
    marginBottom: verticalScale(16),
  },
  titleText: {
    fontSize: moderateFontScale(22),
    fontWeight: '800',
    color: '#F5C518',
  },
  subtitleText: {
    fontSize: moderateFontScale(13),
    marginTop: verticalScale(6),
    lineHeight: moderateFontScale(18),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: scale(16),
    paddingHorizontal: scale(14),
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
  suggestionBox: {
    borderWidth: 1.2,
    borderRadius: scale(16),
    overflow: 'hidden',
    marginBottom: verticalScale(10),
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    borderBottomWidth: 1.2,
  },
  suggestionName: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  suggestionSub: {
    fontSize: moderateFontScale(10),
    marginTop: verticalScale(2),
  },
  popularSection: {
    marginTop: verticalScale(4),
  },
  sectionTitle: {
    fontSize: moderateFontScale(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: verticalScale(10),
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1.2,
  },
  presetIconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  presetDetails: {
    flex: 1,
  },
  presetName: {
    fontSize: moderateFontScale(13),
    fontWeight: '700',
  },
  presetAddress: {
    fontSize: moderateFontScale(10),
    marginTop: verticalScale(2),
  },
});
