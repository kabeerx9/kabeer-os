import { useAuth } from "@clerk/expo";

import { useOnboarding } from "@/features/onboarding/providers/onboarding-provider";

export type AppAccessState =
  | "auth_loading"
  | "guest"
  | "onboarding_loading"
  | "onboarding_required"
  | "ready";

export type AppAccessInput = {
  isLoaded: boolean;
  isSignedIn: boolean;
  isOnboardingLoading: boolean;
  isOnboardingComplete: boolean;
};

export function deriveAppAccessState(input: AppAccessInput): AppAccessState {
  if (!input.isLoaded) {
    return "auth_loading";
  }

  if (!input.isSignedIn) {
    return "guest";
  }

  if (input.isOnboardingLoading) {
    return "onboarding_loading";
  }

  return input.isOnboardingComplete ? "ready" : "onboarding_required";
}

export function useAppAccess() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isOnboardingComplete, isOnboardingLoading } = useOnboarding();
  const signedIn = isSignedIn === true;
  const accessState = deriveAppAccessState({
    isLoaded,
    isSignedIn: signedIn,
    isOnboardingLoading,
    isOnboardingComplete,
  });

  return {
    accessState,
    canAccessAppShell: accessState === "ready",
    canAccessMainApp: accessState === "ready",
    canAccessAuth: accessState === "guest",
    canAccessOnboarding: accessState === "onboarding_required",
  };
}
