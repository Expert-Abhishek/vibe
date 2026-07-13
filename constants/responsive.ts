import { Dimensions, PixelRatio } from 'react-native';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

// Guideline base dimensions based on a standard phone screen (iPhone 11 Pro/X: 375 x 812)
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

/**
 * Scale horizontally based on screen width.
 */
export const scale = (size: number) => (windowWidth / GUIDELINE_BASE_WIDTH) * size;

/**
 * Scale vertically based on screen height.
 */
export const verticalScale = (size: number) => (windowHeight / GUIDELINE_BASE_HEIGHT) * size;

/**
 * Scale moderately to prevent over-scaling on extremely large/small devices.
 */
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Scale font size moderately and round to the nearest pixel.
 */
export const moderateFontScale = (size: number, factor = 0.4) => {
  const scaledSize = moderateScale(size, factor);
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
};
