import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '@/hooks/use-language';
import { moderateFontScale, scale, verticalScale } from '@/constants/responsive';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface LanguageSelectorProps {
  compact?: boolean;
}

export default function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const [currentLang, setAppLanguage] = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const toggleLanguage = (targetLang: 'en' | 'kn') => {
    setAppLanguage(targetLang);
  };

  const isKn = currentLang === 'kn';

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactBtn,
          {
            backgroundColor: isDark ? 'rgba(245, 197, 24, 0.15)' : '#FFFBEB',
            borderColor: '#F5C518',
          },
        ]}
        onPress={() => toggleLanguage(isKn ? 'en' : 'kn')}
      >
        <Text style={[styles.compactText, { color: isDark ? '#F5C518' : '#D97706' }]}>
          {isKn ? '🇬🇧 EN' : '🇮🇳 ಕನ್ನಡ'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.pillContainer,
        {
          backgroundColor: isDark ? '#16161B' : '#EAEAEA',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.pillSegment,
          !isKn && { backgroundColor: '#F5C518' },
        ]}
        onPress={() => toggleLanguage('en')}
      >
        <Text style={[styles.pillText, { color: !isKn ? '#101014' : isDark ? '#FFFFFF' : '#666666', fontWeight: !isKn ? '900' : '600' }]}>
          🇬🇧 EN
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.pillSegment,
          isKn && { backgroundColor: '#F5C518' },
        ]}
        onPress={() => toggleLanguage('kn')}
      >
        <Text style={[styles.pillText, { color: isKn ? '#101014' : isDark ? '#FFFFFF' : '#666666', fontWeight: isKn ? '900' : '600' }]}>
          🇮🇳 ಕನ್ನಡ
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  compactBtn: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(14),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactText: {
    fontSize: moderateFontScale(11),
    fontWeight: '800',
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(2),
    borderRadius: scale(16),
    borderWidth: 1,
  },
  pillSegment: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(14),
  },
  pillText: {
    fontSize: moderateFontScale(11),
  },
});
