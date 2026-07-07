// Olympy design system — extracted 1:1 from the "Olympy.dc.html" mockup
// (navy/blue, Manrope). The design is DARK-first: all 21 screens ship
// dark="true", so DARK_COLORS carries the authoritative brand hex values.
// Seed / primary: #2E90FA (blue). Surfaces: navy #0B1220 / #131C2E.
//
// LIGHT_COLORS is a Material-style light conversion of the same design:
// brand accents (blue / gold / green / red / purple) are preserved, only the
// surfaces + text are flipped to a light navy-tinted scheme. Key names are
// shared between both modes so every screen/component (COLORS.* / TINTS.* or
// useTheme()) recolors automatically.

// ── DARK — authoritative design palette (Olympy.dc.html) ────────────────
export const DARK_COLORS = {
  // ── Surfaces & structure ──────────────────────────────────────
  bg: '#0B1220',            // screen background (navy)
  surface: '#131C2E',       // card / raised surface
  surfaceDeep: '#0F1830',   // nested surface / inputs / bottom nav
  navBg: '#0F1830',         // bottom navigation bar
  border: '#1E2A44',        // soft outline
  borderStrong: '#223050',  // emphasized outline
  divider: '#1C2942',
  borderDashed: '#223050',
  text: '#EDF2FA',          // primary text
  textSecondary: '#8FA0BC', // muted blue-gray label
  textMuted: '#5C6C88',     // faint blue-gray
  textBody: '#C6D0E0',      // body copy

  // ── Primary (blue) — legacy key "blue" ────────────────────────
  blue: '#2E90FA',          // primary
  blueLight: '#7CBAFC',     // light-blue accent text / icons on dark
  blueDeep: '#1D6FD1',      // darker blue (avatars / pressed)
  blueSoftText: '#7CBAFC',  // light-blue text on blue-tint container

  // ── Amber / gold (warm accent) ────────────────────────────────
  gold: '#F2B01E',
  goldText: '#241A03',      // dark text on solid gold
  goldMuted: '#C9A24B',
  goldSoftText: '#F5C36B',  // light gold text on gold-tint container

  // ── Green (success) ───────────────────────────────────────────
  green: '#10B981',      // solid success fills / buttons
  greenLight: '#34D399', // bright success text / icon accent on dark

  // ── Red (error) ───────────────────────────────────────────────
  red: '#EF4444',
  redSoftText: '#F0A0A0',   // light red text on red-tint container

  // ── Orange / warning ──────────────────────────────────────────
  orange: '#F59E0B',
  orangeSoftText: '#FBBF6B',

  // ── Purple ────────────────────────────────────────────────────
  purple: '#7C58FA',
  purpleLight: '#A78BFA',

  // ── Neutrals & medals ─────────────────────────────────────────
  gray: '#667085',
  slate: '#94A3B8',
  silver: '#A6B2C6',
  bronze: '#B0793D',

  // ── Chart bars ────────────────────────────────────────────────
  barIdle: '#223050',
  barMid: '#1D6FD1',

  // ── Logo container ────────────────────────────────────────────
  logoBg: '#132038',        // blue-tinted container
  logoBorder: '#25436E',

  // ── Payment brands ────────────────────────────────────────────
  payme: '#33CCCC',
  paymeText: '#04302F',
  click: '#0073FF',

  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.6)',

  // ── Extra tokens (opt-in for components) ──────────────────────
  onPrimary: '#FFFFFF',
  primaryContainer: '#25436E',
  onPrimaryContainer: '#7CBAFC',
  secondaryContainer: '#1C2942',
  onSecondaryContainer: '#C6D0E0',
  surfaceContainer: '#1C2942',
  outline: '#5C6C88',
  outlineVariant: '#223050',
  shadow: '#000000',
};

