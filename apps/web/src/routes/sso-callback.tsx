import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sso-callback")({
  component: SSOCallbackPage,
});

function SSOCallbackPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Auth disabled</h1>
      <Link to="/dashboard" className="font-medium">
        Open dashboard
      </Link>
    </div>
  );
}
