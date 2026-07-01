import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col justify-center gap-6 p-6">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Local personal operator</p>
        <h1 className="text-4xl font-semibold">Kabeer OS</h1>
        <p className="max-w-2xl text-muted-foreground">
          Start small: a morning brief that turns GitHub signals into recommended work
          and approved Codex tasks.
        </p>
      </div>
      <div>
        <Link
          to="/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
        >
          Open dashboard
        </Link>
      </div>
    </div>
  );
}