// ── LIGHT — Material light conversion (brand hues preserved) ────────────
export const LIGHT_COLORS = {
  bg: '#F5F8FD',            // very light navy tint
  surface: '#FFFFFF',
  surfaceDeep: '#EEF3FB',   // nested surface / inputs
  navBg: '#FFFFFF',
  border: '#E2E8F2',
  borderStrong: '#CDD8EA',
  divider: '#EAEFF7',
  borderDashed: '#CDD8EA',
  text: '#0B1220',          // navy text for contrast
  textSecondary: '#5C6C88',
  textMuted: '#8FA0BC',
  textBody: '#334155',

  blue: '#2E90FA',          // keep primary brand blue
  blueLight: '#1D6FD1',     // darker accent for contrast on light
  blueDeep: '#1B5FB5',
  blueSoftText: '#1D6FD1',

  gold: '#F2B01E',
  goldText: '#241A03',
  goldMuted: '#8A6D00',
  goldSoftText: '#6B5300',

  green: '#10B981',
  greenLight: '#059669',    // darker for accent text on light

  red: '#EF4444',
  redSoftText: '#B42318',

  orange: '#F59E0B',
  orangeSoftText: '#B45309',

  purple: '#7C58FA',
  purpleLight: '#6941C6',

  gray: '#667085',
  slate: '#5C6C88',
  silver: '#94A3B8',
  bronze: '#B0793D',

  barIdle: '#E2E8F2',
  barMid: '#9CC5F5',

  logoBg: '#E4EFFE',
  logoBorder: '#BBD9FC',

  payme: '#33CCCC',
  paymeText: '#04302F',
  click: '#0073FF',

  white: '#FFFFFF',
  overlay: 'rgba(11,18,32,0.45)',

  onPrimary: '#FFFFFF',
  primaryContainer: '#D6E8FE',
  onPrimaryContainer: '#0A3A6B',
  secondaryContainer: '#E8EEF7',
  onSecondaryContainer: '#334155',
  surfaceContainer: '#EEF3FB',
  outline: '#8FA0BC',
  outlineVariant: '#CDD8EA',
  shadow: '#0B1220',
};

export const withAlpha = (hex, alpha) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// Alpha tints recompute from whichever base color set is passed in —
// used both for the static (backward-compat) TINTS below and for the
// dynamic per-theme tints handed out by ThemeContext's useTheme().
// The base hues (blue/green/red/gold/orange/purple/slate) are identical in
// both modes, so these reproduce the design's rgba() tints exactly.
export const buildTints = (colors) => ({
  blue14: withAlpha(colors.blue, 0.14),
  blue13: withAlpha(colors.blue, 0.13),
  blue10: withAlpha(colors.blue, 0.1),
  blue08: withAlpha(colors.blue, 0.08),
  blue06: withAlpha(colors.blue, 0.06),
  blueBorder30: withAlpha(colors.blue, 0.3),
  green14: withAlpha(colors.green, 0.14),
  green13: withAlpha(colors.green, 0.13),
  green07: withAlpha(colors.green, 0.07),
  greenBorder30: withAlpha(colors.green, 0.3),
  greenBorder40: withAlpha(colors.green, 0.4),
  red16: withAlpha(colors.red, 0.16),
  red15: withAlpha(colors.red, 0.15),
  red14: withAlpha(colors.red, 0.14),
  red13: withAlpha(colors.red, 0.13),
  red12: withAlpha(colors.red, 0.12),
  red10: withAlpha(colors.red, 0.1),
  red07: withAlpha(colors.red, 0.07),
  red06: withAlpha(colors.red, 0.06),
  redBorder35: withAlpha(colors.red, 0.35),
  redBorder40: withAlpha(colors.red, 0.4),
  gold18: withAlpha(colors.gold, 0.18),
  gold14: withAlpha(colors.gold, 0.14),
  gold13: withAlpha(colors.gold, 0.13),
  gold10: withAlpha(colors.gold, 0.1),
  gold08: withAlpha(colors.gold, 0.08),
  gold07: withAlpha(colors.gold, 0.07),
  gold06: withAlpha(colors.gold, 0.06),
  goldBorder30: withAlpha(colors.gold, 0.3),
  goldBorder35: withAlpha(colors.gold, 0.35),
  goldBorder40: withAlpha(colors.gold, 0.4),
  goldBorder45: withAlpha(colors.gold, 0.45),
  orange14: withAlpha(colors.orange, 0.14),
  orange13: withAlpha(colors.orange, 0.13),
  orange10: withAlpha(colors.orange, 0.1),
  orangeBorder30: withAlpha(colors.orange, 0.3),
  orangeBorder35: withAlpha(colors.orange, 0.35),
  orangeBorder40: withAlpha(colors.orange, 0.4),
  purple16: withAlpha(colors.purple, 0.16),
  purpleBorder35: withAlpha(colors.purple, 0.35),
  slate14: withAlpha(colors.slate, 0.14),
});

// Backward-compat static exports — the design is dark-first, so default the
// static palette to DARK (screens not yet on useTheme() render the intended
// navy look instead of a mismatched light one).
export const COLORS = DARK_COLORS;
export const TINTS = buildTints(DARK_COLORS);
