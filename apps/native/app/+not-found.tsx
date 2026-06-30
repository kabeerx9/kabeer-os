import { Stack, router } from "expo-router";
import { Pressable, Text, View, StyleSheet } from "react-native";

import { Container } from "@/components/container";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";
import { appRoutes } from "@/navigation/routes";

export default function NotFoundScreen() {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <Container>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>🤔</Text>
            <Text style={[styles.title, { color: theme.text }]}>Page Not Found</Text>
            <Text style={[styles.message, { color: theme.text }]}>
              Sorry, the page you're looking for doesn't exist.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={[styles.button, { borderColor: theme.border }]}
              onPress={() => router.replace(appRoutes.home)}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Go to Home</Text>
            </Pressable>
          </View>
        </View>
      </Container>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  content: {
    alignItems: "center",
    gap: 12,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
