import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useOnboarding } from "@/features/onboarding/providers/onboarding-provider";
import { appRoutes } from "@/navigation/routes";

export function OnboardingScreen() {
  const { completeOnboarding } = useOnboarding();
  const router = useRouter();

  async function handleContinue() {
    await completeOnboarding();
    router.replace(appRoutes.home);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>First run</Text>
        <Text style={styles.title}>Welcome to App Starter</Text>
        <Text style={styles.subtitle}>
          Finish the light setup step and jump into the authenticated workspace.
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => void handleContinue()}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 24,
    backgroundColor: "#fff",
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4b5563",
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
