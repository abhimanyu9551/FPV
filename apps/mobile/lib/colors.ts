// Material Design 3 color tokens — synced with Stitch web designs
export const Colors = {
  // Primary – deep rose/pink
  primary: '#b11a51',
  onPrimary: '#ffffff',
  primaryFixed: '#ffd9df',
  onPrimaryFixed: '#3f0017',
  primaryFixedDim: '#ffb1c0',
  onPrimaryFixedVariant: '#90003d',
  primaryContainer: '#d33769',
  onPrimaryContainer: '#fffbff',

  // Secondary – deep teal
  secondary: '#006b5f',
  onSecondary: '#ffffff',
  secondaryContainer: '#9cefe0',
  onSecondaryContainer: '#0a6f63',
  secondaryFixed: '#9ff2e3',
  secondaryFixedDim: '#83d5c7',
  onSecondaryFixed: '#00201c',
  onSecondaryFixedVariant: '#005047',

  // Tertiary – amber/orange
  tertiary: '#845000',
  onTertiary: '#ffffff',
  tertiaryContainer: '#a66600',
  onTertiaryContainer: '#fffbff',
  tertiaryFixed: '#ffddba',
  tertiaryFixedDim: '#ffb866',
  onTertiaryFixed: '#2b1700',
  onTertiaryFixedVariant: '#673d00',

  // Surface & background
  background: '#fff8f7',
  onBackground: '#25181a',
  surface: '#fff8f7',
  onSurface: '#25181a',
  surfaceVariant: '#f6dce0',
  onSurfaceVariant: '#584045',
  surfaceDim: '#edd4d7',
  surfaceBright: '#fff8f7',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#fff0f1',
  surfaceContainer: '#ffe9eb',
  surfaceContainerHigh: '#fce2e5',
  surfaceContainerHighest: '#f6dce0',

  // Inverse
  inverseSurface: '#3c2c2f',
  inverseOnSurface: '#ffecee',
  inversePrimary: '#ffb1c0',

  // Outline
  outline: '#8c7075',
  outlineVariant: '#e0bec3',

  // Error
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  // Utility aliases for easy use
  white: '#ffffff',
  black: '#000000',
  success: '#22C55E',
  danger: '#ba1a1a',
  warning: '#ffb866',

  // Card palette for variety (updated to match design)
  cards: ['#b11a51', '#006b5f', '#845000', '#3c2c2f', '#d33769', '#a66600'],
};

export type CardColor = (typeof Colors.cards)[number];

export const Typography = {
  hero: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1 },
  h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 16, fontWeight: '500' as const },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.5 },
  labelXs: { fontSize: 12, fontWeight: '500' as const },
  caption: { fontSize: 11, fontWeight: '400' as const },
  stat: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -1 },
};

export const Radius = {
  sm: 8,
  md: 16,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  page: 16,
};

// Hard shadow (offset block shadow like the Stitch web designs)
export const HardShadow = {
  primary: {
    shadowColor: '#b11a51',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  charcoal: {
    shadowColor: '#25181a',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
};
