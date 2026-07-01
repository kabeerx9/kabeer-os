import { Button } from "@app-starter/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@app-starter/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">30-Second Morning</p>
          <h1 className="text-2xl font-semibold">Good morning, Kabeer</h1>
        </div>
        <Button disabled>Sync GitHub</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">GitHub</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">3</p>
            <p className="text-sm text-muted-foreground">mock work items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">2</p>
            <p className="text-sm text-muted-foreground">next actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Codex</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">0</p>
            <p className="text-sm text-muted-foreground">active tasks</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Important work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border p-4">
            <p className="font-medium">Failed workflow on private-contest</p>
            <p className="text-sm text-muted-foreground">
              Mock data for the first dashboard shell.
            </p>
          </div>
          <div className="rounded-md border p-4">
            <p className="font-medium">PR review requested</p>
            <p className="text-sm text-muted-foreground">
              This will come from GitHub after the mock route is wired.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
