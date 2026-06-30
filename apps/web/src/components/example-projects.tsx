import { useCallback, useEffect, useState } from "react";

import { Button } from "@app-starter/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@app-starter/ui/components/card";
import { Input } from "@app-starter/ui/components/input";
import { Label } from "@app-starter/ui/components/label";
import type { ExampleProject } from "@app-starter/contracts";

import {
  ApiError,
  createExampleProject,
  deleteExampleProject,
  listExampleProjects,
  updateExampleProject,
} from "@/lib/api";

type FormState = {
  name: string;
  description: string;
};

const emptyForm: FormState = { name: "", description: "" };

export function ExampleProjectsPanel() {
  const [projects, setProjects] = useState<ExampleProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [mutating, setMutating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const items = await listExampleProjects();
      setProjects(items);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Failed to load example projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMutating(true);
    setActionError(null);

    try {
      const created = await createExampleProject({
        name: createForm.name,
        description: createForm.description || undefined,
      });
      setProjects((current) => [created, ...current]);
      setCreateForm(emptyForm);
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setMutating(false);
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

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) {
      return;
    }

    setMutating(true);
    setActionError(null);

    try {
      const updated = await updateExampleProject(editingId, {
        name: editForm.name,
        description: editForm.description,
      });
      setProjects((current) =>
        current.map((project) => (project.id === updated.id ? updated : project)),
      );
      cancelEdit();
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update project");
    } finally {
      setMutating(false);
    }
  }

  async function handleDelete(project: ExampleProject) {
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      return;
    }

    setMutating(true);
    setActionError(null);

    try {
      await deleteExampleProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      if (editingId === project.id) {
        cancelEdit();
      }
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : "Failed to delete project");
    } finally {
      setMutating(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Example projects</h2>
        <p className="text-sm text-muted-foreground">
          Reference CRUD flow. Remove this panel when you add your product domain.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create project</CardTitle>
          <CardDescription>Add a name and optional description.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleCreate}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, name: event.target.value }))
                }
                required
                disabled={mutating}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-description">Description</Label>
              <Input
                id="create-description"
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, description: event.target.value }))
                }
                disabled={mutating}
              />
            </div>
            <Button type="submit" disabled={mutating}>
              {mutating ? "Saving..." : "Create project"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading projects...</p>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button className="mt-3" variant="outline" onClick={() => void loadProjects()}>
            Retry
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          No example projects yet. Create one above to try the authenticated CRUD flow.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {projects.map((project) => (
            <li key={project.id}>
              <Card>
                {editingId === project.id ? (
                  <>
                    <CardHeader>
                      <CardTitle>Edit project</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form className="flex flex-col gap-4" onSubmit={handleUpdate}>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`edit-name-${project.id}`}>Name</Label>
                          <Input
                            id={`edit-name-${project.id}`}
                            value={editForm.name}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, name: event.target.value }))
                            }
                            required
                            disabled={mutating}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`edit-description-${project.id}`}>Description</Label>
                          <Input
                            id={`edit-description-${project.id}`}
                            value={editForm.description}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            disabled={mutating}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={mutating}>
                            {mutating ? "Saving..." : "Save changes"}
                          </Button>
                          <Button type="button" variant="outline" disabled={mutating} onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </>
                ) : (
                  <>
                    <CardHeader>
                      <CardTitle>{project.name}</CardTitle>
                      <CardDescription>
                        {project.description ?? "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={mutating}
                        onClick={() => startEdit(project)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={mutating}
                        onClick={() => void handleDelete(project)}
                      >
                        Delete
                      </Button>
                    </CardFooter>
                  </>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
    </section>
  );
}
