import type { ViewStyle } from "react-native";

export const colors = {
  brand: {
    mint: "#8EE3C1",
    mintHover: "#7DD4B2",
    lavender: "#BCA7FF",
    lavenderLight: "#EDE8FF",
    purple600: "#26215C",
    purple500: "#534AB7",
  },
  discovery: {
    teal: "#1D9E75",
    deep: "#04342C",
  },
  status: {
    success: "#22C55E",
    emerald: "#10B981",
    emeraldDark: "#064E3B",
    emeraldText: "#0F6E56",
    error: "#E24B4A",
    errorBorder: "#F0999E",
    warning: "#F97316",
    amber: "#F59E0B",
  },
  transport: {
    walk: "#51CF66",
    ride: "#FF922B",
    transit: "#9775FA",
    bike: "#339AF0",
  },
  surface: {
    app: "#FAFAF8",
    warm: "#F8F7F4",
    cool: "#F2F2F7",
    card: "#FFFFFF",
    elevated: "#FFFFFF",
    dark: "#1C1C1E",
    inverse: "#111827",
  },
  text: {
    primary: "#1C1C1E",
    secondary: "rgba(60,60,67,0.72)",
    tertiary: "rgba(60,60,67,0.55)",
    muted: "#9CA3AF",
    inverse: "#FFFFFF",
    onMint: "#111827",
    onPurple: "#FFFFFF",
  },
  border: {
    hairline: "rgba(60,60,67,0.10)",
    subtle: "#E5E7EB",
    warm: "#E8E5DF",
    lavender: "#D6CFFF",
  },
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  page: 16,
  sectionGap: 24,
  cardPadding: 16,
  bottomNavHeight: 64,
  statusBarHeight: 44,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  sheet: 24,
  full: 9999,
} as const;

export const borderWidth = {
  hairline: 0.5,
  tab: 0.33,
  thin: 1,
  emphasis: 1.5,
} as const;

export const typography = {
  fontFamily: {
    logo: "Space Grotesk",
    ui: "Inter",
    editorial: "DM Serif Display",
    fallback: "System",
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  size: {
    hero: 32,
    heading: 28,
    title: 20,
    subhead: 17,
    body: 14,
    bodySmall: 12,
    caption: 11,
    label: 9,
  },
  lineHeight: {
    hero: 38,
    heading: 34,
    title: 26,
    subhead: 22,
    body: 20,
    bodySmall: 17,
    caption: 15,
    label: 12,
  },
} as const;

export const shadows = {
  none: {},
  soft: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  purple: {
    shadowColor: colors.brand.purple600,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  mint: {
    shadowColor: colors.brand.mint,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 3,
  },
} satisfies Record<string, ViewStyle>;

export const layout = {
  tabBarHeight: spacing.bottomNavHeight,
  icon: {
    tab: 20,
    action: 16,
    nav: 14,
    badge: 8,
  },
  hitSlop: {
    top: 8,
    right: 8,
    bottom: 8,
    left: 8,
  },
} as const;

export const designTokens = {
  colors,
  spacing,
  radius,
  borderWidth,
  typography,
  shadows,
  layout,
} as const;

export type DesignTokens = typeof designTokens;
