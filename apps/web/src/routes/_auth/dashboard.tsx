import { UserButton, useUser } from "@clerk/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ApiError, getMe, type MeResponse } from "@/lib/api";
import { ExampleProjectsPanel } from "@/components/example-projects";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useUser();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Failed to load account");
      });
  }, []);

  const name =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "there";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">App Starter</h1>
        <UserButton />
      </div>
      <p className="text-muted-foreground">Welcome, {name}</p>
      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Signed-in account</p>
        <p className="mt-1 font-medium">{me?.email ?? "Loading..."}</p>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>
      <ExampleProjectsPanel />
    </div>
  );
}
