export const exampleProjectKeys = {
  all: ["example-projects"] as const,
  list: () => [...exampleProjectKeys.all, "list"] as const,
};
