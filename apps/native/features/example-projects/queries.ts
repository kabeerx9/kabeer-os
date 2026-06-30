import { queryOptions } from "@tanstack/react-query";

import { exampleProjectsApi } from "./api";
import { exampleProjectKeys } from "./keys";

export const exampleProjectQueries = {
  list: (enabled: boolean) =>
    queryOptions({
      queryKey: exampleProjectKeys.list(),
      queryFn: exampleProjectsApi.list,
      enabled,
      staleTime: 30_000,
    }),
};
