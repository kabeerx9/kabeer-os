import { useAuth } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function useResetSessionOnAuthChange() {
  const { isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      queryClient.clear();
    }

    previousUserId.current = userId;
  }, [isLoaded, queryClient, userId]);
}
