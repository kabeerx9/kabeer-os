import { useMutation, useQueryClient } from "@tanstack/react-query";

import { exampleProjectsApi } from "./api";
import { exampleProjectKeys } from "./keys";

export function useCreateExampleProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exampleProjectsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exampleProjectKeys.list() });
    },
  });
}

export function useUpdateExampleProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exampleProjectsApi.update,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exampleProjectKeys.list() });
    },
  });
}

export function useDeleteExampleProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exampleProjectsApi.delete,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: exampleProjectKeys.list() });
    },
  });
}
