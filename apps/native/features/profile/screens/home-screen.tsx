import { useUser } from "@clerk/expo";
import { Link } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { SignOutButton } from "@/components/sign-out-button";
import {
  AppText,
  BrandWordmark,
  Pill,
  Screen,
  Surface,
  colors,
  spacing,
} from "@/design-system";
import { ExampleProjectsPanel } from "@/features/example-projects/components/example-projects-panel";
import { appRoutes } from "@/navigation/routes";

export function HomeScreen() {
  const { user } = useUser();

  const name = user?.fullName || user?.firstName || "there";
  const email = user?.primaryEmailAddress?.emailAddress ?? "No email available";

  return (
    <Screen padded={false} background={colors.surface.app}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <BrandWordmark size="md" />
            <Pill tone="mint" leadingDot>
              Workspace
            </Pill>
            <View style={styles.titleGroup}>
              <AppText variant="heading">App Starter</AppText>
              <AppText variant="body" tone="secondary">
                Welcome, {name}
              </AppText>
            </View>
          </View>
          <SignOutButton />
        </View>

        <Surface tone="card" elevated padding="lg" radiusSize="lg" style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <View style={styles.avatar}>
              <AppText variant="subhead" weight="bold" tone="brand">
                {name.slice(0, 1).toUpperCase()}
              </AppText>
            </View>
            <View style={styles.accountCopy}>
              <AppText variant="caption" tone="tertiary" weight="semibold">
                Signed-in account
              </AppText>
              <AppText variant="subhead" numberOfLines={1}>
                {email}
              </AppText>
            </View>
          </View>
        </Surface>

        <ExampleProjectsPanel />

        <Link href={appRoutes.account} style={styles.accountLink}>
          <AppText variant="bodySmall" weight="semibold" tone="brand">
            Account
          </AppText>
        </Link>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.page,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.md,
  },
  titleGroup: {
    gap: spacing.xs,
  },
  accountCard: {
    width: "100%",
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.brand.lavenderLight,
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  accountLink: {
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
  },
});
