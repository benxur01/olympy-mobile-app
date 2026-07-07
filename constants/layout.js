import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const GUIDELINE_WIDTH = 412;
const GUIDELINE_HEIGHT = 892;

export const SCREEN = { width, height };

export const scale = (size) => Math.round((width / GUIDELINE_WIDTH) * size * 100) / 100;

export const verticalScale = (size) =>
  Math.round((height / GUIDELINE_HEIGHT) * size * 100) / 100;

export const moderateScale = (size, factor = 0.5) =>
  Math.round((size + (scale(size) - size) * factor) * 100) / 100;
