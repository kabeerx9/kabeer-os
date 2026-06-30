import { colors, designTokens } from "@/design-system";

export { designTokens };

export const NAV_THEME = {
  light: {
    background: colors.surface.app,
    border: colors.border.hairline,
    card: colors.surface.card,
    notification: colors.status.error,
    primary: colors.brand.purple600,
    text: colors.text.primary,
  },
  dark: {
    background: colors.surface.dark,
    border: "rgba(255,255,255,0.12)",
    card: "#242427",
    notification: colors.status.error,
    primary: colors.brand.mint,
    text: colors.text.inverse,
  },
};
