import { useClerk, useUser } from "@clerk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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

import { ApiError, deleteAccount, updateAccount } from "@/lib/api";

export const Route = createFileRoute("/_auth/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
  }, [user]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateAccount({ firstName, lastName });
      await user?.reload();
      setSaveSuccess(true);
    } catch (err: unknown) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to update account");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount({ confirmation: "DELETE" });
      await signOut();
      navigate({ to: "/" });
    } catch (err: unknown) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  }

  const canDelete = deleteConfirmation === "DELETE";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-muted-foreground">Update your profile or delete your account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Changes are saved through the server and synced to Clerk.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
              />
            </div>
            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
            {saveSuccess ? <p className="text-sm text-green-600">Profile updated.</p> : null}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Delete account</CardTitle>
          <CardDescription>
            This permanently deletes your Clerk identity and local account data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deleteConfirmation">Type DELETE to confirm</Label>
            <Input
              id="deleteConfirmation"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder="DELETE"
            />
          </div>
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={!canDelete || deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? "Deleting..." : "Delete account"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
