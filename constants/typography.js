// Olympy design uses Manrope (font-weights 400 / 600 / 700 / 800).
// Weight hierarchy preserved 1:1 — every screen references FONTS.* so the
// switch from Roboto → Manrope propagates from this single file.
export const FONTS = {
  regular: 'Manrope_400Regular',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};

export const FONT_SIZES = {
  xxs: 9.5,
  xs: 10,
  xs2: 10.5,
  sm: 11,
  sm2: 11.5,
  base: 12,
  base2: 12.5,
  md: 13,
  md2: 13.5,
  lg: 14,
  lg2: 14.5,
  xl: 15,
  xl2: 15.5,
  xxl: 16,
  title: 17,
  title2: 17.5,
  h4: 18,
  h3: 19,
  h2: 21,
  h1: 23,
  stat: 22,
  stat2: 24,
  score: 32,
  display: 34,
};
