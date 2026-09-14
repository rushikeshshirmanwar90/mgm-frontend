import { Platform } from 'react-native';

// ─── Design System Tokens ───────────────────────────────────────────────────
// Single cohesive palette for the entire application.
// All screens must reference these tokens — never hardcode accent colors.

export const Colors = {
  // Primary brand blue
  primary:        '#3A78B5',
  primaryDark:    '#295E94',
  primaryLight:   '#DCEEFF',
  primaryBorder:  '#B8D8F8',

  // Backgrounds
  background:     '#F8FAFC',
  surface:        '#FFFFFF',
  surfaceMuted:   '#F8FAFC',

  // Text
  textPrimary:    '#0F172A',
  textBody:       '#1E293B',
  textSecondary:  '#64748B',
  textTertiary:   '#94A3B8',

  // Border
  border:         '#E2E8F0',
  borderLight:    '#F1F5F9',
  borderCard:     '#EEF2F8',

  // Semantic
  success:        '#22C55E',
  successDark:    '#15803D',
  successLight:   '#F0FDF4',
  successBorder:  '#BBF7D0',
  warning:        '#F59E0B',
  warningDark:    '#B45309',
  warningLight:   '#FFFBEB',
  warningBorder:  '#FDE68A',
  error:          '#EF4444',
  errorDark:      '#B91C1C',
  errorLight:     '#FEF2F2',
  errorBorder:    '#FEE2E2',
  info:           '#3A78B5',
  infoLight:      '#DCEEFF',

  // Accent used for money / cost figures
  money:          '#10B981',

  // Legacy light/dark (kept for expo template compatibility)
  light: {
    text:             '#1E293B',
    background:       '#F8FAFC',
    tint:             '#3A78B5',
    icon:             '#64748B',
    tabIconDefault:   '#94A3B8',
    tabIconSelected:  '#3A78B5',
  },
  dark: {
    text:             '#ECEDEE',
    background:       '#151718',
    tint:             '#FFFFFF',
    icon:             '#9BA1A6',
    tabIconDefault:   '#9BA1A6',
    tabIconSelected:  '#FFFFFF',
  },
};

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  40,
};

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor:   '#1E293B',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius:  4,
    elevation:     2,
  },
  md: {
    shadowColor:   '#1E293B',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius:  10,
    elevation:     4,
  },
  lg: {
    shadowColor:   '#1E293B',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius:  20,
    elevation:     8,
  },
  card: {
    shadowColor:   '#1E293B',
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius:  22,
    elevation:     8,
  },
};

/**
 * Status → colour mapping used by badges, pills and stat tiles. Keeping it here
 * means a complaint's "resolved" green is the same green everywhere it appears.
 */
export const StatusColors = {
  pending:     { fg: Colors.warningDark, bg: Colors.warningLight, dot: Colors.warning, border: Colors.warningBorder, label: 'Pending' },
  on_hold:     { fg: '#475569',          bg: Colors.borderLight,   dot: Colors.textSecondary, border: Colors.border, label: 'On hold' },
  in_progress: { fg: Colors.primaryDark, bg: Colors.primaryLight, dot: Colors.primary, border: Colors.primaryBorder, label: 'In Progress' },
  resolved:    { fg: Colors.successDark, bg: Colors.successLight, dot: Colors.success, border: Colors.successBorder, label: 'Resolved' },
  rejected:    { fg: Colors.errorDark,   bg: Colors.errorLight,   dot: Colors.error,   border: Colors.errorBorder,   label: 'Rejected' },
} as const;

export const PriorityColors = {
  low:      { fg: '#64748B', bg: '#F1F5F9' },
  medium:   { fg: '#B45309', bg: '#FFFBEB' },
  high:     { fg: '#C2410C', bg: '#FFF7ED' },
  critical: { fg: '#B91C1C', bg: '#FEF2F2' },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans:    'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif:   'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/** Formats a number as Indian rupees with no decimal noise. */
export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
