import type { ReactNode } from "react";
import type { StyleProp, TextStyle } from "react-native";
import { StyleSheet, Text as NativeText } from "react-native";

import { colors, typography } from "@/design-system/tokens";

export type TextTone = "primary" | "secondary" | "tertiary" | "muted" | "inverse" | "brand";
export type TextVariant =
  | "hero"
  | "heading"
  | "title"
  | "subhead"
  | "body"
  | "bodySmall"
  | "caption"
  | "label";

type AppTextProps = {
  children: ReactNode;
  variant?: TextVariant;
  tone?: TextTone;
  weight?: keyof typeof typography.weight;
  align?: TextStyle["textAlign"];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
};

const toneColor: Record<TextTone, string> = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  tertiary: colors.text.tertiary,
  muted: colors.text.muted,
  inverse: colors.text.inverse,
  brand: colors.brand.purple600,
};

const variantStyle: Record<TextVariant, TextStyle> = {
  hero: {
    fontSize: typography.size.hero,
    lineHeight: typography.lineHeight.hero,
    fontWeight: typography.weight.bold,
  },
  heading: {
    fontSize: typography.size.heading,
    lineHeight: typography.lineHeight.heading,
    fontWeight: typography.weight.bold,
  },
  title: {
    fontSize: typography.size.title,
    lineHeight: typography.lineHeight.title,
    fontWeight: typography.weight.bold,
  },
  subhead: {
    fontSize: typography.size.subhead,
    lineHeight: typography.lineHeight.subhead,
    fontWeight: typography.weight.semibold,
  },
  body: {
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    fontWeight: typography.weight.regular,
  },
  bodySmall: {
    fontSize: typography.size.bodySmall,
    lineHeight: typography.lineHeight.bodySmall,
    fontWeight: typography.weight.regular,
  },
  caption: {
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    fontWeight: typography.weight.regular,
  },
  label: {
    fontSize: typography.size.label,
    lineHeight: typography.lineHeight.label,
    fontWeight: typography.weight.semibold,
  },
};

export function AppText({
  children,
  variant = "body",
  tone = "primary",
  weight,
  align,
  numberOfLines,
  style,
}: AppTextProps) {
  return (
    <NativeText
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        variantStyle[variant],
        {
          color: toneColor[tone],
          textAlign: align,
          fontWeight: weight ? typography.weight[weight] : variantStyle[variant].fontWeight,
        },
        style,
      ]}
    >
      {children}
    </NativeText>
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0,
  },
});
