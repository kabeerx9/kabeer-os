import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet } from "react-native";

import { borderWidth, colors, radius, shadows, spacing } from "@/design-system/tokens";

type IconButtonTone = "plain" | "card" | "purple" | "mint" | "danger";

type IconButtonProps = {
  children: ReactNode;
  accessibilityLabel: string;
  onPress?: () => void;
  tone?: IconButtonTone;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const toneStyle: Record<IconButtonTone, ViewStyle> = {
  plain: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  card: {
    backgroundColor: colors.surface.card,
    borderColor: colors.border.hairline,
  },
  purple: {
    backgroundColor: colors.brand.purple600,
    borderColor: colors.brand.purple600,
  },
  mint: {
    backgroundColor: colors.brand.mint,
    borderColor: colors.brand.mint,
  },
  danger: {
    backgroundColor: colors.surface.card,
    borderColor: colors.status.errorBorder,
  },
};

export function IconButton({
  children,
  accessibilityLabel,
  onPress,
  tone = "card",
  size = 44,
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={spacing.sm}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        toneStyle[tone],
        tone !== "plain" && shadows.soft,
        {
          width: size,
          height: size,
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radius.full,
    borderWidth: borderWidth.hairline,
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
});
