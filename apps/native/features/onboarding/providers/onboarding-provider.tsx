import { useAuth } from "@clerk/expo";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  getOnboardingComplete,
  setOnboardingComplete,
} from "@/features/onboarding/storage/onboarding-storage";

type OnboardingContextValue = {
  isOnboardingLoading: boolean;
  isOnboardingComplete: boolean;
  completeOnboarding: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOnboarding() {
      if (!isLoaded || !userId) {
        setIsOnboardingLoading(false);
        setIsOnboardingComplete(false);
        return;
      }

      setIsOnboardingLoading(true);

      try {
        const complete = await getOnboardingComplete(userId);
        if (!cancelled) {
          setIsOnboardingComplete(complete);
        }
      } finally {
        if (!cancelled) {
          setIsOnboardingLoading(false);
        }
      }
    }

    void loadOnboarding();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      isOnboardingLoading,
      isOnboardingComplete,
      completeOnboarding: async () => {
        if (!userId) {
          return;
        }

        await setOnboardingComplete(userId);
        setIsOnboardingComplete(true);
      },
    }),
    [isOnboardingComplete, isOnboardingLoading, userId],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }

  return context;
}
