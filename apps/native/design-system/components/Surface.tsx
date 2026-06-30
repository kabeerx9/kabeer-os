import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";

import { borderWidth, colors, radius, shadows, spacing } from "@/design-system/tokens";

type SurfaceTone = "card" | "warm" | "cool" | "lavender" | "mint" | "dark";

type SurfaceProps = {
  children: ReactNode;
  tone?: SurfaceTone;
  elevated?: boolean;
  bordered?: boolean;
  padding?: keyof typeof spacing | "none";
  radiusSize?: keyof typeof radius;
  style?: StyleProp<ViewStyle>;
};

const toneStyles: Record<SurfaceTone, ViewStyle> = {
  card: {
    backgroundColor: colors.surface.card,
  },
  warm: {
    backgroundColor: colors.surface.warm,
  },
  cool: {
    backgroundColor: colors.surface.cool,
  },
  lavender: {
    backgroundColor: colors.brand.lavenderLight,
  },
  mint: {
    backgroundColor: "rgba(142,227,193,0.18)",
  },
  dark: {
    backgroundColor: colors.surface.dark,
  },
};

export function Surface({
  children,
  tone = "card",
  elevated = false,
  bordered = true,
  padding = "lg",
  radiusSize = "lg",
  style,
}: SurfaceProps) {
  return (
    <View
      style={[
        styles.base,
        toneStyles[tone],
        {
          borderRadius: radius[radiusSize],
          padding: padding === "none" ? 0 : spacing[padding],
        },
        bordered && styles.bordered,
        elevated && shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
  bordered: {
    borderWidth: borderWidth.hairline,
    borderColor: colors.border.hairline,
  },
});
