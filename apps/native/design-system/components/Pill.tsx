import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { borderWidth, colors, radius, spacing } from "@/design-system/tokens";

type PillTone = "selected" | "neutral" | "mint" | "lavender" | "error" | "warning";

type PillProps = {
  children: ReactNode;
  tone?: PillTone;
  leadingDot?: boolean;
  style?: StyleProp<ViewStyle>;
};

const toneStyle: Record<PillTone, ViewStyle> = {
  selected: {
    backgroundColor: colors.brand.purple600,
    borderColor: colors.brand.purple600,
  },
  neutral: {
    backgroundColor: colors.surface.card,
    borderColor: colors.border.hairline,
  },
  mint: {
    backgroundColor: "rgba(142,227,193,0.24)",
    borderColor: "rgba(16,185,129,0.22)",
  },
  lavender: {
    backgroundColor: colors.brand.lavenderLight,
    borderColor: colors.border.lavender,
  },
  error: {
    backgroundColor: "#FEE2E2",
    borderColor: colors.status.errorBorder,
  },
  warning: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
};

const textTone: Record<PillTone, "primary" | "secondary" | "inverse" | "brand"> = {
  selected: "inverse",
  neutral: "secondary",
  mint: "primary",
  lavender: "brand",
  error: "primary",
  warning: "primary",
};

export function Pill({ children, tone = "neutral", leadingDot = false, style }: PillProps) {
  return (
    <View style={[styles.base, toneStyle[tone], style]}>
      {leadingDot ? <View style={[styles.dot, tone === "warning" && styles.warningDot]} /> : null}
      <AppText variant="label" tone={textTone[tone]} weight="semibold">
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.full,
    borderWidth: borderWidth.hairline,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.status.emerald,
  },
  warningDot: {
    backgroundColor: colors.status.warning,
  },
});
