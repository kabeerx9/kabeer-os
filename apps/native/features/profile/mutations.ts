import { useMutation, useQueryClient } from "@tanstack/react-query";

import { profileApi } from "./api";

export function useUpdateAccountMutation() {
  return useMutation({
    mutationFn: profileApi.updateAccount,
  });
}

export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: profileApi.deleteAccount,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
