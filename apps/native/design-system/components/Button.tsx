import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/design-system/components/Text";
import { borderWidth, colors, radius, shadows, spacing } from "@/design-system/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "circle";

type ButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  leftAccessory?: ReactNode;
  rightAccessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const variantStyle: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.brand.mint,
    borderColor: colors.brand.mint,
  },
  secondary: {
    backgroundColor: colors.brand.purple600,
    borderColor: colors.brand.purple600,
  },
  ghost: {
    backgroundColor: colors.surface.card,
    borderColor: colors.border.hairline,
  },
  dark: {
    backgroundColor: colors.surface.inverse,
    borderColor: colors.surface.inverse,
  },
  destructive: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.status.errorBorder,
  },
};

const textTone: Record<ButtonVariant, "primary" | "inverse"> = {
  primary: "primary",
  secondary: "inverse",
  ghost: "primary",
  dark: "inverse",
  destructive: "primary",
};

const sizeStyle: Record<ButtonSize, ViewStyle> = {
  sm: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  md: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  circle: {
    width: 44,
    height: 44,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
};

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  leftAccessory,
  rightAccessory,
  style,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyle[variant],
        sizeStyle[size],
        variant === "secondary" && shadows.purple,
        size === "circle" && styles.circle,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {leftAccessory}
        <AppText
          variant={size === "sm" ? "caption" : "bodySmall"}
          tone={textTone[variant]}
          weight="semibold"
          style={variant === "destructive" ? styles.destructiveText : undefined}
        >
          {children}
        </AppText>
        {rightAccessory}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: borderWidth.thin,
  },
  circle: {
    borderRadius: radius.full,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  destructiveText: {
    color: colors.status.error,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
