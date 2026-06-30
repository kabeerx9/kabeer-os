import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { AppText, BrandWordmark, colors, radius, spacing } from "@/design-system";

export function SplashScreen() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.12],
  });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.32],
  });

  return (
    <View style={styles.screen}>
      <View style={styles.body}>
        <BrandWordmark size="xl" style={styles.mark} />
        <AppText variant="bodySmall" tone="secondary" align="center" style={styles.tagline}>
          Launch faster. Build cleaner.
        </AppText>
        <Animated.View
          style={[
            styles.pulseHalo,
            {
              opacity: haloOpacity,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={styles.pulseDot} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface.card,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  mark: {
    alignSelf: "center",
  },
  tagline: {
    marginTop: spacing.lg,
    maxWidth: 240,
  },
  pulseHalo: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
    borderRadius: radius.full,
    backgroundColor: colors.brand.mint,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.brand.mint,
  },
});
