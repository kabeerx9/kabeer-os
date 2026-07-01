import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/account")({
  component: AccountPage,
});

function AccountPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-muted-foreground">
          Auth is intentionally disabled for the local v0.
        </p>
      </div>
    </div>
  );
}
