import { Pressable, StyleSheet, Text, View, type PressableProps, type ViewStyle } from 'react-native';

import { Fonts } from '@/constants/theme';
import { IconSymbol, type IconSymbolName } from './icon-symbol';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = PressableProps & {
  title: string;
  subtitle?: string;
  iconName?: IconSymbolName;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
};

const BUTTON_STYLE = {
  primary: {
    backgroundColor: '#F5C518',
    borderColor: 'transparent',
    textColor: '#101010',
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    textColor: '#FFFFFF',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.18)',
    textColor: '#FFFFFF',
  },
  disabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
    textColor: 'rgba(255,255,255,0.55)',
  },
} as const;

export function Button({
  title,
  subtitle,
  iconName,
  variant = 'primary',
  disabled = false,
  onPress,
  style,
  ...props
}: ButtonProps) {
  const appearance = disabled ? BUTTON_STYLE.disabled : BUTTON_STYLE[variant];

  const hasIcon = Boolean(iconName);

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: appearance.backgroundColor,
          borderColor: appearance.borderColor,
          opacity: pressed ? 0.88 : 1,
        },
        style,
      ]}
      android_ripple={{ color: 'rgba(255,255,255,0.14)' }}
      {...props}>
      <View style={[styles.row, !hasIcon && styles.centerContent]}>
        {hasIcon ? (
          <View style={[styles.iconContainer, variant === 'ghost' && styles.iconGhost]}>
            <IconSymbol name={iconName!} size={20} color={appearance.textColor} />
          </View>
        ) : null}

        <View style={[styles.textBlock, !hasIcon && styles.centerTextBlock]}>
          <Text style={[styles.title, { color: appearance.textColor, textAlign: hasIcon ? 'left' : 'center' }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: appearance.textColor, textAlign: hasIcon ? 'left' : 'center' }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerContent: {
    justifyContent: 'center',
  },
  centerTextBlock: {
    flex: 0,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconGhost: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.rounded,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
});
