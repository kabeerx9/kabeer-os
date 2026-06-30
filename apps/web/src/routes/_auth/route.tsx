import { useAuth } from "@clerk/react";
import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="flex min-h-[60vh] items-center justify-center">Loading...</div>;
  }

  if (!isSignedIn) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
}
