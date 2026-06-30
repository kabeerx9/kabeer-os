import { useClerk, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
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

import {
  useDeleteAccountMutation,
  useUpdateAccountMutation,
} from "@/features/profile/mutations";
import { ApiError } from "@/lib/api";
import { appRoutes } from "@/navigation/routes";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function AccountScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const updateAccountMutation = useUpdateAccountMutation();
  const deleteAccountMutation = useDeleteAccountMutation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
  }, [user]);

  async function handleSave() {
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateAccountMutation.mutateAsync({ firstName, lastName });
      await user?.reload();
      setSaveSuccess(true);
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, "Failed to update account"));
    }
  }

  async function performDelete() {
    setDeleteError(null);

    try {
      await deleteAccountMutation.mutateAsync({ confirmation: "DELETE" });
      await signOut();
      router.replace(appRoutes.auth.signIn);
    } catch (err: unknown) {
      setDeleteError(getErrorMessage(err, "Failed to delete account"));
    }
  }

  function handleDeletePress() {
    Alert.alert(
      "Delete account",
      "This permanently deletes your Clerk identity and local account data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void performDelete(),
        },
      ],
    );
  }

  const canDelete = deleteConfirmation === "DELETE";
  const saving = updateAccountMutation.isPending;
  const deleting = deleteAccountMutation.isPending;

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
            <Text style={styles.eyebrow}>Settings</Text>
            <Text style={styles.title}>Account</Text>
            <Text style={styles.subtitle}>Update your profile or delete your account.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Text style={styles.sectionDescription}>
              Changes are saved through the server and synced to Clerk.
            </Text>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
            {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
            {saveSuccess ? <Text style={styles.successText}>Profile updated.</Text> : null}
            <Pressable
              style={[styles.button, saving && styles.buttonDisabled]}
              disabled={saving}
              onPress={() => void handleSave()}
            >
              <Text style={styles.buttonText}>{saving ? "Saving..." : "Save changes"}</Text>
            </Pressable>
          </View>

          <View style={[styles.card, styles.dangerCard]}>
            <Text style={styles.dangerTitle}>Delete account</Text>
            <Text style={styles.sectionDescription}>
              This permanently deletes your Clerk identity and local account data.
            </Text>
            <Text style={styles.label}>Type DELETE to confirm</Text>
            <TextInput
              style={styles.input}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder="DELETE"
              autoCapitalize="characters"
            />
            {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}
            <Pressable
              style={[styles.dangerButton, (!canDelete || deleting) && styles.buttonDisabled]}
              disabled={!canDelete || deleting}
              onPress={handleDeletePress}
            >
              <Text style={styles.dangerButtonText}>
                {deleting ? "Deleting..." : "Delete account"}
              </Text>
            </Pressable>
          </View>
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
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  eyebrow: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  card: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    backgroundColor: "#fff",
  },
  dangerCard: {
    borderColor: "#dc2626",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 8,
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerButton: {
    marginTop: 8,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  dangerButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#dc2626",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
  },
  successText: {
    color: "#15803d",
    fontSize: 14,
  },
});
