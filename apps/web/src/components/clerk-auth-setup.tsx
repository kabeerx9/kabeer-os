import { useAuth } from "@clerk/react";
import { useEffect } from "react";

import { setClerkAuthTokenGetter } from "@/utils/clerk-auth";

export function ClerkAuthSetup({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    setClerkAuthTokenGetter(() => getToken());
    return () => setClerkAuthTokenGetter(null);
  }, [getToken]);

  return children;
}
