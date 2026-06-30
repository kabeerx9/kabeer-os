import { AuthenticateWithRedirectCallback } from "@clerk/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sso-callback")({
  component: SSOCallbackPage,
});

function SSOCallbackPage() {
  return (
    <>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      />
      <div id="clerk-captcha" />
    </>
  );
}
