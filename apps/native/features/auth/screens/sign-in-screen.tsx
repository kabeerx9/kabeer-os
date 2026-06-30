import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AppText,
  BrandWordmark,
  Button,
  colors,
  radius,
  spacing,
} from "@/design-system";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { pushDecoratedUrl } from "@/features/auth/utils/navigation";
import { appRoutes } from "@/navigation/routes";

export function SignInScreen() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const isFetching = fetchStatus === "fetching";
  const canSubmit = Boolean(emailAddress && password) && !isFetching;
  const emailCodeFactor = signIn.supportedSecondFactors.find(
    (factor) => factor.strategy === "email_code",
  );
  const requiresEmailCode =
    signIn.status === "needs_client_trust" ||
    (signIn.status === "needs_second_factor" && !!emailCodeFactor);

  const handleSubmit = async () => {
    setStatusMessage(null);

    const { error } = await signIn.password({
      emailAddress,
      password,
    });

    if (error) {
      console.error(JSON.stringify(error, null, 2));
      setStatusMessage(error.longMessage ?? "Unable to sign in. Please try again.");
      return;
    }

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session.currentTask);
            return;
          }

          pushDecoratedUrl(router, decorateUrl, appRoutes.home);
        },
      });
    } else if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
      if (emailCodeFactor) {
        await signIn.mfa.sendEmailCode();
        setStatusMessage(`We sent a verification code to ${emailCodeFactor.safeIdentifier}.`);
      } else {
        console.error("Second factor is required, but email_code is not available:", signIn);
        setStatusMessage(
          "A second factor is required, but this screen only supports email codes right now.",
        );
      }
    } else {
      console.error("Sign-in attempt not complete:", signIn);
      setStatusMessage("Sign-in could not be completed. Check the logs for more details.");
    }
  };

  const handleVerify = async () => {
    setStatusMessage(null);

    await signIn.mfa.verifyEmailCode({ code });

    if (signIn.status === "complete") {
      await signIn.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session.currentTask);
            return;
          }

          pushDecoratedUrl(router, decorateUrl, appRoutes.home);
        },
      });
    } else {
      console.error("Sign-in attempt not complete:", signIn);
      setStatusMessage("That code did not complete sign-in. Please try again.");
    }
  };

  if (requiresEmailCode) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.verifyContainer}>
          <BrandWordmark size="md" style={styles.verifyLogo} />
          <View style={styles.header}>
            <AppText variant="subhead" align="center">
              Verify your account
            </AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">
              Enter the email code to continue your journey.
            </AppText>
          </View>
          {statusMessage ? <AppText style={styles.statusMessage}>{statusMessage}</AppText> : null}
          <TextInput
            style={styles.input}
            value={code}
            placeholder="Enter your verification code"
            placeholderTextColor={colors.text.muted}
            onChangeText={(value) => setCode(value)}
            keyboardType="numeric"
          />
          {errors.fields.code ? (
            <AppText variant="caption" style={styles.error}>
              {errors.fields.code.message}
            </AppText>
          ) : null}
          <Button
            disabled={isFetching}
            onPress={() => void handleVerify()}
            variant="primary"
            size="lg"
            style={styles.fullWidthButton}
          >
            {isFetching ? "Verifying..." : "Verify"}
          </Button>
          <Pressable
            style={({ pressed }) => [styles.resendButton, pressed && styles.pressed]}
            onPress={() => signIn.mfa.sendEmailCode()}
          >
            <AppText variant="bodySmall" weight="semibold" tone="brand">
              I need a new code
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <BrandWordmark size="lg" style={styles.logo} />
          <View style={styles.header}>
            <AppText variant="subhead" align="center">
              Welcome back
            </AppText>
            <AppText variant="bodySmall" tone="secondary" align="center">
              Sign in to continue your journey
            </AppText>
          </View>

          {statusMessage ? <AppText style={styles.statusMessage}>{statusMessage}</AppText> : null}

          <View style={styles.fieldGroup}>
            <AppText variant="caption" weight="semibold">
              Email
            </AppText>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoComplete="email"
              value={emailAddress}
              placeholder="Enter your email"
              placeholderTextColor={colors.text.muted}
              onChangeText={(value) => setEmailAddress(value)}
              keyboardType="email-address"
            />
            {errors.fields.identifier ? (
              <AppText variant="caption" style={styles.error}>
                {errors.fields.identifier.message}
              </AppText>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <AppText variant="caption" weight="semibold">
              Password
            </AppText>
            <TextInput
              style={styles.input}
              value={password}
              placeholder="Enter your password"
              placeholderTextColor={colors.text.muted}
              secureTextEntry={true}
              onChangeText={(value) => setPassword(value)}
              autoComplete="password"
            />
            {errors.fields.password ? (
              <AppText variant="caption" style={styles.error}>
                {errors.fields.password.message}
              </AppText>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]}
            onPress={() => setStatusMessage("Password reset is not configured yet.")}
          >
            <AppText variant="caption" weight="semibold" style={styles.forgotText}>
              Forgot password?
            </AppText>
          </Pressable>

          <Button
            disabled={!canSubmit}
            onPress={() => void handleSubmit()}
            variant="primary"
            size="lg"
            style={styles.fullWidthButton}
          >
            {isFetching ? "Signing in..." : "Sign In"}
          </Button>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <AppText variant="caption" tone="muted" weight="semibold">
              OR
            </AppText>
            <View style={styles.dividerLine} />
          </View>

          <GoogleSignInButton />
          <Pressable
            style={({ pressed }) => [styles.appleButton, pressed && styles.pressed]}
            onPress={() => setStatusMessage("Apple sign-in is not configured yet.")}
          >
            <AppText variant="bodySmall" tone="inverse" weight="semibold">
              Continue with Apple
            </AppText>
          </Pressable>

          <View style={styles.toggleRow}>
            <AppText variant="caption" tone="secondary">
              Don't have an account?
            </AppText>
            <Link href={appRoutes.auth.signUp}>
              <AppText variant="caption" weight="semibold" style={styles.toggleLink}>
                Sign Up
              </AppText>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface.card,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: spacing.md,
  },
  logo: {
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  verifyLogo: {
    alignSelf: "center",
    marginBottom: spacing.xl,
  },
  verifyContainer: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: 24,
    backgroundColor: colors.surface.card,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  input: {
    minHeight: 46,
    borderWidth: 0.5,
    borderColor: colors.border.subtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: "#F9FAFB",
  },
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: spacing.xs,
  },
  forgotText: {
    color: colors.brand.lavender,
  },
  fullWidthButton: {
    width: "100%",
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  appleButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surface.inverse,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  toggleLink: {
    color: colors.brand.mint,
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
  error: {
    color: colors.status.error,
  },
  statusMessage: {
    color: colors.text.secondary,
    textAlign: "center",
  },
});
