import { env } from "@app-starter/env/native";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ClerkAuthSetup } from "@/components/clerk-auth-setup";
import { OnboardingProvider } from "@/features/onboarding/providers/onboarding-provider";
import { useResetSessionOnAuthChange } from "@/hooks/useResetSessionOnAuthChange";
import { NAV_THEME } from "@/lib/constants";
import { queryClient } from "@/lib/queryClient";
import { useColorScheme } from "@/lib/use-color-scheme";

const LIGHT_THEME = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};

const DARK_THEME = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

function SessionResetBoundary({ children }: { children: ReactNode }) {
  useResetSessionOnAuthChange();
  return children;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const { isDarkColorScheme } = useColorScheme();

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ClerkAuthSetup>
        <QueryClientProvider client={queryClient}>
          <SessionResetBoundary>
            <OnboardingProvider>
              <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
                <StatusBar style={isDarkColorScheme ? "light" : "dark"} />
                <GestureHandlerRootView style={styles.container}>{children}</GestureHandlerRootView>
              </ThemeProvider>
            </OnboardingProvider>
          </SessionResetBoundary>
        </QueryClientProvider>
      </ClerkAuthSetup>
    </ClerkProvider>
  );
}
