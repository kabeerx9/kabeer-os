import { useAuth, useSignUp } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { pushDecoratedUrl } from "@/features/auth/utils/navigation";
import { appRoutes } from "@/navigation/routes";

export function SignUpScreen() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    setStatusMessage(null);

    const { error } = await signUp.password({
      emailAddress,
      password,
    });

    if (error) {
      console.error(JSON.stringify(error, null, 2));
      setStatusMessage(error.longMessage ?? "Unable to sign up. Please try again.");
      return;
    }

    await signUp.verifications.sendEmailCode();
    setStatusMessage(`We sent a verification code to ${emailAddress}.`);
  };

  const handleVerify = async () => {
    setStatusMessage(null);

    await signUp.verifications.verifyEmailCode({
      code,
    });

    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session.currentTask);
            return;
          }

          pushDecoratedUrl(router, decorateUrl, appRoutes.home);
        },
      });
    } else {
      console.error("Sign-up attempt not complete:", signUp);
      setStatusMessage("That code did not complete sign-up. Please try again.");
    }
  };

  if (signUp.status === "complete" || isSignedIn) {
    return null;
  }

  if (
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centered]}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Verification</Text>
            <Text style={styles.title}>Verify your account</Text>
          </View>
          {statusMessage && <Text style={styles.helper}>{statusMessage}</Text>}
          <TextInput
            style={styles.input}
            value={code}
            placeholder="Enter your verification code"
            placeholderTextColor="#666666"
            onChangeText={(value) => setCode(value)}
            keyboardType="numeric"
          />
          {errors.fields.code && <Text style={styles.error}>{errors.fields.code.message}</Text>}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              fetchStatus === "fetching" && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleVerify}
            disabled={fetchStatus === "fetching"}
          >
            <Text style={styles.buttonText}>Verify</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={() => signUp.verifications.sendEmailCode()}
          >
            <Text style={styles.secondaryButtonText}>I need a new code</Text>
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
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Create account</Text>
            <Text style={styles.title}>Sign up</Text>
            <Text style={styles.helper}>Start with email and password or continue with Google.</Text>
          </View>
          {statusMessage && <Text style={styles.helper}>{statusMessage}</Text>}
          <GoogleSignInButton />
          <Text style={styles.divider}>or</Text>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Enter email"
            placeholderTextColor="#666666"
            onChangeText={(value) => setEmailAddress(value)}
            keyboardType="email-address"
          />
          {errors.fields.emailAddress && (
            <Text style={styles.error}>{errors.fields.emailAddress.message}</Text>
          )}
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            placeholder="Enter password"
            placeholderTextColor="#666666"
            secureTextEntry={true}
            onChangeText={(value) => setPassword(value)}
          />
          {errors.fields.password && <Text style={styles.error}>{errors.fields.password.message}</Text>}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              (!emailAddress || !password || fetchStatus === "fetching") && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSubmit}
            disabled={!emailAddress || !password || fetchStatus === "fetching"}
          >
            <Text style={styles.buttonText}>Sign up</Text>
          </Pressable>
          <View style={styles.linkContainer}>
            <Text style={styles.linkPrompt}>Already have an account? </Text>
            <Link href={appRoutes.auth.signIn}>
              <Text style={styles.linkText}>Sign in</Text>
            </Link>
          </View>
          <View nativeID="clerk-captcha" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardAvoiding: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  centered: {
    flex: 1,
  },
  header: {
    gap: 6,
    marginBottom: 4,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
  label: {
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 13,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: {
    color: "#111827",
    fontWeight: "600",
  },
  linkContainer: {
    flexDirection: "row",
    gap: 4,
    marginTop: 12,
    alignItems: "center",
  },
  linkText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  linkPrompt: {
    color: "#4b5563",
  },
  error: {
    color: "#d32f2f",
    fontSize: 12,
    marginTop: -8,
  },
  helper: {
    color: "#4b5563",
    fontSize: 13,
    lineHeight: 19,
  },
  divider: {
    textAlign: "center",
    opacity: 0.5,
    marginVertical: 4,
  },
});
