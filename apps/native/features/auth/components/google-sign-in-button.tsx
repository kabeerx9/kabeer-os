import { useSSO } from "@clerk/expo";
import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, colors, radius, spacing } from "@/design-system";
import { appRoutes } from "@/navigation/routes";

export function GoogleSignInButton() {
  const { startSSOFlow } = useSSO();
  const router = useRouter();

  const onPress = async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ path: "sso-callback" }),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace(appRoutes.home);
      }
    } catch (err) {
      console.error("Google sign-in failed:", err);
    }
  };

  return (
    <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.googleMark}>
          <AppText variant="caption" weight="bold">
            G
          </AppText>
        </View>
        <AppText variant="bodySmall" weight="semibold" tone="secondary">
          Continue with Google
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderWidth: 0.5,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface.card,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  googleMark: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: colors.surface.warm,
  },
  pressed: {
    opacity: 0.7,
  },
});
