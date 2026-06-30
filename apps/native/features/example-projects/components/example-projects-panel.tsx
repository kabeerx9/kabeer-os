import type { ExampleProject } from "@app-starter/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useCreateExampleProjectMutation,
  useDeleteExampleProjectMutation,
  useUpdateExampleProjectMutation,
} from "@/features/example-projects/mutations";
import { exampleProjectQueries } from "@/features/example-projects/queries";
import { ApiError } from "@/lib/api";

type FormState = {
  name: string;
  description: string;
};

const emptyForm: FormState = { name: "", description: "" };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function ExampleProjectsPanel() {
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [actionError, setActionError] = useState<string | null>(null);

  const projectsQuery = useQuery(exampleProjectQueries.list(true));
  const createMutation = useCreateExampleProjectMutation();
  const updateMutation = useUpdateExampleProjectMutation();
  const deleteMutation = useDeleteExampleProjectMutation();

  const projects = projectsQuery.data ?? [];
  const mutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  async function handleCreate() {
    setActionError(null);

    try {
      await createMutation.mutateAsync({
        name: createForm.name,
        description: createForm.description || undefined,
      });
      setCreateForm(emptyForm);
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to create project"));
    }
  }

  function startEdit(project: ExampleProject) {
    setEditingId(project.id);
    setEditForm({
      name: project.name,
      description: project.description ?? "",
    });
    setActionError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function handleUpdate() {
    if (!editingId) {
      return;
    }

    setActionError(null);

    try {
      await updateMutation.mutateAsync({
        id: editingId,
        data: {
          name: editForm.name,
          description: editForm.description,
        },
      });
      cancelEdit();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to update project"));
    }
  }

  function confirmDelete(project: ExampleProject) {
    Alert.alert(
      "Delete project",
      `Delete "${project.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void handleDelete(project);
          },
        },
      ],
    );
  }

  async function handleDelete(project: ExampleProject) {
    setActionError(null);

    try {
      await deleteMutation.mutateAsync(project.id);
      if (editingId === project.id) {
        cancelEdit();
      }
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, "Failed to delete project"));
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Example projects</Text>
      <Text style={styles.subheading}>
        Reference CRUD flow. Remove this panel when you add your product domain.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create project</Text>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={createForm.name}
          onChangeText={(name) => setCreateForm((current) => ({ ...current, name }))}
          editable={!mutating}
          accessibilityLabel="Project name"
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          value={createForm.description}
          onChangeText={(description) => setCreateForm((current) => ({ ...current, description }))}
          editable={!mutating}
          accessibilityLabel="Project description"
        />
        <Pressable
          style={[styles.button, mutating && styles.buttonDisabled]}
          disabled={mutating}
          onPress={() => void handleCreate()}
        >
          <Text style={styles.buttonText}>{mutating ? "Saving..." : "Create project"}</Text>
        </Pressable>
      </View>

      {projectsQuery.isLoading ? (
        <View style={styles.centeredRow}>
          <ActivityIndicator />
          <Text style={styles.mutedText}>Loading projects...</Text>
        </View>
      ) : projectsQuery.error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>
            {getErrorMessage(projectsQuery.error, "Failed to load example projects")}
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => void projectsQuery.refetch()}
          >
            <Text style={styles.secondaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.mutedText}>
            No example projects yet. Create one above to try the authenticated CRUD flow.
          </Text>
        </View>
      ) : (
        projects.map((project) => (
          <View key={project.id} style={styles.card}>
            {editingId === project.id ? (
              <>
                <Text style={styles.cardTitle}>Edit project</Text>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.name}
                  onChangeText={(name) => setEditForm((current) => ({ ...current, name }))}
                  editable={!mutating}
                  accessibilityLabel="Edit project name"
                />
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.description}
                  onChangeText={(description) =>
                    setEditForm((current) => ({ ...current, description }))
                  }
                  editable={!mutating}
                  accessibilityLabel="Edit project description"
                />
                <View style={styles.row}>
                  <Pressable
                    style={[styles.button, mutating && styles.buttonDisabled]}
                    disabled={mutating}
                    onPress={() => void handleUpdate()}
                  >
                    <Text style={styles.buttonText}>{mutating ? "Saving..." : "Save changes"}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryButton, mutating && styles.buttonDisabled]}
                    disabled={mutating}
                    onPress={cancelEdit}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>{project.name}</Text>
                <Text style={styles.mutedText}>{project.description ?? "No description"}</Text>
                <View style={styles.row}>
                  <Pressable
                    style={[styles.secondaryButton, mutating && styles.buttonDisabled]}
                    disabled={mutating}
                    onPress={() => startEdit(project)}
                  >
                    <Text style={styles.secondaryButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.destructiveButton, mutating && styles.buttonDisabled]}
                    disabled={mutating}
                    onPress={() => confirmDelete(project)}
                  >
                    <Text style={styles.destructiveButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ))
      )}

      {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
  },
  subheading: {
    fontSize: 14,
    opacity: 0.7,
  },
  card: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "600",
  },
  destructiveButton: {
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  destructiveButtonText: {
    color: "#dc2626",
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  centeredRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  mutedText: {
    opacity: 0.7,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
  },
});
