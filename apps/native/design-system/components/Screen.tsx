import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/design-system/tokens";

type ScreenProps = {
  children: ReactNode;
  padded?: boolean;
  safe?: boolean;
  background?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

export function Screen({
  children,
  padded = true,
  safe = true,
  background = colors.surface.app,
  style,
  contentStyle,
}: ScreenProps) {
  const Container = safe ? SafeAreaView : View;

  return (
    <Container style={[styles.root, { backgroundColor: background }, style]}>
      <View style={[styles.content, padded && styles.padded, contentStyle]}>{children}</View>
    </Container>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.lg,
  },
});
