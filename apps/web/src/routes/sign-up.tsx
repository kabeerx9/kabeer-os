import { SignUp, useAuth } from "@clerk/react";
import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="flex min-h-[60vh] items-center justify-center">Loading...</div>;
  }

  if (isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">App Starter</h1>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
