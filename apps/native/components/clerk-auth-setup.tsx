import { useAuth } from "@clerk/expo";
import { useLayoutEffect } from "react";

import { setClerkAuthTokenGetter } from "@/utils/clerk-auth";

export function ClerkAuthSetup({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useLayoutEffect(() => {
    setClerkAuthTokenGetter(() => getToken());
    return () => setClerkAuthTokenGetter(null);
  }, [getToken]);

  return children;
}
